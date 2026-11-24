from pathlib import Path
import json,re,sys
import numpy as np, cv2 as cv
from PIL import Image, ImageDraw, ImageFont
work=Path('_etapas');work.mkdir(exist_ok=True)
src=Path('_ajustar.py').read_text(encoding='utf8').split("if __name__==")[0]
src=src.replace("if f.stem[0]=='3':","if active and f.stem[0]=='3':").replace('    mask &= ~((px>69)','    if active: mask &= ~((px>69)')
src=src[:src.index('    thumb=cv.resize')]+'''    return mask,a'''
ctx={};exec(src,ctx)
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',14)
def generate(f):
    name=f.stem
    ctx['active']=bool(re.match('3[C-H]',name) or name in '2D6 3A4 3A7 2D10 3A1 3A10 3A3 3A5'.split())
    mask,a=ctx['run'](Path('_revision')/f.name)
    orig=json.loads(f.read_text())
    assert int(mask.sum())==orig['pix'],(name,mask.sum(),orig['pix'])
    H,W=mask.shape; width=800;height=round(H*width/W)
    small=cv.resize(mask.astype('uint8'),(width,height),interpolation=cv.INTER_NEAREST)
    dist=cv.distanceTransform(small,cv.DIST_L2,5)
    peaks=cv.dilate(dist,np.ones((19,19),np.uint8))
    cnt,lab,st,ct=cv.connectedComponentsWithStats(((dist>=peaks-.001)&(dist>2)).astype('uint8'))
    pos=[]
    for i in range(1,cnt):
        y,x=np.where(lab==i);k=len(y)//2;pos.append((float(dist[y[k],x[k]]),int(x[k]),int(y[k])))
    keep=[]
    for r,x,y in sorted(pos,reverse=True):
        if any(np.hypot(x-X,y-Y)<max(17,1.32*R) for R,X,Y in keep):continue
        keep.append((r,x,y))
    keep.sort(key=lambda t:(int(t[2]/(height*.15)),t[1]))
    photo=Image.fromarray(cv.resize(a,(width,height),interpolation=cv.INTER_AREA))
    # Increase local contrast so the handwritten slips are readable.
    g=cv.cvtColor(np.asarray(photo),cv.COLOR_RGB2GRAY)
    ink=cv.subtract(cv.GaussianBlur(g,(0,0),4),g)
    rgb=np.maximum(0,np.asarray(photo).astype(int)-ink[:,:,None].astype(int)*4).astype('uint8')
    labeled=Image.fromarray(rgb);d=ImageDraw.Draw(labeled)
    for i,(_,x,y) in enumerate(keep,1):
        d.rectangle((x-4,y-9,x+15,y+8),fill='#fff5bc');d.text((x-3,y-9),str(i),fill='black',font=font)
    labeled.save(work/(name+'.jpg'),quality=88)
    cv.imwrite(str(work/(name+'.png')),mask.astype('uint8')*255)
    (work/(name+'.json')).write_text(json.dumps(dict(points=keep,shape=[H,W],width=width,height=height)))
if __name__=='__main__':
    for f in sorted(Path('_final').glob('*.json')):
        if (work/(f.stem+'.json')).exists():continue
        generate(f)
