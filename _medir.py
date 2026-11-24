import cv2 as cv
import numpy as np
import re, json
from pathlib import Path
from PIL import Image

base = Path(r'D:\Users\Usuario\Desktop\FOTOS\Area foliar')
qa = Path('_revision')
qa.mkdir(exist_ok=True)
cv.setNumThreads(2)
def read(f):
    im = Image.open(f)
    im.draft('RGB',(im.width//2,im.height//2))
    a = np.asarray(im)
    return np.ascontiguousarray(np.rot90(a)) if a.shape[0]>a.shape[1] else a

sift = cv.SIFT_create(contrastThreshold=.015)
ref = read(base/'2/2D1.jpg')
gray = cv.cvtColor(ref,cv.COLOR_RGB2GRAY)
template = gray[2390:2620,900:3380]
k0,d0 = sift.detectAndCompute(template,None)
matcher = cv.FlannBasedMatcher(dict(algorithm=1,trees=4),dict(checks=60))
def measure(f):
    a = read(f)
    h,w = a.shape[:2]
    y = int(h*.65)
    g = cv.cvtColor(a[y:],cv.COLOR_RGB2GRAY)
    k,d = sift.detectAndCompute(g,None)
    good = [m for m,n in matcher.knnMatch(d0,d,k=2) if m.distance<.74*n.distance]
    src = np.float32([k0[m.queryIdx].pt for m in good])
    dst = np.float32([k[m.trainIdx].pt for m in good])
    scale = None
    support = 0
    if len(src)>=5:
        model,ok=cv.estimateAffine2D(src,dst,ransacReprojThreshold=4,maxIters=5000)
        if model is not None:
            ok=ok.ravel().astype(bool)
            support=round(float(np.ptp(src[ok,0]))/24)
            if ok.sum()>=8 and support>20:
                # Reference zero and 40 cm ticks in the source crop.
                p0=(1650+101*5150/1800)/2-900
                p1=(1650+1755*5150/1800)/2-900
                start=model@np.array([p0,30,1])+[0,y]
                end=model@np.array([p1,30,1])+[0,y]
                scale=float(np.linalg.norm(end-start))/40
    small=cv.resize(a,(w//2,h//2),interpolation=cv.INTER_AREA)
    H,W=small.shape[:2]
    hsv=cv.cvtColor(small,cv.COLOR_RGB2HSV)
    mask=cv.inRange(hsv,(17,39,22),(92,255,255))
    # Restrict the measurement to the board above the graduated ruler.
    if scale:
        xx=np.arange(W)
        line=(start[1]+(2*xx-start[0])*(end[1]-start[1])/(end[0]-start[0]))/2
        mask[np.arange(H)[:,None]>line[None,:]-3]=0
    n,labels,stats,_=cv.connectedComponentsWithStats(mask,8)
    keep=stats[:,cv.CC_STAT_AREA]>65
    keep[0]=False
    # Reject brownish yellow background objects while retaining yellow blades.
    for idx in np.where(keep)[0]:
        x,y0,ww,hh,area=stats[idx]
        if ww>4.3*hh or hh>5*ww:
            keep[idx]=False
            continue
        region=labels[y0:y0+hh,x:x+ww]==idx
        hue=hsv[y0:y0+hh,x:x+ww,0][region]
        if np.median(hue)<22:
            keep[idx]=False
    mask=(keep[labels]*255).astype('uint8')
    pix=int(cv.countNonZero(mask))
    thumb=cv.resize(small,(600,450))
    overlay=cv.resize(mask,(600,450))>127
    thumb[overlay]=(thumb[overlay]*.45+np.array([255,0,125])*.55).astype('uint8')
    if scale:
        ratio=np.array([600/w,450/h])
        cv.line(thumb,tuple((start*ratio).astype(int)),tuple((end*ratio).astype(int)),(0,255,255),2)
    Image.fromarray(thumb).save(qa/(f.stem+'.jpg'))
    return dict(foto=f.stem,pix=pix,escala=scale/2 if scale else None,soporte=support)

if __name__=='__main__':
    fs=sorted(base.rglob('*.jpg'))
    for f in fs:
        dest=qa/(f.stem+'.json')
        if dest.exists(): continue
        row=measure(f)
        dest.write_text(json.dumps(row))
        print(row,flush=True)
