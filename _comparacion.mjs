import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const rows=JSON.parse(await fs.readFile('_etapas/comparacion.json','utf8'));
const wb=Workbook.create(),sh=wb.worksheets.add('Por foto'),grp=wb.worksheets.add('Comparación'),dt=wb.worksheets.add('Por hojita'),note=wb.worksheets.add('Criterios');
const st=['VC','V1','V2','V3','V4','V5','V6','V7','V8'];
function top(s,r,t){s.getRange(r).merge();s.getRange(r.split(':')[0]).values=[[t]];let f=s.getRange(r).format;f.fill='#205749';f.font.color='#FFFFFF';f.font.bold=true;f.rowHeight=29;}
function hdr(s,r,v){let a=s.getRange(r);a.values=[v];a.format.fill='#deeee4';a.format.font.bold=true;a.format.rowHeight=32;a.format.wrapText=true;}
top(sh,'A1:T1','Área foliar hasta V8 por foto · valores en cm²');
sh.getRange('A2:T2').merge();sh.getRange('A2').values=[['VC vacío = sin hojita identificada bajo el rótulo VC. Los cuatro totales usan únicamente las etapas VC a V8.']];
hdr(sh,'A4:T4',['Bloque','Foto','Hojitas VC','VC amarillas','Amarillas en VC–V8',...st,'Con todas','Sin VC','Sin amarillas','Sin VC ni amarillas','Grupo VC','Observación']);
top(dt,'A1:J1','Conteo y color de cada pieza visible');hdr(dt,'A4:J4',['Bloque','Foto','Etapa','Pieza','Píxeles','Escala px/cm','Área cm²','Fracción amarilla','Amarilla','Área sin amarillas']);
let next=5;const data=[],gform=[],jform=[],groups=new Set();
for(let i=0;i<rows.length;i++){
 const r=rows[i],f=i+5,p=r.piezas,b=Number(r.foto[0]),start=next;
 const yellowVC=p.filter(x=>x.stage==='VC'&&x.amarilla).length;
 const g=r.vc===0?'Sin VC':r.vc+' VC · '+yellowVC+' amarilla'+(yellowVC===1?'':'s');
 groups.add(b+'|'+g);
 const obs=[];if(r.foto==='3A5')obs.push('Dos piezas amarillentas con papel V1.');if(r.contacto.length)obs.push('Límite estimado por contacto: '+r.contacto.map(k=>st[k-1]).join(', ')+'.');
 sh.getRange('A'+f+':E'+f).values=[[b,r.foto+'.jpg',r.vc,yellowVC,p.filter(x=>x.amarilla).length]];
 sh.getRange('S'+f+':T'+f).values=[[g,obs.join(' ')]];
 for(const s of st){
    const items=p.filter(x=>x.stage===s);if(!items.length)continue;const first=next;
    for(const piece of items){
        data.push([b,r.foto+'.jpg',s,piece.piece,piece.px,r.escala,null,piece.frac,piece.amarilla?'Sí':'No',null]);
        gform.push(['=E'+next+'/F'+next+'^2']);jform.push(['=IF(I'+next+'="Sí",0,G'+next+')']);next++;
    }
    const col=String.fromCharCode(70+st.indexOf(s));sh.getRange(col+f).formulas=[["=SUM('Por hojita'!G"+first+":G"+(next-1)+")"]];
 }
 sh.getRange('O'+f+':R'+f).formulas=[['=SUM(F'+f+':N'+f+')','=SUM(G'+f+':N'+f+')',"=SUM('Por hojita'!J"+start+":J"+(next-1)+")","=SUM('Por hojita'!J"+(start+r.vc)+":J"+(next-1)+")"]];
}
dt.getRange('A5:J'+(next-1)).values=data;dt.getRange('G5:G'+(next-1)).formulas=gform;dt.getRange('J5:J'+(next-1)).formulas=jform;
dt.getRange('G5:G'+(next-1)).setNumberFormat('0.0');dt.getRange('J5:J'+(next-1)).setNumberFormat('0.0');dt.getRange('H5:H'+(next-1)).setNumberFormat('0.0%');dt.getRange('F5:F'+(next-1)).setNumberFormat('0.000');
top(grp,'A1:G1','Comparación por bloque, cantidad de VC y color');grp.getRange('A2:G2').merge();grp.getRange('A2').values=[['Cada valor de área es un promedio en cm² por foto. La columna Fotos indica el tamaño de cada grupo.']];
hdr(grp,'A4:G4',['Bloque','Grupo VC','Fotos','Con todas','Sin VC','Sin amarillas','Sin VC ni amarillas']);
let j=5;
for(const key of [...groups].sort()){
 const [b,g]=key.split('|');grp.getRange('A'+j+':B'+j).values=[[Number(b),g]];
 const filters="'Por foto'!A5:A134,A"+j+",'Por foto'!S5:S134,B"+j;
 grp.getRange('C'+j+':G'+j).formulas=[['=COUNTIFS('+filters+')',...['O','P','Q','R'].map(c=>"=SUMIFS('Por foto'!"+c+"5:"+c+"134,"+filters+")/C"+j)]];j++;
}
grp.getRange('D5:G'+(j-1)).setNumberFormat('#,##0.0');
top(note,'A1:E1','Criterios de lectura');
const lines=[
'La etapa se asignó por el papelito cercano. Se incluyeron únicamente los rótulos VC, V1, V2, V3, V4, V5, V6, V7 y V8. Los rótulos compuestos, por ejemplo V4-1, quedan fuera de los cuatro totales.',
'Se contó cada hojita VC visible. Si el papel corresponde a dos piezas, ambas contribuyen al área de VC. Una celda vacía señala que no se identificó una pieza con ese rótulo.',
'El color se evaluó por hojita sobre la foto en color, antes de dibujar las marcas. Se consideró amarilla si al menos el 50 % de su superficie presentó tono HSV de OpenCV entre 18 y 32 y saturación de 50 o más.',
'El porcentaje amarillo de cada pieza permite revisar las hojas de color intermedio. La iluminación y el balance de blancos afectan esta clasificación fotográfica.',
'Sin amarillas excluye la superficie completa de cada pieza amarilla. Sin VC excluye todas las piezas VC. Sin VC ni amarillas aplica ambos criterios una sola vez.',
'El área en cm² se calculó con los píxeles de la máscara de la foto y su escala. Las fronteras entre hojas que se tocan se estimaron a partir de la distancia al borde. En pares de VC se localizó el estrechamiento o el espacio entre las hojitas.',
'En 3A5 el papel próximo a dos piezas amarillentas dice V1. Se mantuvo ese rótulo. Cada asterisco de las fotos marca una pieza clasificada como amarilla.',
'Los promedios de Comparación son descriptivos. Cada foto pesa una vez dentro de su grupo y bloque.'
];
for(let i=0;i<lines.length;i++){let r=i+3;note.getRange('A'+r+':E'+r).merge();note.getRange('A'+r).values=[[lines[i]]];note.getRange('A'+r+':E'+r).format.wrapText=true;note.getRange('A'+r+':E'+r).format.rowHeight=48;}
note.getRange('A:E').format.columnWidth=23;sh.getRange('A:T').format.columnWidth=15;sh.getRange('S:S').format.columnWidth=25;sh.getRange('T:T').format.columnWidth=67;sh.getRange('F5:R134').setNumberFormat('#,##0.0');
dt.getRange('A:J').format.columnWidth=18;grp.getRange('A:G').format.columnWidth=21;grp.getRange('B:B').format.columnWidth=29;
for(const s of [sh,dt,grp])s.freezePanes.freezeRows(4);
const saved=await SpreadsheetFile.exportXlsx(wb);await saved.save('outputs/medicion-foliar/Area foliar VC a V8.xlsx');
