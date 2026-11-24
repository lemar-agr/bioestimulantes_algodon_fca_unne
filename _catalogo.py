from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import sys,json
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',12)
for g in sys.argv[1:]:
 o=Image.new('RGB',(1000,5*325),'white')
 for j in range(10):
    n=g+str(j+1);f=Path('_etapas')/(n+'.jpg')
    if not f.exists():continue
    # Repaint IDs at preview size, maintaining their relative positions.
    im=Image.open(f).resize((500,305));d=ImageDraw.Draw(im)
    row=json.loads(f.with_suffix('.json').read_text())
    for k,(_,x,y) in enumerate(row['points'],1):
        x=round(x*500/row['width']);y=round(y*305/row['height'])
        d.rectangle((x-3,y-6,x+12,y+7),fill='#ffffce');d.text((x-3,y-7),str(k),font=font,fill='black')
    xx=j%2*500;yy=j//2*325;o.paste(im,(xx,yy));ImageDraw.Draw(o).text((xx+2,yy+305),n,fill='black',font=font)
 o.save('_etapas/catalogo'+g+'.jpg',quality=90)
