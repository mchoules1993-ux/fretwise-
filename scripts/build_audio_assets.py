"""Build the compact CC0 instrument banks used by Fretwise.
Requires Python 3, numpy/scipy, and ffmpeg. Source WAV/FLAC files stay in a cache.
"""
import argparse,base64,concurrent.futures,hashlib,json,re,subprocess,urllib.request
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'dist/assets/audio/studio'
NOTES={'c':0,'db':1,'d':2,'eb':3,'e':4,'f':5,'gb':6,'g':7,'ab':8,'a':9,'bb':10,'b':11}
def midi(note):
 m=re.fullmatch(r'([a-g]b?)(\d)',note);return NOTES[m[1]]+12*(int(m[2])+1)
def fetch(url,path):
 if path.exists()and path.stat().st_size>1000:return
 path.parent.mkdir(parents=True,exist_ok=True)
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Fretwise CC0 sample preparation'}),timeout=35)as response:data=response.read()
   path.write_bytes(data);return
  except Exception:
   if attempt==2:raise

def selected():
 items=[]
 guitar=['e2','gb2','a2','c3','eb3','gb3','a3','c4','eb4','gb4','a4','c5','eb5','gb5','a5','c6']
 for note in guitar:
  for layer in [2,4]:
   for rr in [1,2]:
    path=f'Samples/electric/{note}_vl{layer}_rr{rr}_2.wav'
    items.append(dict(repo='karoryfer.shinyguitar',branch='master',path=path,bank='guitar',key=midi(note),velocity=55 if layer==2 else 110,rr=rr,articulation='sustain',seconds=6))
  items.append(dict(repo='karoryfer.shinyguitar',branch='master',path=f'Samples/electric/{note}_release_rr1_2.wav',bank='guitar',key=midi(note),velocity=90,rr=1,articulation='release',seconds=.35))
 for rr in [1,2]:
  items.append(dict(repo='karoryfer.shinyguitar',branch='master',path=f'Samples/electric/mute_strings1_rr{rr}_2.wav',bank='guitar',key=60,velocity=80,rr=rr,articulation='mute',seconds=.25))
 for note in ['b1','d2','f2','ab2','b2','d3','f3','ab3','b3']:
  for layer in ['mf','f']:
   for rr in [1,2]:
    items.append(dict(repo='karoryfer.black-and-blue-basses',branch='main',path=f'Samples/darkblack/reg/darkblack_{note}_{layer}_rr{rr}.wav',bank='bass',key=midi(note)-12,velocity=70 if layer=='mf'else 110,rr=rr,articulation='sustain',seconds=2.2))
 # Use overhead microphones for room/kit character; snare dynamics have many individual takes.
 drums={'kick':('kick/oh_kick_snoff_vl{vl}_rr{rr}.flac',[2,4],2.0),'hat':('hh/oh_hh_closed_vl{vl}_rr{rr}.flac',[2,4],.5),'openhat':('hh/oh_hh_half_vl{vl}_rr{rr}.flac',[2,4],1.8),'ride':('ride/oh_ride_ride_vl{vl}_rr{rr}.flac',[1,3],3.0),'crash':('crash/oh_crash_crash_vl{vl}_rr{rr}.flac',[1,3],4.0)}
 for name,(pattern,layers,duration)in drums.items():
  for layer in layers:
   for rr in [1,2]:
    items.append(dict(repo='virtuosity_drums',branch='master',path='Samples/oh/'+pattern.format(vl=layer,rr=rr),bank='drums',key=name,velocity=55 if layer==layers[0]else 110,rr=rr,articulation='hit',seconds=duration))
 for name,folder,duration in [('tom','htom',1.8),('lowtom','ltom',2.0)]:
  for layer in [7,13]:
   for rr in [1,2]:
    items.append(dict(repo='virtuosity_drums',branch='master',path=f'Samples/oh/{folder}/oh_{folder}_center_vl{layer+rr-1}.flac',bank='drums',key=name,velocity=55 if layer==7 else 110,rr=rr,articulation='hit',seconds=duration))
 for layer in [18,32]:
  for rr in [1,2]:
   items.append(dict(repo='virtuosity_drums',branch='master',path=f'Samples/oh/snare/oh_snare_center_vl{layer+rr-1}.flac',bank='drums',key='snare',velocity=55 if layer==18 else 110,rr=rr,articulation='hit',seconds=1.4))
 return items

def build(cache):
 DEST.mkdir(parents=True,exist_ok=True);items=selected()
 def download(item):
  file=cache/item['repo']/item['path'];url=f"https://raw.githubusercontent.com/sfzinstruments/{item['repo']}/{item['branch']}/{item['path']}";fetch(url,file);return item,file
 with concurrent.futures.ThreadPoolExecutor(max_workers=10)as pool:
  downloaded=list(pool.map(download,items))
 print(f'Downloaded {len(downloaded)} CC0 source samples',flush=True)
 banks={k:[]for k in ['guitar','bass','drums']};inventory=[]
 for item,file in downloaded:
  # 32 kHz mono is sufficient for the web subset; preserve the sample attack and dynamics.
  pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-t',str(item['seconds']),'-ar','32000','-ac','1','-f','f32le','-'])
  data=np.frombuffer(pcm,dtype='<f4').copy();peak=float(np.max(np.abs(data)))
  if peak==0:raise ValueError(f'Silent source {file}')
  n=min(640,len(data)//10);data[-n:]*=np.linspace(1,0,n)
  # Keep soft/hard variation; use common instrument gain, never per-note normalisation.
  gain={'guitar':.75,'bass':.85,'drums':.75}[item['bank']]
  data*=gain
  wav=cache/'processed'/f"{item['bank']}-{item['key']}-{item['velocity']}-{item['rr']}-{item['articulation']}.wav";wav.parent.mkdir(exist_ok=True)
  import wave
  with wave.open(str(wav),'wb')as w:w.setparams((1,2,32000,0,'NONE','not compressed'));w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
  mp3=wav.with_suffix('.mp3');subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','80k',str(mp3)],check=True)
  entry={k:item[k]for k in ['key','velocity','rr','articulation']};entry['data']=base64.b64encode(mp3.read_bytes()).decode();banks[item['bank']].append(entry)
  inventory.append({**{k:v for k,v in item.items()if k!='seconds'},'source_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'prepared':wav.name,'peak':round(peak,5),'frames':len(data)})
 for name,entries in banks.items():
  (DEST/(name+'.json')).write_text(json.dumps(entries,separators=(',',':')))
  print(name,len(entries),'samples',round((DEST/(name+'.json')).stat().st_size/1048576,2),'MB',flush=True)
 (DEST/'provenance.json').write_text(json.dumps(inventory,indent=2))
 # Retain upstream licenses alongside the derivative samples.
 for repo,branch in [('karoryfer.shinyguitar','master'),('karoryfer.black-and-blue-basses','main'),('virtuosity_drums','master')]:
  license_name='license'if repo=='karoryfer.black-and-blue-basses'else 'LICENSE';url=f'https://raw.githubusercontent.com/sfzinstruments/{repo}/{branch}/{license_name}';out=DEST/(repo+'-LICENSE.txt')
  try:fetch(url,out)
  except Exception as e:raise RuntimeError(f'Could not retain upstream license for {repo}')from e
 return inventory
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);a=p.parse_args();build(a.cache)
