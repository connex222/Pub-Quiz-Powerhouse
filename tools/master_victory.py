from pathlib import Path
import sys, subprocess
sys.path.insert(0,str(Path(__file__).parent))
import build_sfx as a
p=Path(__file__).parent/'public/assets/music'
p.mkdir(parents=True,exist_ok=True)
parts=[(.0,a.impact(1.4,65),.42),(.09,a.bell(523,1.0),.35),(.28,a.bell(659,1.15),.38),(.52,a.bell(784,1.4),.45),(.76,a.bell(1047,2.2),.43),(.96,a.bell(1318,2.0),.26),(1.2,a.applause(2.2),.20),(2.22,a.bell(1047,1.9),.30)]
x=a.mix(parts,4.5)
x=a.fade(x,.012,.65); y=a.stereo(x,pan=0,room=.5)
import numpy as np, soundfile as sf
y=np.tanh(.9*y);y*=.80/(np.max(np.abs(y))+1e-9)
w=p/'mus-victory.wav';sf.write(w,y,a.SR,subtype='PCM_16')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(w),'-codec:a','libmp3lame','-qscale:a','3',str(p/'mus-victory.mp3')],check=True)
w.unlink()
print((p/'mus-victory.mp3').stat().st_size)
