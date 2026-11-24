from pathlib import Path
import json,sys
import cv2 as cv
import numpy as np
from PIL import Image,ImageDraw,ImageFont

base=Path('_etapas');out=Path('outputs/medicion-foliar')
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',15)
color=np.uint8([[156,156,156],[238,159,32],[49,168,184],[60,141,223],[110,104,214],[195,107,202],[226,107,112],[76,173,115],[160,178,51],[235,119,38]])

def split(f,fields):
    name=f.stem;data=json.loads(f.read_text());H,W=data['shape'];scale=np.array([W/data['width'],H/data['height']])
    orig=json.loads((Path('_final')/f.name).read_text())
    mask=cv.imread(str(f.with_suffix('.png')),0)
    mask=(mask>0).astype('uint8')
    n,components,stats,_=cv.connectedComponentsWithStats(mask)
    points=np.array([[x,y] for r,x,y in data['points']])
    assert len(fields)==9,(name,fields)
    labels=np.zeros(len(points),dtype='uint8')
    for i,field in enumerate(fields,1):
        if field=='-':continue
        for k in map(int,field.split('+')):
            assert not labels[k-1],(name,k)
            labels[k-1]=i
    pts=np.rint(points*scale).astype(int)
    partition=np.zeros_like(mask)
    seeds={}
    for j,(x,y) in enumerate(pts):
        comp=components[y,x]
        if comp:seeds.setdefault(comp,[]).append((j,x,y))
        elif labels[j]:raise ValueError((name,'missing marker',j))
    touched=set()
    for comp,group in seeds.items():
        ids={labels[j] for j,_,_ in group}
        if ids=={0}:continue
        x,y,w,h,_=stats[comp]
        region=components[y:y+h,x:x+w]==comp
        view=partition[y:y+h,x:x+w]
        if len(ids)==1:
            view[region]=ids.pop();continue
        touched.update(i for i in ids if i)
        # Watershed of the inverted interior distance separates contacting blades at narrow necks.
        roi=np.pad(region.astype('uint8'),2)
        dt=cv.distanceTransform(roi,cv.DIST_L2,5)
        elev=cv.normalize(-dt,None,0,255,cv.NORM_MINMAX).astype('uint8')
        marker=np.zeros(roi.shape,np.int32)
        for j,X,Y in group:
            xx=X-x+2;yy=Y-y+2
            cv.circle(marker,(xx,yy),max(1,int(dt[yy,xx]*.35)),int(labels[j])+1,-1)
        # Flat background is excluded when reporting area.
        cv.watershed(cv.cvtColor(elev,cv.COLOR_GRAY2BGR),marker)
        boundary=marker<1
        if boundary.any():
            _,near=cv.distanceTransformWithLabels(boundary.astype('uint8'),cv.DIST_L2,5,labelType=cv.DIST_LABEL_PIXEL)
            lut=np.zeros(int(near.max())+1,int);lut[near[~boundary]]=marker[~boundary];marker[boundary]=lut[near[boundary]]
        view[region]=(marker[2:-2,2:-2][region]-1).astype('uint8')
    px=np.bincount(partition[mask>0],minlength=10)
    cv.imwrite(str(base/(name+'-etapas.png')),partition)
    assert px.sum()==orig['pix']
    for i,field in enumerate(fields,1):
        assert (px[i]>0)==(field!='-'),(name,i)
    pic=np.array(Image.open(Path('_final')/(name+'.jpg')).convert('RGB'))
    # Use the clean original photograph for the color overlay.
    cache=base/(name+'-orig.jpg')
    im=Image.open(cache if cache.exists() else Path(r'D:\Users\Usuario\Desktop\FOTOS\Area foliar')/name[0]/(name+'.jpg'));im.draft('RGB',(800,600))
    if im.height>im.width:im=im.transpose(Image.Transpose.ROTATE_90)
    pic=np.array(im.resize((800,data['height'])))
    lab=cv.resize(partition,(800,data['height']),interpolation=cv.INTER_NEAREST)
    inside=cv.resize(mask,(800,data['height']),interpolation=cv.INTER_NEAREST)>0
    pic[inside]=(.53*pic[inside]+.47*color[lab[inside]]).astype('uint8')
    img=Image.fromarray(pic);dr=ImageDraw.Draw(img)
    for i in range(1,10):
        if fields[i-1]=='-':continue
        x,y=points[np.where(labels==i)[0][0]]
        s='VC' if i==1 else 'V'+str(i-1)
        dr.text((x-9,y-8),s,fill='white',font=font,stroke_width=2,stroke_fill='#152721')
    img.save(base/(name+'-control.jpg'),quality=88)
    return {'foto':name,'escala':orig['escala'],'total':orig['pix'],'pix':px.tolist(),'contacto':sorted(map(int,touched))}

if __name__=='__main__':
    index=json.loads((base/'asignaciones.json').read_text())
    rows=[]
    for name,fields in index.items():rows.append(split(base/(name+'.json'),fields))
    (base/'resultados.json').write_text(json.dumps(rows))
