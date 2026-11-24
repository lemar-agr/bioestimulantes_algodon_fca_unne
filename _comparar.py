from pathlib import Path
import cv2 as cv,numpy as np,json,zipfile,io
from PIL import Image,ImageDraw,ImageFont
base=Path('_etapas');out=Path('outputs/medicion-foliar')
counts=json.loads((base/'conteos.json').read_text(encoding='utf-8-sig'))
data=json.loads((base/'resultados.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
colors=[(0,0,0),(190,96,16),(0,126,143),(14,95,185),(87,59,182),(160,50,166),(198,68,77),(13,120,75),(110,115,17),(197,85,16)]
def process(row):
    n=row['foto'];num=int(counts[n[:2]][int(n[2:])-1]);s=row['escala']
    mask=cv.imread(str(base/(n+'-etapas.png')),0)
    orig=np.array(Image.open(base/(n+'-orig.jpg')))
    H,W=mask.shape;h,w=orig.shape[:2];smallmask=cv.resize(mask,(w,h),interpolation=cv.INTER_NEAREST)
    hsv=cv.cvtColor(orig,cv.COLOR_RGB2HSV)
    yellow=(hsv[:,:,0]>=18)&(hsv[:,:,0]<=32)&(hsv[:,:,1]>=50)
    img=Image.fromarray(orig.copy());dr=ImageDraw.Draw(img)
    details=[]
    for i in range(1,10):
        stage='VC' if i==1 else 'V'+str(i-1)
        mm=(mask==i);pix=int(mm.sum());assert pix==row['pix'][i],(n,i,pix,row['pix'][i])
        if i==1:assert bool(num)==bool(pix),(n,num,pix)
        if not pix:continue
        two=(num==2 and i==1) or (n=='3A5' and i==2)
        horizontal=n[:2] not in ('3B','3C','3D') and n not in ('3H3','3H7')
        zone=smallmask==i
        if two:
            axis=0 if horizontal else 1
            proj=mm.sum(axis=axis)
            cumul=np.cumsum(proj)
            cand=np.flatnonzero((cumul>pix*.30)&(cumul<pix*.7))
            ix=cand[np.argmin(proj[cand]+.01*abs(cumul[cand]/pix-.5)*proj.max())]
            widths=np.arange(W)[None,:] if horizontal else np.arange(H)[:,None]
            side=(np.arange(w)[None,:]*W/w if horizontal else np.arange(h)[:,None]*H/h)<=ix
            parts=[(zone&side,int(np.sum(mm&(widths<=ix)))),(zone&~side,int(np.sum(mm&(widths>ix))))]
        else:parts=[(zone,pix)]
        for k,(z,piecepx) in enumerate(parts,1):
            coverage=float(yellow[z].mean())
            flag=coverage>=.5
            dist=cv.distanceTransform(z.astype('uint8'),cv.DIST_L2,5)
            yy,xx=np.unravel_index(np.argmax(dist),dist.shape)
            details.append(dict(stage=stage,piece=k,px=piecepx,frac=coverage,amarilla=flag))
            contours,_=cv.findContours(z.astype('uint8'),cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE)
            for co in contours:
                pts=[tuple(map(int,p)) for p in co[:,0,:]]
                if len(pts)>2:dr.line(pts+[pts[0]],fill=colors[i],width=2)
            label=stage+('*' if flag else '')
            dr.text((xx,yy),label,anchor='mm',font=font,fill='white',stroke_width=2,stroke_fill='#17261e')
    board=Image.new('RGB',(2*w,h+75),'white');board.paste(Image.fromarray(orig),(0,38));board.paste(img,(w,38));d=ImageDraw.Draw(board)
    d.text((15,9),n+'.jpg   |   Original',font=font,fill='#153e31');d.text((w+15,9),'Identificación por el papelito más cercano',font=font,fill='#153e31')
    d.text((15,h+48),'VC a V8   ·   * = hoja predominantemente amarilla   ·   Las hojas sin marca quedan fuera de la suma.',font=small,fill='#153e31')
    buf=io.BytesIO();board.save(buf,format='JPEG',quality=91)
    row.update(piezas=details,vc=num)
    return buf.getvalue()
assert len(data)==130
with zipfile.ZipFile(out/'Fotos rotuladas VC a V8.zip','w') as z:
    for r in data:z.writestr('Bloque '+r['foto'][0]+'/'+r['foto']+'.jpg',process(r))
(base/'comparacion.json').write_text(json.dumps(data))
