from pathlib import Path
from PIL import Image
import cv2 as cv
import numpy as np
import json,time
cv.setNumThreads(2)
base=Path(r'D:\Users\Usuario\Desktop\FOTOS\Area foliar')
out=Path('_final')
out.mkdir(exist_ok=True)
def run(f):
    row=json.loads(f.read_text())
    img=Image.open(base/f.stem[0]/(f.stem+'.jpg'))
    orig=img.size
    manual={'2D6':((239,615),(825,601)), '3A4':((220,654),(860,648)), '3A7':((226,588),(801,587))}
    if f.stem not in manual:
        img.draft('RGB',(img.width//4,img.height//4))
    a=np.array(img)
    if a.shape[0]>a.shape[1]: a=np.ascontiguousarray(np.rot90(a))
    # The calibration run sampled at one quarter of the native dimensions.
    target=(max(orig)//4,min(orig)//4) if f.stem not in manual else (max(orig),min(orig))
    if a.shape[:2]!=target[::-1]:
        a=cv.resize(a,target,interpolation=cv.INTER_AREA)
    old=np.array(Image.open(f.with_suffix('.jpg'))).astype(int)
    line=(old[:,:,0]<80)&(old[:,:,1]>180)&(old[:,:,2]>180)
    h,w=a.shape[:2]
    hsv=cv.cvtColor(a,cv.COLOR_RGB2HSV)
    hue,sat,v=cv.split(hsv)
    mask=((hue>=31)&(hue<=91)&(sat>=34) | (hue>=18)&(hue<31)&(sat>=93)) & (v>=18)
    # Board corners checked on 240 x 180 previews, in file number order.
    corners={'E':[(34,12),(30,14),(32,12),(28,12),(30,13),(31,13),(31,13),(31,13),(32,13),(34,12)],
             'F':[(38,10),(30,12),(35,11),(31,12),(32,12),(32,12),(31,12),(31,12),(32,12),(0,0)],
             'G':[(23,18),(23,17),(28,18),(23,18),(20,15),(23,16),(23,17),(24,18),(25,18),(26,18)],
             'H':[(25,18),(25,17),(26,17),(25,17),(29,17),(26,17),(25,17),(25,17),(26,17),(26,18)]}
    px,py=np.arange(w)[None,:]*240/w,np.arange(h)[:,None]*180/h
    if f.stem[0]=='3':
        series=f.stem[1]
        if series in corners:
            left,top=corners[series][int(f.stem[2:])-1]
            mask &= ~(((px<left)&(py<44))|((px<48)&(py<top)))
        elif series in 'CD':
            mask &= ~((px<18)&(py<28))
    mask &= ~((px>69)&(px<175)&(py<18)&(hue<31)&(sat<155))
    ys,xs=np.where(line)
    if f.stem in manual:
        start,end=np.array(manual[f.stem])
        row['escala']=float(np.linalg.norm(end-start))/40
        line[:]=False
        coords=np.round(np.array([start,end])*[600/w,450/h]).astype(int)
        layer=np.zeros((450,600),np.uint8)
        cv.line(layer,tuple(coords[0]),tuple(coords[1]),255,2)
        line=layer>0
        ys,xs=np.where(line)
    if len(xs)>50:
        fit=np.polyfit(xs,ys,1)
        bottom=np.polyval(fit,np.arange(w)*600/w)*h/450
        mask &= np.arange(h)[:,None]<(bottom[None,:]+h*.028)
    n,lab,stats,_=cv.connectedComponentsWithStats(mask.astype('uint8'))
    valid=stats[:,4]>max(6,w*h*.000012)
    valid[0]=False
    for idx in np.where(valid)[0]:
        x,y,bw,bh,area=stats[idx]
        pix=(lab[y:y+bh,x:x+bw]==idx)
        local=hsv[y:y+bh,x:x+bw][pix]
        if (bw>4.6*bh or bh>4.8*bw or 
            ((x+bw/2)/w<.08 and np.median(local[:,0])<35 and (y+bh/2)/h>.14)):
            valid[idx]=False
    mask=valid[lab]
    if f.stem in ('3H4','3H6'):
        # Enclosed discolored tissue within the upper right blade.
        reg=mask[:int(h*.40),int(w*.72):].astype('uint8')
        contours,_=cv.findContours(reg,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE)
        cv.drawContours(reg,contours,-1,1,cv.FILLED)
        mask[:reg.shape[0],int(w*.72):]=reg
    thumb=cv.resize(a,(600,450))
    overlay=cv.resize(mask.astype('uint8'),(600,450),interpolation=cv.INTER_NEAREST)>0
    thumb[overlay]=(thumb[overlay]*.45+np.array([255,0,125])*.55).astype('uint8')
    thumb[line]=[0,245,250]
    Image.fromarray(thumb).save(out/(f.stem+'.jpg'))
    row['pix']=int(mask.sum())
    (out/f.name).write_text(json.dumps(row))

if __name__=='__main__':
    import sys
    for f in sorted(base.rglob('*.jpg')):
        if len(sys.argv)>1 and f.stem not in sys.argv[1:]: continue
        src=Path('_revision')/(f.stem+'.json')
        while not src.exists():time.sleep(1)
        run(src)
