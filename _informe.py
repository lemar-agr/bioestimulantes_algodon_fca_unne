from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader,simpleSplit
from PIL import Image
from pathlib import Path
import json,zipfile
import io
import pypdfium2
dest=Path('outputs/medicion-foliar');file=dest/'Informe ilustrado.pdf'
c=canvas.Canvas(str(file),pagesize=(595,842))
c.setTitle('Medición del área foliar visible en los bloques 2 y 3')
green='#235345';ink='#20332e'
def txt(x,y,s,size=11,font='Helvetica',color=ink):
    c.setFont(font,size);c.setFillColor(color);c.drawString(x,842-y,s)
def p(y,s):
    for l in simpleSplit(s,'Helvetica',11,505):
        txt(45,y,l);y+=16
    return y+10
def code(y,lines):
    c.setFillColor('#edf3ef');c.rect(45,842-y-15*len(lines)-12,505,15*len(lines)+15,fill=1,stroke=0)
    for i,l in enumerate(lines):txt(55,y+13+i*15,l,9,'Courier')
def page(n,title):
    txt(45,45,'METODOLOGÍA   /   BLOQUES 2 Y 3',9,'Helvetica-Bold',green);txt(45,86,title,25,'Helvetica-Bold')
    txt(45,812,'Área foliar proyectada  ·  23 de noviembre de 2026',9);txt(536,812,str(n),9)
def pic(f,x,y,w):
    im=Image.open(f);h=w*im.height/im.width;c.drawImage(ImageReader(im),x,842-y-h,w,h);return y+h
results=json.loads(Path('_etapas/comparacion.json').read_text())
def areas(row):
    pieces=row['piezas'];s=row['escala']**2
    return [sum(p['px'] for p in pieces if (not novc or p['stage']!='VC') and (not noyellow or not p['amarilla']))/s for novc,noyellow in [(False,False),(True,False),(False,True),(True,True)]]
def fmt(n):return f'{n:,.1f}'.replace(',','_').replace('.',',').replace('_','.')
page(1,'Medición del área foliar hasta V8')
p(122,'Se midió la superficie visible en 130 fotos de los bloques 2 y 3. Los resultados de esta tabla incluyen únicamente las piezas asociadas a los rótulos VC y V1 a V8. La suma de ambos bloques fue de '+fmt(sum(areas(r)[0] for r in results))+' cm².')
pic('_revision/leer2D1.jpg',69,180,457)
txt(69,542,'Figura 1. Foto 2D1. La regla del borde inferior aporta la referencia de longitud.',10)
txt(45,590,'Resultados por bloque',16,'Helvetica-Bold')
table=[('Bloque','Fotos','Total VC a V8','Media por foto')]
for b in '23':
    vals=[areas(r)[0] for r in results if r['foto'][0]==b];table.append((b,str(len(vals)),fmt(sum(vals))+' cm²',fmt(sum(vals)/len(vals))+' cm²'))
for i,row in enumerate(table):
    for x,s in zip([45,152,267,411],row):txt(x,623+28*i,s,11,'Helvetica-Bold' if i==0 else 'Helvetica')
p(730,'Las carpetas 2 y 3 identifican los bloques. Se conservaron los nombres originales para que cada medición pueda cotejarse con su foto.')
c.showPage()
page(2,'Del largo de la regla a la escala')
p(122,'1. Pillow abrió los JPG. NumPy giró las fotos verticales para orientar la regla hacia abajo. En la mayoría se midió a un cuarto del ancho y del alto originales.')
pic('ruler.jpg',45,193,505)
txt(45,269,'Figura 2. Detalle de la regla de 2D1. Las marcas de 0 y 40 cm fijan la escala.',10)
p(310,'2. OpenCV extrajo puntos distintivos de la regla de 2D1 con SIFT. FLANN buscó coincidencias en la franja inferior de cada foto. Una transformación afín estimada con RANSAC permitió trasladar las posiciones de las marcas y descartar coincidencias atípicas.')
code(394,['sift = cv.SIFT_create(contrastThreshold=.015)','k0,d0 = sift.detectAndCompute(template,None)','scale=float(np.linalg.norm(end-start))/40'])
p(485,'3. La distancia entre marcas, en píxeles, se dividió por 40 cm. La escala se ajustó a la resolución de la imagen de medición. En 2D6, 3A4 y 3A7 se marcaron los extremos manualmente y se conservó la resolución original.')
pic('_final/3A7.jpg',45,568,234)
txt(300,598,'Ejemplo del bloque 3',14,'Helvetica-Bold')
for i,s in enumerate(['En 3A7, las marcas estaban a unos','575 píxeles de distancia.','575 px ÷ 40 cm = 14,375 px/cm.','La línea celeste indica el tramo','usado para la calibración.']):txt(300,628+i*20,s,11)
c.showPage()
page(3,'Cómo se separaron las hojas')
p(122,'4. OpenCV convirtió los colores de RGB a HSV. El tono (hue) permite reconocer verdes y amarillos. La saturación (sat) ayuda a distinguirlos del tablero y el brillo (v) permite excluir píxeles muy oscuros.')
code(195,['hsv=cv.cvtColor(a,cv.COLOR_RGB2HSV)','hue,sat,v=cv.split(hsv)','mask=((hue>=31)&(hue<=91)&(sat>=34) |','      (hue>=18)&(hue<31)&(sat>=93)) & (v>=18)'])
p(302,'5. Se agruparon los píxeles contiguos y se descartaron fragmentos muy pequeños o alargados. La revisión visual permitió excluir partes de la escuadra y del fondo. En 3H4 y 3H6 se rellenaron zonas interiores descoloridas de la hoja superior derecha.')
pic('_revision/2D9.jpg',45,394,245);pic('_final/2D9.jpg',305,394,245)
txt(45,601,'Primera detección',12,'Helvetica-Bold');txt(305,601,'Medición final',12,'Helvetica-Bold')
p(638,'Figura 3. En 2D9, la primera detección dejó afuera la tercera hoja de la fila superior. En la imagen final aparece en rosa junto con las demás. Las etiquetas de papel y la regla quedan fuera del conteo.')
p(732,'El rosa representa los píxeles seleccionados. Se sumaron en la resolución de medición antes de reducir las imágenes de control a 600 × 450 píxeles.')
c.showPage()
page(4,'De los píxeles al resultado')
p(123,'6. NumPy contó los píxeles de la máscara final. Para convertir un área a cm² hay que dividir por la escala al cuadrado, porque tanto el ancho como el alto se miden en píxeles.')
code(199,["row['pix']=int(mask.sum())",'Área (cm²) = píxeles de hoja / (píxeles por cm)²'])
r=json.loads(Path('_final/2D9.json').read_text());area=r['pix']/r['escala']**2
txt(45,295,'Cálculo de la foto 2D9',16,'Helvetica-Bold')
p(329,'Antes de asignar las etapas, la máscara completa reunió 859.458 píxeles de hoja a 29,12715 px/cm, equivalentes a '+f'{area:.1f}'.replace('.',',')+' cm². Luego se seleccionaron las piezas con rótulo VC a V8. La página siguiente muestra esa selección para la misma foto.')
txt(45,432,'Código y bibliotecas',16,'Helvetica-Bold')
p(467,'_medir.py y _ajustar.py usan Python con Pillow para leer y guardar imágenes, OpenCV (cv2) para localizar la regla y segmentar, y NumPy para trabajar con las matrices de píxeles. pathlib gestiona las rutas y json guarda los conteos y las escalas.')
p(560,'_libro.mjs usa JavaScript con Node.js y @oai/artifact-tool para crear el Excel. Cada fila vincula el nombre de la foto con su bloque, el conteo, la escala y el área calculada.')
txt(45,650,'Alcance de la estimación',16,'Helvetica-Bold')
p(685,'El método estima el área proyectada visible y supone que la escala de la regla es uniforme sobre el tablero. Las hojas curvas, los solapamientos y la perspectiva pueden modificar el resultado. No se determinó un margen de error experimental mediante una medición independiente.')
c.showPage()
page(5,'Identificación de VC a V8')
p(124,'7. Se leyó el papelito más próximo a cada hoja o par. Los puntos numerados de revisión permitieron asociar cada región de la máscara con una etapa. Cuando dos hojas se tocaban, OpenCV estimó el límite usando la distancia al borde y el algoritmo watershed.')
with zipfile.ZipFile(dest/'Fotos rotuladas VC a V8.zip') as z:
    photo=Image.open(io.BytesIO(z.read('Bloque 2/2D9.jpg')))
    right=photo.crop((800,38,1600,638))
    c.drawImage(ImageReader(right),94,842-205-294,392,294)
txt(45,525,'Figura 4. Identificación de las etapas en 2D9. El asterisco marca la hojita amarilla.',10)
p(566,'8. En la foto en color se clasificó cada pieza como amarilla cuando al menos la mitad de sus píxeles presentó un tono HSV entre 18 y 32 y saturación de 50 o más (escala OpenCV). El porcentaje por pieza queda en la planilla. Los colores intermedios son sensibles al umbral y a la iluminación.')
res=areas(next(r for r in results if r['foto']=='2D9'))
p(656,'En 2D9, la suma de VC a V8 fue de '+fmt(res[0])+' cm². Al excluir VC se obtuvieron '+fmt(res[1])+' cm². Al excluir las hojas predominantemente amarillas se obtuvieron '+fmt(res[2])+' cm². Al aplicar ambas exclusiones quedaron '+fmt(res[3])+' cm².')
p(742,'La comparación de grupos usa promedios por foto y distingue el bloque, la cantidad de hojitas VC visibles y cuántas de ellas fueron amarillas.')
c.save()
with zipfile.ZipFile(dest/'Codigo de medicion.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in ['_medir.py','_ajustar.py','_libro.mjs','_etapas.py','_repartir.py','_color.py','_comparar.py','_comparacion.mjs','_etapas/asignaciones.json','_etapas/conteos.json','_etapas/comparacion.json']:z.write(f)
    for f in Path('_final').glob('*.json'):z.write(f)
    for f in Path('_revision').glob('*.json'):z.write(f);z.write(f.with_suffix('.jpg'))
pdf=pypdfium2.PdfDocument(str(file));out=Image.new('RGB',(600,1275),'white')
for i,pg in enumerate(pdf):
    im=pg.render(scale=.5).to_pil();out.paste(im,(i%2*300,i//2*425))
out.save('_revision/informe.png')
