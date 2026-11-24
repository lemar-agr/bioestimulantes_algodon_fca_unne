from PIL import Image, ImageDraw,ImageFont
from pathlib import Path
import numpy as np, json
base=Path('_etapas');idx=json.loads((base/'asignaciones.json').read_text(encoding='utf-8-sig'))
root=Path(r'D:\Users\Usuario\Desktop\FOTOS\Area foliar')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
for group in dict.fromkeys(n[:2] for n in idx):
    sheet=Image.new('RGB',(920,5*140),'white')
    for k in range(1,11):
        n=group+str(k);data=json.loads((base/(n+'.json')).read_text())
        cache=base/(n+'-orig.jpg')
        if not cache.exists():
            im=Image.open(root/n[0]/(n+'.jpg'));im.draft('RGB',(800,600))
            if im.height>im.width:im=im.transpose(Image.Transpose.ROTATE_90)
            im.resize((800,data['height'])).save(cache,quality=94)
        im=Image.open(cache)
        fields=idx[n]
        mark=fields[0] if fields[0]!='-' else fields[1]
        pp=np.array([[x,y] for _,x,y in data['points']])
        pts=pp[[int(i)-1 for i in mark.split('+')]]
        x=int(pts[:,0].mean())-82;y=int(pts[:,1].mean())-51
        crop=im.crop((x,y,x+250,y+114))
        xx=(k-1)%2*460;yy=(k-1)//2*140
        sheet.paste(crop,(xx,yy));d=ImageDraw.Draw(sheet)
        d.text((xx+252,yy+15),n,fill='black',font=font)
        d.text((xx+252,yy+38),f'x={x}   y={y}',fill='black',font=font)
        d.text((xx+252,yy+62),'VC '+mark if fields[0]!='-' else 'Primer rótulo V1',fill='black',font=font)
    sheet.save(base/('color'+group+'.jpg'),quality=94)
