import fs from 'node:fs/promises';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

const dir = '_final';
const output = 'outputs/medicion-foliar';
await fs.mkdir(output, {recursive:true});
const files = (await fs.readdir(dir)).filter(f=>f.endsWith('.json')).sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
const data = await Promise.all(files.map(async f=>JSON.parse(await fs.readFile(dir+'/'+f,'utf8'))));
if(data.length!==130 || data.some(r=>!r.escala || !r.pix)) throw Error('Faltan mediciones');
const wb=Workbook.create();
const summ=wb.worksheets.add('Resumen');
const detail=wb.worksheets.add('Mediciones');
function head(range){
  range.format.fill='#205748';
  range.format.font.color='#FFFFFF';
  range.format.font.bold=true;
  range.format.rowHeight=25;
}
summ.getRange('A1:D1').merge();
summ.getRange('A1').values=[['Área foliar visible por bloque']];
head(summ.getRange('A1:D1'));
summ.getRange('A3:D3').values=[['Bloque','Fotos','Área total (cm²)','Media por foto (cm²)']];
head(summ.getRange('A3:D3'));
summ.getRange('A4:A5').values=[[2],[3]];
for(const r of [4,5]){
  summ.getRange('B'+r+':D'+r).formulas=[['=COUNTIF(Mediciones!A5:A134,A'+r+')','=SUMIF(Mediciones!A5:A134,A'+r+',Mediciones!D5:D134)','=C'+r+'/B'+r]];
}
summ.getRange('A6').values=[['Ambos bloques']];
summ.getRange('B6:D6').formulas=[['=SUM(B4:B5)','=SUM(C4:C5)','=C6/B6']];
summ.getRange('A6:D6').format.font.bold=true;
summ.getRange('C4:D6').setNumberFormat('#,##0.0');
summ.getRange('A:D').format.columnWidth=23;
for(const [i,line] of [
  'Cada fila de Mediciones corresponde a una fotografía.',
  'El área se obtiene dividiendo los píxeles de hoja por el cuadrado de la escala en píxeles/cm.',
  'La escala se calibró con la regla de cada foto y se asumió uniforme sobre el tablero.',
  'Se mide la superficie proyectada visible. Las partes superpuestas u ocultas se cuentan una sola vez.',
  'La inclinación de la cámara, las hojas curvadas y las sombras pueden afectar la estimación.'
].entries()){
  const r=9+i;
  summ.getRange('A'+r+':D'+r).merge();
  summ.getRange('A'+r).values=[[line]];
  summ.getRange('A'+r+':D'+r).format.wrapText=true;
  summ.getRange('A'+r+':D'+r).format.rowHeight=31;
}
detail.getRange('A1:F1').merge();
detail.getRange('A1').values=[['Área foliar visible por fotografía']];
head(detail.getRange('A1:F1'));
detail.getRange('A2:F2').merge();
detail.getRange('A2').values=[['Origen: Escritorio / FOTOS / Area foliar / carpeta del bloque / archivo JPG']];
detail.getRange('A4:F4').values=[['Bloque','Serie','Foto','Área visible (cm²)','Píxeles de hoja','Escala (px/cm)']];
head(detail.getRange('A4:F4'));
detail.getRange('A5:F134').values=data.map(r=>[Number(r.foto[0]),r.foto[1],r.foto+'.jpg',null,r.pix,r.escala]);
detail.getRange('D5:D134').formulas=data.map((_,i)=>['=E'+(i+5)+'/F'+(i+5)+'^2']);
detail.getRange('D5:D134').setNumberFormat('#,##0.0');
detail.getRange('F5:F134').setNumberFormat('0.000');
detail.getRange('A:F').format.columnWidth=20;
detail.freezePanes.freezeRows(4);
const preview=await wb.render({sheetName:'Resumen',range:'A1:D13',scale:1});
await fs.writeFile('_vista.png',new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(output+'/Area foliar.xlsx');
console.log(summ.getRange('A4:D6').values);
