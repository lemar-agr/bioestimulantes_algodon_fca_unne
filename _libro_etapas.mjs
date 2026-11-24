import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const rows=JSON.parse(await fs.readFile('_etapas/resultados.json','utf8'));
if(rows.length!==130)throw Error('Faltan fotos');
const wb=Workbook.create(),sh=wb.worksheets.add('Área por etapa'),raw=wb.worksheets.add('Píxeles'),guide=wb.worksheets.add('Lectura');
const stages=['VC','V1','V2','V3','V4','V5','V6','V7','V8'];
function title(sh,r,s){sh.getRange(r).merge();sh.getRange(r.split(':')[0]).values=[[s]];sh.getRange(r).format.fill='#215849';sh.getRange(r).format.font.color='#FFFFFF';sh.getRange(r).format.font.bold=true;sh.getRange(r).format.rowHeight=27;}
function header(sh,r){sh.getRange(r).format.fill='#d8e8db';sh.getRange(r).format.font.bold=true;sh.getRange(r).format.rowHeight=30;}
title(sh,'A1:P1','Área foliar visible por foto y etapa (cm²)');
sh.getRange('A2:P2').merge();sh.getRange('A2').values=[['Una celda vacía indica que no se identificó una hoja con ese rótulo. El remanente queda fuera de las nueve etapas asignadas.']];
sh.getRange('A4:P4').values=[['Bloque','Foto',...stages,'Suma VC–V8','Remanente','Total foto','Diferencia¹','Observación']];
header(sh,'A4:P4');
title(raw,'A1:N1','Máscara original distribuida por etapa');
raw.getRange('A4:N4').values=[['Foto','Escala px/cm',...stages,'Remanente px','Píxeles totales','Bloque']];
header(raw,'A4:N4');
const names=['C','D','E','F','G','H','I','J','K'];
for(let j=0;j<rows.length;j++){
 const r=j+5,dt=rows[j],photo=dt.foto,b=Number(photo[0]);
 raw.getRange('A'+r+':N'+r).values=[[photo,dt.escala,...dt.pix.slice(1).map(x=>x||null),dt.pix[0],dt.total,b]];
 sh.getRange('A'+r+':B'+r).values=[[b,photo+'.jpg']];
 for(let k=0;k<9;k++){if(dt.pix[k+1]){let col=names[k];sh.getRange(col+r).formulas=[["='Píxeles'!"+col+r+"/'Píxeles'!$B"+r+"^2"]];}}
 sh.getRange('L'+r+':O'+r).formulas=[['=SUM(C'+r+':K'+r+')',"='Píxeles'!L"+r+"/'Píxeles'!B"+r+"^2","='Píxeles'!M"+r+"/'Píxeles'!B"+r+"^2",'=ROUND(N'+r+'-L'+r+'-M'+r+',8)']];
 let obs=[];if(!dt.pix[1])obs.push('VC sin identificar');if(dt.contacto.length)obs.push('Contacto estimado en '+dt.contacto.map(k=>stages[k-1]).join(', '));
 if(photo==='3A5')obs.push('Dos piezas junto al rótulo V1');
 sh.getRange('P'+r).values=[[obs.join('. ')]];
}
sh.getRange('A:O').format.columnWidth=15;sh.getRange('P:P').format.columnWidth=69;
raw.getRange('A:N').format.columnWidth=16;raw.getRange('B5:B134').setNumberFormat('0.00000');
sh.getRange('C5:O134').setNumberFormat('#,##0.0');
sh.freezePanes.freezeRows(4);raw.freezePanes.freezeRows(4);
title(guide,'A1:E1','Cómo leer las mediciones');guide.getRange('A:E').format.columnWidth=23;
const hints=[
'Cada fila corresponde al JPG indicado. Se conservaron los bloques 2 y 3.',
'VC y V1 a V8 reproducen los rótulos visibles junto a las hojas. Se revisaron su posición y el orden de lectura dentro de las filas.',
'Si un rótulo cubre dos piezas, se suma el área visible de ambas. Una celda vacía representa una etapa sin identificar en esa foto.',
'El remanente reúne las hojas sin asignación a VC–V8 y cualquier píxel residual de la máscara original. Su valor no identifica una etapa posterior específica.',
'Cuando dos zonas asignadas se tocan, su límite se estima con una separación basada en la distancia al borde. Las etapas afectadas se indican en Observación.',
'La hoja Píxeles contiene los conteos y la escala de la foto. El área en cm² se calcula dividiendo los píxeles por la escala al cuadrado.',
'¹ Diferencia = total de la foto menos suma VC–V8 menos remanente. Un cero comprueba que todos los píxeles de la medición inicial están contabilizados.',
'En las imágenes de control, los textos VC a V8 identifican las hojas asignadas. El gris corresponde al remanente. Las etiquetas digitales están sobre una sola pieza cuando se agrupan varias.'
];
for(let i=0;i<hints.length;i++){let r=i+3;guide.getRange('A'+r+':E'+r).merge();guide.getRange('A'+r).values=[[hints[i]]];guide.getRange('A'+r+':E'+r).format.wrapText=true;guide.getRange('A'+r+':E'+r).format.rowHeight=39;}
const result=await SpreadsheetFile.exportXlsx(wb);await result.save('outputs/medicion-foliar/Area foliar por etapa.xlsx');
