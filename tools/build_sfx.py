"""Deterministic short-form audio suite. Original synthesis; no sample libraries.
Run: python build_sfx.py; requires numpy, scipy, soundfile, ffmpeg.
"""
from pathlib import Path
import subprocess, numpy as np
from scipy.signal import butter, sosfilt
import soundfile as sf
SR=48000
rng=np.random.default_rng(543219)
OUT=Path(__file__).resolve().parent.parent/'public/assets/sfx'; OUT.mkdir(parents=True,exist_ok=True)

def tvec(d):return np.arange(round(d*SR))/SR

def fade(x,fade_in=.008,fade_out=.15):
 x=np.asarray(x, dtype=np.float64).copy(); n=len(x)
 if n<4:return x
 a=min(n,round(SR*fade_in));b=min(n,round(SR*fade_out))
 if a:x[:a]*=np.sin(np.linspace(0,np.pi/2,a))**2
 if b:x[-b:]*=np.cos(np.linspace(0,np.pi/2,b))**2
 return x

def ton(freq,d=.3,decay=5,brightness=.22,glide=0):
 t=tvec(d); f=freq+glide*(t/max(d,1e-3));phase=2*np.pi*np.cumsum(f)/SR
 return ((np.sin(phase)+brightness*np.sin(phase*2)+brightness*.38*np.sin(phase*3))*np.exp(-decay*t/max(d,0.1)))

def noise(d,color='high'):
 x=rng.normal(0,1,len(tvec(d)));sos=butter(3,1800 if color=='high' else 520,btype='highpass' if color=='high' else 'lowpass',fs=SR,output='sos');return sosfilt(sos,x)

def mix(parts,sec):
 out=np.zeros(round(sec*SR))
 for offset,signal,volume in parts:
  i=round(offset*SR);j=min(len(out),i+len(signal));
  if j>i:out[i:j]+=volume*signal[:j-i]
 return out

def bell(note,d=.7):
 t=tvec(d);x=np.zeros_like(t)
 for mult,amp,rate in [(1,1,4.4),(2.008,.37,6.5),(2.95,.16,8),(4.45,.08,10)]:x+=amp*np.sin(2*np.pi*note*mult*t)*np.exp(-rate*t)
 return fade(x,.002,.09)

def impact(d=.8,low=65):
 t=tvec(d);x=.72*np.sin(2*np.pi*(low*t+28*t*np.exp(-14*t)))*np.exp(-8*t); x+=noise(d,'low')*.15*np.exp(-13*t);return fade(x,.003,.18)

def sweep(d=.5,rise=True):
 t=tvec(d);f=np.geomspace(320,4500,len(t));f=f if rise else f[::-1]; sig=np.sin(2*np.pi*np.cumsum(f)/SR)
 return fade(.27*sig + .2*noise(d,'high'),.015,.14)*np.sin(np.pi*t/d)**.8

def applause(d=1.6, sad=False):
 t=tvec(d);out=np.zeros_like(t)
 if sad:
  out+=.15*ton(210,d,decay=2,glide=-90)
  out+=.18*noise(d,'low')*np.exp(-3*t)
 else:
  for i in range(145):
   at=rng.uniform(.02,d-.1);n=rng.uniform(.006,.024);click=fade(noise(n,'high'),.001,.006)*rng.uniform(.055,.18);idx=int(at*SR);out[idx:idx+len(click)]+=click[:len(out)-idx]
  out+=.03*noise(d,'high')
 return fade(out,.05,.25)

def stereo(x,pan=.07,room=.16):
 n=len(x);left=x.copy();right=np.roll(x,round(SR*.0008));right[:round(SR*.0008)]=0
 if room:
  for lag,vol in [(.042,.10*room),(.086,.09*room),(.147,.08*room)]:
   k=round(SR*lag);left[k:]+=vol*right[:-k];right[k:]+=vol*left[:-k]
 return np.stack([(1+pan)*left,(1-pan)*right],axis=-1)

def save(name,parts,d,level=.78,room=.25):
 x=mix(parts,d);x=fade(x,.006,min(.11,d*.16));y=stereo(x,room=room)
 y=np.tanh(y*.95);pk=np.max(np.abs(y));y=y/(pk+1e-9)*level
 w=OUT/(f'sfx-{name}.wav');sf.write(str(w),y,SR,subtype='PCM_16')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(w),'-ac','2','-ar','48000','-codec:a','libmp3lame','-qscale:a','4',str(OUT/(f'sfx-{name}.mp3'))],check=True);w.unlink()

save('buzz',[(0,ton(465,.24,decay=2,brightness=.35,glide=-26),.7),(.02,noise(.11,'high')*np.exp(-25*tvec(.11)),.18)],.34,.66,.07)
save('correct',[(0,bell(659,.55),.58),(.12,bell(830,.57),.48),(.24,bell(988,.68),.47)],1.06,.72,.7)
save('wrong',[(0,ton(392,.38,2.5,brightness=.10,glide=-60),.44),(.20,ton(294,.46,3,brightness=.08,glide=-40),.42)],.82,.62,.25)
save('join',[(0,bell(523,.48),.37),(.11,bell(659,.53),.39),(.23,bell(784,.65),.38)],1.0,.58,.50)
save('go',[(0,sweep(.26,True),.24),(.14,bell(784,.58),.62)],.86,.65,.4)
save('tick',[(0,ton(1220,.09,15,.11),.4),(.0,fade(noise(.05),.001,.045),.09)],.13,.43,.02)
save('countdown',[(k*.78,ton(720,.17,9,.12),.40) for k in range(3)]+[(2.34,bell(988,.5),.66)],3.1,.64,.1)
save('showdown',[(0,sweep(.55,True),.32),(.29,impact(.98,56),.65),(.34,bell(523,.9),.24),(.54,bell(784,.9),.30)],1.60,.78,.65)
save('crowd-cheer',[(0,applause(2.25),.72),(.28,bell(784,1.7),.18),(.62,bell(1046,1.55),.23)],2.6,.58,.8)
save('crowd-aww',[(0,applause(1.65,True),.63),(.2,ton(262,1.25,2,.10,glide=-45),.35)],1.75,.48,.22)
save('spark-gain',[(0,bell(740,.64),.46),(.1,bell(990,.78),.38),(.23,bell(1240,.85),.3)],1.24,.67,.50)
save('spark-lose',[(0,bell(525,.55),.33),(.14,ton(395,.46,5,.10,glide=-120),.45)],.83,.55,.2)
save('boom',[(0,impact(1.15,49),.82),(.08,sweep(.54,False),.26)],1.35,.70,.3)
save('swap',[(0,sweep(.42,True),.4),(.18,sweep(.36,False),.3),(.37,bell(740,.38),.17)],.88,.55,.3)
save('dice-roll',[(i*.11,fade(noise(.10,'high'),.002,.08)*np.exp(-18*tvec(.10)),.16 if i<6 else .1) for i in range(8)],1.18,.43,.12)
save('gunshot',[(0,impact(.6,70),.5),(.04,fade(noise(.2),.001,.17),.17)],.75,.52,.08)
save('hop',[(0,ton(480,.23,9,.20,glide=400),.42)],.31,.54,.08)
save('reel-stop',[(0,impact(.43,110),.38),(.01,bell(532,.42),.23)],.55,.50,.18)
save('reel',[(i*.13,ton(600,.11,10,.08,glide=-80),.19) for i in range(8)],1.21,.38,.07)
save('spin',[(i*.38,sweep(.31,True),.22) for i in range(9)]+[(3.47,bell(880,1.3),.25)],5.0,.56,.27)
# Keep the legacy whitespace-named file loadable, but replace its content too.
(OUT/'sfx-hop .mp3').write_bytes((OUT/'sfx-hop.mp3').read_bytes())
print('Generated',len(list(OUT.glob('*.mp3'))),'effects')
