"""Render four original backing arrangements from Fretwise's compact CC0 samples.
Each instrument is a separate, exactly aligned loop; tails wrap into the next cycle.
"""
import argparse,json,math,subprocess,wave
from pathlib import Path
from fractions import Fraction
import numpy as np
from scipy.signal import resample_poly,butter,sosfilt
ROOT=Path(__file__).resolve().parents[1];RATE=32000
TRACKS=[
 dict(id='slow-minor',name='After midnight',style='Slow minor blues',root=9,key='A minor',bpm=72,scale='aeolian',seq=[[0,'m7'],[5,'m7'],[0,'m7'],[0,'m7'],[8,'maj7'],[5,'m7'],[7,'7'],[0,'m7']],nums=['i7','iv7','i7','i7','♭VImaj7','iv7','V7','i7'],description='Spacious chord replies, melodic bass and a restrained acoustic kit.'),
 dict(id='texas-shuffle',name='Dusty road shuffle',style='Texas shuffle',root=9,key='A blues',bpm=86,scale='mixolydian',seq=[[0,'7'],[5,'7'],[0,'7'],[0,'7'],[5,'7'],[5,'7'],[0,'7'],[0,'7'],[7,'7'],[5,'7'],[0,'7'],[7,'7']],nums=['I7','IV7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','V7'],description='Long–short rhythm guitar, a walking bass line and shuffle drums.'),
 dict(id='blues-rock',name='Open road',style='Driving blues rock',root=4,key='E blues',bpm=104,scale='mixolydian',seq=[[0,'7'],[0,'7'],[0,'7'],[0,'7'],[5,'7'],[5,'7'],[0,'7'],[0,'7'],[7,'7'],[5,'7'],[0,'7'],[7,'7']],nums=['I7','I7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','V7'],description='Crunchy boogie guitar, picked-feel bass accents and a driving backbeat.'),
 dict(id='clean-funk',name='Pocket conversation',style='Clean funk',root=9,key='A Dorian',bpm=100,scale='dorian',seq=[[0,'m7'],[5,'7'],[0,'m7'],[5,'7'],[0,'m7'],[5,'7'],[0,'m7'],[5,'7']],nums=['i7','IV7','i7','IV7','i7','IV7','i7','IV7'],description='Muted guitar stabs, syncopated bass, hi-hat accents and ghost notes.')]
class Renderer:
 def __init__(self,cache,inventory,track):
  self.track=track;self.seconds=60/track['bpm'];self.frames=round(len(track['seq'])*4*self.seconds*RATE);self.stems={k:np.zeros((self.frames,2),np.float32)for k in ['guitar','bass','drums']};self.samples={};self.counter={};self.rng=np.random.default_rng(101+track['bpm'])
  for row in inventory:
   path=cache/'processed'/row['prepared']
   with wave.open(str(path),'rb')as w:data=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
   self.samples.setdefault((row['bank'],row['key'],row['articulation']),[]).append((row['velocity'],row['rr'],data))
 def choose(self,bank,key,velocity,art='sustain'):
  keys=[k for k in self.samples if k[0]==bank and k[2]==art];match=min(keys,key=lambda k:abs(k[1]-key))if isinstance(key,int)else next(k for k in keys if k[1]==key)
  layers=self.samples[match];vl=min(set(v[0]for v in layers),key=lambda v:abs(v-velocity));takes=[v for v in layers if v[0]==vl];n=self.counter.get((match,vl),0);self.counter[match,vl]=n+1;data=takes[n%len(takes)][2]
  if isinstance(key,int):
   ratio=2**((key-match[1])/12);fraction=Fraction(1/ratio).limit_denominator(400);data=resample_poly(data,fraction.numerator,fraction.denominator)
  return data.copy()
 def add(self,bank,key,beat,duration,velocity=90,volume=1,pan=0,muted=False,jitter=True):
  data=self.choose(bank,key,velocity,'hit'if bank=='drums'else 'sustain');life=min(len(data),round(duration*self.seconds*RATE))
  data=data[:life]
  if bank!='drums':
   attack=min(round(.004*RATE),life//4);release=min(round(.06*RATE),life//4);data[:attack]*=np.linspace(0,1,attack);data[-release:]*=np.linspace(1,0,release)
  if muted and bank=='guitar':data*=np.exp(-np.arange(len(data))/(RATE*.09))
  data*=volume*(velocity/110)**.4
  stereo=np.column_stack((data*math.sqrt((1-pan)/2),data*math.sqrt((1+pan)/2)))
  # Mild timing and velocity variations are fixed at build time and repeat consistently.
  shift=float(self.rng.normal(0,.0025))if jitter and beat>0 else 0
  index=round((beat*self.seconds+shift)*RATE)%self.frames
  # Circular overlap-add carries cymbal/chord tails across the loop boundary.
  pos=0
  while pos<len(data):
   take=min(self.frames-index,len(data)-pos);self.stems[bank][index:index+take]+=stereo[pos:pos+take];pos+=take;index=0
 def chord(self,root,q,beat,length,velocity=85,volume=.5,muted=False,reverse=False):
  base=45+(root-9)%12
  if base>53:base-=12
  intervals={'m7':[0,7,10,15],'7':[0,7,10,16],'maj7':[0,7,11,16]}[q]
  notes=[base+i for i in intervals]
  if reverse:notes.reverse()
  for i,m in enumerate(notes):self.add('guitar',m,beat+i*.018,length,velocity,volume,pan=-.25,muted=muted)
 def arrange(self):
  t=self.track
  for bar,(offset,q)in enumerate(t['seq']):
   beat=bar*4;root=(t['root']+offset)%12;low=24+root
   if t['id']=='slow-minor':
    self.chord(root,q,beat,2.7,78,.48);self.chord(root,q,beat+2.5,1.25,68,.32,reverse=True)
    for b,iv,length,v in [(0,0,1.7,85),(2,7,.7,76),(3,10 if q!='maj7'else 11,.45,65),(3.5,0,.4,70)]:self.add('bass',low+iv,beat+b,length,v,.65,pan=.05)
   elif t['id']in ['texas-shuffle','blues-rock']:
    shuffle=t['id']=='texas-shuffle'
    for step in range(8):
     b=step//2+(2/3 if step%2 and shuffle else .5 if step%2 else 0);base=40+(root-4)%12
     fifth=[7,7,9,7,10,7,9,7][step]
     for i,m in enumerate([base,base+fifth]):self.add('guitar',m,beat+b+i*.018,.35 if shuffle else .38,106 if step%2==0 else 65,.62,pan=-.3,muted=True)
    line=[0,4,7,9]if shuffle else [0,0,7,0]
    for b,iv in enumerate(line):self.add('bass',low+iv,beat+b,.8,92 if b%2==0 else 80,.75,pan=.04)
   else:
    for b,v in [(.5,94),(1.25,62),(1.75,84),(2.5,98),(3.25,72),(3.75,85)]:self.chord(root,q,beat+b,.2,v,.52,muted=True,reverse=b%1>.5)
    for b,iv,length,v in [(0,0,.42,98),(.75,0,.2,65),(1.5,7,.3,85),(2.25,10,.2,75),(2.75,7,.2,82),(3.5,0,.35,88)]:self.add('bass',low+iv,beat+b,length,v,.7,pan=.02)
   # Acoustic groove with changing accents, ghost snares, open hats and end-of-phrase fills.
   for b in range(4):
    self.add('drums','kick',beat+b,2.5,90 if b==0 else 70,.9)if b in [0,2]else None
    if b in [1,3]:self.add('drums','snare',beat+b+.012,2.2,82 if t['id']=='slow-minor'else 106,.83,pan=.05)
    subdivision=2/3 if t['id']=='texas-shuffle'else .5
    cymbal='ride'if t['id']=='slow-minor'else 'hat'
    for extra,v in [(0,77),(subdivision,52)]:self.add('drums',cymbal,beat+b+extra,4 if cymbal=='ride'else .8,v,.44,pan=.32)
   if t['id']=='clean-funk':
    self.add('drums','kick',beat+2.75,2,72,.65);self.add('drums','snare',beat+2.5,1.8,45,.28,pan=.05)
   if bar%4==3:
    self.add('drums','openhat',beat+3.5,3,74,.4,pan=.25)
    if t['id']!='slow-minor':
     for b,name in [(3.25,'snare'),(3.5,'tom'),(3.75,'lowtom')]:self.add('drums',name,beat+b,2,82,.5,pan=-.15 if name=='tom'else .18)
   if bar%4==0 and t['id']=='blues-rock':self.add('drums','crash',beat,7,84,.4,pan=-.3)
  # Instrument-wide processing preserves variation within each performance.
  guitar=self.stems['guitar'];guitar=sosfilt(butter(2,[100,6500],btype='bandpass',fs=RATE,output='sos'),guitar,axis=0)
  if t['id']in ['blues-rock','texas-shuffle']:guitar=np.tanh(guitar*(2.8 if t['id']=='blues-rock'else 1.7));guitar=sosfilt(butter(2,4300,fs=RATE,output='sos'),guitar,axis=0)
  # Short stereo room and slap; circular shifts preserve seamless tails.
  guitar+=np.roll(guitar,round(.095*RATE),axis=0)*.11;self.stems['guitar']=guitar
  self.stems['bass']=sosfilt(butter(2,2200,fs=RATE,output='sos'),self.stems['bass'],axis=0)
  targets={'guitar':.13,'bass':.14,'drums':.12}
  for name,data in self.stems.items():
   rms=np.sqrt(np.mean(data**2));data*=targets[name]/max(rms,1e-6)
  mixed=sum(self.stems.values());peak=np.max(np.abs(mixed));gain=min(1,.87/peak)
  for name in self.stems:self.stems[name]*=gain
  self.stems['mix']=sum(self.stems.values())
 def save(self,output):
  self.arrange();files={}
  for name,data in self.stems.items():
   path=output/(self.track['id']+'-'+name+'.mp3');raw=np.clip(data,-1,1).astype('<f4').tobytes();subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0','-codec:a','libmp3lame','-b:a','160k',str(path)],input=raw,check=True);files[name]='/assets/audio/backing/'+path.name
  return{**self.track,'duration':self.frames/RATE,'frames':self.frames,'sampleRate':RATE,'stems':files}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);a=p.parse_args();inventory=json.loads((ROOT/'dist/assets/audio/studio/provenance.json').read_text());dest=ROOT/'dist/assets/audio/backing';dest.mkdir(exist_ok=True);tracks=[]
 for track in TRACKS:
  tracks.append(Renderer(a.cache,inventory,track).save(dest));print('Rendered',track['name'],flush=True)
 (dest/'tracks.json').write_text(json.dumps(tracks,indent=2))
