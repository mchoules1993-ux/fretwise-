"""Check delivered sample banks, source provenance and rendered audio alignment."""
import base64,json,subprocess,tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'site/assets/audio'
rows=json.loads((folder/'studio/provenance.json').read_text())
assert len(rows)==150
for bank in ['guitar','bass','drums']:
 entries=json.loads((folder/'studio'/(bank+'.json')).read_text())
 assert len(entries)==len([r for r in rows if r['bank']==bank])
 assert all(e['articulation']in ['sustain','release','mute','hit']for e in entries)
 assert len({e['rr']for e in entries})>=2
 for e in entries:
  encoded=base64.b64decode(e['data'],validate=True)
  # Decode the delivered bytes, not only intermediate WAVs.
  pcm=subprocess.check_output(['ffmpeg','-v','error','-f','mp3','-i','pipe:0','-f','f32le','-ar','32000','-ac','1','-'],input=encoded)
  data=np.frombuffer(pcm,dtype='<f4');assert len(data)>1000 and np.isfinite(data).all()
  assert np.max(np.abs(data))<.99,(bank,e['key'],'sample clipping')
for name in ['karoryfer.shinyguitar','karoryfer.black-and-blue-basses','virtuosity_drums']:
 assert 'CC0 1.0 Universal'in(folder/'studio'/(name+'-LICENSE.txt')).read_text()
tracks=json.loads((folder/'backing/tracks.json').read_text())
assert len(tracks)==4
for track in tracks:
 assert len(track['seq'])==len(track['nums'])
 assert abs(track['duration']-len(track['seq'])*4*60/track['bpm'])<.001
 lengths=[]
 for name,url in track['stems'].items():
  source=ROOT/'site'/url.lstrip('/')
  pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ar','32000','-ac','2','-'])
  data=np.frombuffer(pcm,dtype='<f4').reshape(-1,2);lengths.append(len(data))
  assert np.isfinite(data).all()
  assert np.sqrt(np.mean(data*data))>.015,(track['id'],name,'silent stem')
  assert np.max(np.abs(data))<.99,(track['id'],name,'clipping')
  assert abs(len(data)/32000-track['duration'])<.001,(track['id'],name,'misaligned stem')
 assert len(set(lengths))==1
 print(track['name']+': matched stem lengths, valid duration, audible signal and no clipping')
print('PASS: 150 decoded instrument samples, source licenses, four backing arrangements and 16 delivered MP3s.')
