"use strict";
const cmp=id=>document.getElementById(id);
const comparePanel=document.createElement("section");
comparePanel.id="comparador";
comparePanel.className="panel";
comparePanel.innerHTML=`<div class="bar"><h2>Comparador del ensayo</h2><button id="cmpExport">Descargar lámina PNG · 4K</button></div>
<p id="cmpScope" class="hint"></p><div class="leaf-nav"><label>Comparar por<select id="cmpMode"><option value="id">Maceta</option><option value="cruce">Tratamiento dentro de cada suelo</option></select></label><label>Selección A<select id="cmpA"></select></label><label>Selección B<select id="cmpB"></select></label></div>
<div id="cmpCards"></div><p id="cmpDelta"></p><output id="cmpStatus"></output>
<details open><summary>Medias por tratamiento dentro de cada suelo</summary><label>Variable para las gráficas <select id="cmpVar"></select></label><div id="cmpBars"></div><div id="cmpMeans" class="scroll"></div><div id="cmpNormalPlot"></div></details>
<details open><summary>Elegir por altura o área foliar</summary><div class="leaf-nav"><label>Ordenar por<select id="cmpOrder"><option value="alta">Mayor altura</option><option value="baja">Menor altura</option><option value="grande">Mayor área foliar</option><option value="chica">Menor área foliar</option></select></label><label>Plantas del filtro<select id="cmpRank"></select></label><label>Asignar al lado<select id="cmpSide"><option>A</option><option>B</option></select></label><button id="cmpUse">Usar planta</button></div></details>
<details open><summary>Relación con el área foliar por maceta</summary><label>Eje vertical <select id="cmpX"></select></label><p class="hint">Elegí un punto para ver la ficha y asignar la maceta al lado indicado.</p><div id="cmpPlot"></div><div class="legend" id="cmpLegend"></div></details>
<details><summary>Distribución por suelo</summary><div id="cmpDistribucion"></div></details><details><summary>Variación sobre la mesada</summary><div class="leaf-nav"><label>Colorear por<select id="cmpMetric"><option value="altura">Altura (cm)</option><option value="area">Área foliar (cm²)</option></select></label><span id="cmpScale"></span></div><div id="cmpMaps"></div><p class="hint">A junto a las ventanas laterales · H junto al pasillo. Desde la puerta hacia las ventanas traseras, los bloques siguen el orden 3, 2 y 1.</p></details>`;
cmp("area-foliar").before(comparePanel);
const compareLink=document.createElement("a");compareLink.href="#comparador";compareLink.textContent="Comparador";document.querySelector(".portal-nav").append(compareLink);
const codes={BIO1:"Hormonal",BIO2:"Trichoderma",BIO3:"Aminoácidos",TESTIGO:"Testigo"};
const fotosComparacion={}, cargasComparacion=new Map();
let cmpData=[],cmpGroups=new Map(),ultimaMaceta="",compareVersion=0;
const cnum=n=>Number.isFinite(n)?n.toLocaleString("es-AR",{maximumFractionDigits:2}):"—";
function opciones(el,values,old,backup){
 el.replaceChildren(...values.map(([key,label])=>new Option(label,key)));
 el.value=values.some(([key])=>key===old)?old:(backup||values[0]?.[0]||"");
}
function actualizarComparador(group){
 cmpData=group.map(d=>({...d,tratamiento:codes[d.tratamiento]||d.tratamiento,peso:PRELIMINARES[d.id].hojas_g,area:FOLIAR[d.id]?.total}));
 const plant=cmp("plant").value;
 actualizarGrupos(plant&&plant!==ultimaMaceta?plant:null);
 ultimaMaceta=plant;
 cmp("cmpScope").textContent=alcance();
 dibujarMedias();distribucionComparador();
 ordenarComparador();graficoComparador();mapaComparador();
}
const variablesGrupo={
 altura:["Altura","cm",d=>d.altura],area:["Área foliar","cm²",d=>d.area],
 peso:["Peso seco de hojas","g",d=>d.peso],raiz:["Volumen de raíces","mL",d=>PRELIMINARES[d.id].raiz_ml],
 nudos:["Nudos totales","nudos",d=>PRELIMINARES[d.id].nudos],
 pimpollos:["Pimpollos","pimpollos",d=>PRELIMINARES[d.id].eventos.reduce((n,e)=>n+e.pimpollos,0)],
 flores:["Flores","flores",d=>PRELIMINARES[d.id].eventos.reduce((n,e)=>n+e.flores,0)],
 afe:["Área foliar específica","cm²/g",d=>d.peso>0?PRELIMINARES[d.id].area_cm2/d.peso:null]
};
for(const [k,[nombre,unidad]] of Object.entries(variablesGrupo))cmp("cmpVar").add(new Option(nombre+" ("+unidad+")",k));
for(const key of ["altura","peso","raiz","nudos","pimpollos","flores"]){
 const [nombre,unidad]=variablesGrupo[key];
 cmp("cmpX").add(new Option(nombre+" ("+unidad+")",key));
}
function dibujarMedias(){
 const [nombre,unidad,valor]=variablesGrupo[cmp("cmpVar").value];
 const paneles=["Pobre","Rico"].map(suelo=>{
  const filas=Object.keys(palette).map(tr=>{
   const ds=cmpData.filter(d=>d.tratamiento===tr&&d.sueloTipo===suelo);
   return {tr,...resumen(ds.map(d=>({v:valor(d)})),"v")};
  }).filter(f=>f.n);
  return {suelo,filas};
 }).filter(p=>p.filas.length);
 const max=Math.max(1,...paneles.flatMap(p=>p.filas.map(f=>f.media)));
 cmp("cmpBars").innerHTML=paneles.map(({suelo,filas})=>'<section><h3>Suelo '+suelo.toLowerCase()+'</h3><p>'+nombre+' · media en '+unidad+'</p>'+filas.map(f=>'<div class="mediaBar"><span>'+f.tr+'</span><i><b style="width:'+100*f.media/max+'%;background:'+palette[f.tr]+'"></b></i><strong>'+cnum(f.media)+'</strong></div>').join("")+'</section>').join("");
 cmp("cmpMeans").innerHTML=paneles.map(({suelo,filas})=>'<table><caption>Suelo '+suelo.toLowerCase()+' · '+nombre+' ('+unidad+')</caption><thead><tr><th>Tratamiento</th><th>Macetas</th><th>Media</th><th>DE</th></tr></thead><tbody>'+filas.map(f=>'<tr><td>'+f.tr+'</td><td>'+f.n+'</td><td>'+cnum(f.media)+'</td><td>'+cnum(f.de)+'</td></tr>').join("")+'</tbody></table>').join("")+(paneles.length?'<p class="hint">Ambas gráficas parten de cero y comparten escala. DE muestral entre macetas del mismo suelo y tratamiento.</p>':'Sin datos para estos filtros.');
 dibujarCurvasNormales();
}
function dibujarCurvasNormales(){
 const variable={altura:"altura",area:"area",peso:"peso",raiz:"raiz",nudos:"nudos",pimpollos:"pimpollos",flores:"flores",afe:"areaEspecifica"}[cmp("cmpVar").value]||"altura";
 renderCurvaAltura(cmp("cmpNormalPlot"),cmpData,{variableKey:variable,onSelect:p=>seleccionarComparada(p.id)});
}
cmp("cmpVar").onchange=()=>{dibujarMedias();distribucionComparador()};
function alcance(){
 return ["block","treatment","soil","row","column","measurement"].map(k=>cmp(k).selectedOptions[0]?.textContent).filter(Boolean).join(" · ")+" · "+cmpData.length+" macetas";
}
function actualizarGrupos(id){
 const mode=cmp("cmpMode").value;cmpGroups=new Map();
 for(const d of cmpData){
  const key=mode==="cruce"?"Suelo "+d.sueloTipo.toLowerCase()+" · "+d.tratamiento:d[mode];
  if(!cmpGroups.has(key))cmpGroups.set(key,[]);
  cmpGroups.get(key).push(d);
 }
 const values=[...cmpGroups.keys()].sort((a,b)=>a.localeCompare(b,"es",{numeric:true})).map(k=>[k,k]);
 const a=cmp("cmpA"),b=cmp("cmpB"),anteriorB=b.value;
 opciones(a,values,a.value);opciones(b,values,anteriorB,values.find(([k])=>k!==a.value)?.[0]);
 if(id&&mode==="id"&&cmpGroups.has(id))cmp("cmp"+cmp("cmpSide").value).value=id;
 mostrarComparacion();
}
function resumen(ds,key){
 const nums=ds.map(d=>d[key]).filter(Number.isFinite),n=nums.length;
 const media=n?nums.reduce((a,b)=>a+b,0)/n:null;
 const de=n>1?Math.sqrt(nums.reduce((s,v)=>s+(v-media)**2,0)/(n-1)):null;
 return {n,media,de};
}
function lado(letter){
 const nombre=cmp("cmp"+letter).value,ds=cmpGroups.get(nombre)||[];
 return {nombre,ds,h:resumen(ds,"altura"),a:resumen(ds,"area")};
}
function textoDiferencia(a,b){
 const dif=(k,u)=>Number.isFinite(a[k].media)&&Number.isFinite(b[k].media)?cnum(b[k].media-a[k].media)+" "+u:"—";
 return "Diferencia B − A"+(cmp("cmpMode").value==="id"?"":" entre medias")+" · Altura "+dif("h","cm")+" · Área foliar "+dif("a","cm²");
}
function lineaMedida(v,unidad,grupo){
 return cnum(v.media)+" "+unidad+(grupo?" · DE "+cnum(v.de)+" · n = "+v.n:"");
}
function calibracionPar(a,b){
 const pair=[a,b].map(v=>PLANTAS.find(d=>d.id===v.nombre));
 if(cmp("cmpMode").value!=="id"||!pair.every(d=>d&&corrections[d.id]))return null;
 const dims=pair.map(d=>{
  const p=points(d),[l,t,r,b]=d.caja,k=d.altura/(p.suelo[1]-p.nudo[1]);
  return {id:d.id,w:(r-l)*k,h:(b-t)*k,foot:(p.apoyo[1]-t)*k};
 });
 if(!dims.every(d=>d.w>0&&d.h>0&&d.foot>0))return null;
 const above=Math.max(...dims.map(d=>d.foot)),below=Math.max(...dims.map(d=>d.h-d.foot));
 return {dims,above,height:above+below,width:Math.max(...dims.map(d=>d.w))};
}
function mostrarComparacion(){
 const a=lado("A"),b=lado("B"),group=cmp("cmpMode").value!=="id",cal=calibracionPar(a,b);
 const version=++compareVersion;
 cmp("cmpCards").replaceChildren();cmp("cmpStatus").textContent="";
 cmp("cmpExport").disabled=!a.ds.length||!b.ds.length;
 cmp("cmpDelta").textContent=a.ds.length&&b.ds.length?textoDiferencia(a,b):"Sin macetas para estos filtros.";
 for(const [index,v] of [a,b].entries()){
  if(!v.ds.length)continue;
  const card=document.createElement("article"),d=v.ds[0];
  card.innerHTML="<h3></h3><p class='hint'></p><p></p><p></p>";
  card.children[0].textContent=(index?"B":"A")+" · "+v.nombre;
  card.children[1].textContent=group?v.ds.length+" macetas":"Bloque "+d.id[0]+" · "+d.tratamiento+" · Suelo "+d.sueloTipo.toLowerCase();
  card.children[2].textContent=(group?"Altura media":"Altura")+" · "+lineaMedida(v.h,"cm",group);
  card.children[3].textContent=(group?"Área foliar media":"Área foliar")+" · "+lineaMedida(v.a,"cm²",group);
  if(!group){
   const frame=document.createElement("div");frame.className="cmpPhotos";
   const sources=[FOLIAR[d.id]?.originalPlanta?"foliar/plantas/"+d.id+".jpg":null,"foliar/contornos/"+d.id+".jpg"];
   for(const [i,src] of sources.entries()){
    const fig=document.createElement("figure"),cap=document.createElement("figcaption");
    cap.textContent=i?"Hojas medidas":src?(cal?"Planta a escala común":"Planta · escala individual"):"Foto de planta pendiente";fig.append(cap);
    if(src){const im=new Image();im.alt=cap.textContent+" "+d.id;fotoEn(im,d.id,i?'contornos':'planta');fig.append(im);
     if(cal&&!i){const canvas=document.createElement("canvas");canvas.width=320;canvas.height=320;im.replaceWith(canvas);
      imagenesLamina(d.id).then(imgs=>{if(version===compareVersion)dibujarPar(canvas.getContext("2d"),imgs.planta,cal,index,0,0,320,320)}).catch(()=>{canvas.replaceWith(im);cap.textContent="Planta · escala individual"});}
    }
    frame.append(fig);
   }
   card.append(frame);
  }
  cmp("cmpCards").append(card);
 }
}
function ordenarComparador(){
 const order=cmp("cmpOrder").value,area=["grande","chica"].includes(order),key=area?"area":"altura";
 const signo=["alta","grande"].includes(order)?-1:1;
 const sorted=cmpData.filter(d=>Number.isFinite(d[key])).sort((a,b)=>signo*(a[key]-b[key])||a.id.localeCompare(b.id,"es",{numeric:true}));
 let rank=0;
 opciones(cmp("cmpRank"),sorted.map((d,i)=>{if(!i||d[key]!==sorted[i-1][key])rank=i+1;return [d.id,rank+". "+d.id+" · "+cnum(d[key])+(area?" cm²":" cm")]}));
 cmp("cmpUse").disabled=!sorted.length;
}
function seleccionarComparada(id){
 if(!cmpData.some(d=>d.id===id))return;
 cmp("cmpMode").value="id";cmp("plant").value=id;ultimaMaceta="";refresh();
}
function graficoComparador(){
 const [nombre,unidad,valor]=variablesGrupo[cmp("cmpX").value];
 const data=cmpData.map(d=>({...d,y:valor(d)})).filter(d=>Number.isFinite(d.y)&&Number.isFinite(d.area));
 const svg=cmp("cmpPlot"),maxX=Math.max(1,...data.map(d=>d.area))*1.05,maxY=Math.max(1,...data.map(d=>d.y))*1.05;
 let s='<g fill="#34594b" font-size="14"><text x="62" y="19">'+nombre+' ('+unidad+')</text><text x="337" y="299" text-anchor="middle">Área foliar (cm²)</text>';
 for(let i=0;i<=4;i++){
  const x=61+i*138,y=252-i*55;
  s+='<path d="M61 '+y+' H613 M'+x+' 32 V252" stroke="#dae5dd"/><text x="54" y="'+(y+4)+'" text-anchor="end">'+cnum(i*maxY/4)+'</text><text x="'+x+'" y="273" text-anchor="middle">'+cnum(Math.round(i*maxX/4))+'</text>';
 }
 svg.innerHTML=["Pobre","Rico"].filter(suelo=>data.some(d=>d.sueloTipo===suelo)).map(suelo=>{
  const puntos=data.filter(d=>d.sueloTipo===suelo).map(d=>{
   const etiqueta=d.id+" · "+d.tratamiento+" · "+cnum(d.area)+" cm² · "+cnum(d.y)+" "+unidad;
   return '<circle tabindex="0" role="button" aria-label="'+etiqueta+'" data-id="'+d.id+'" cx="'+(61+552*d.area/maxX)+'" cy="'+(252-220*d.y/maxY)+'" r="'+(d.id===cmp("plant").value?6:4.4)+'" fill="'+palette[d.tratamiento]+'" stroke="white"><title>'+etiqueta+'</title></circle>';
  }).join("");
  return '<h3>Suelo '+suelo.toLowerCase()+'</h3><svg viewBox="0 0 640 305" aria-label="'+nombre+' y área foliar en suelo '+suelo.toLowerCase()+'">'+s+'</g>'+puntos+'</svg>';
 }).join("");
 cmp("cmpLegend").innerHTML=[...new Set(data.map(d=>d.tratamiento))].map(t=>'<span><i class="dot" style="background:'+palette[t]+'"></i>'+t+'</span>').join("");
}
function distribucionComparador(){
 const [nombre,unidad,valor]=variablesGrupo[cmp("cmpVar").value];
 const valores=cmpData.map(valor).filter(Number.isFinite);
 const paso=Math.max(...valores,1)/6;
 const grupos=["Pobre","Rico"].map(suelo=>{
  const datos=cmpData.filter(d=>d.sueloTipo===suelo&&Number.isFinite(valor(d)));
  const bins=Array.from({length:6},()=>({}));
  for(const d of datos){
   const bin=bins[Math.min(5,Math.floor(valor(d)/paso))];
   bin[d.tratamiento]=(bin[d.tratamiento]||0)+1;
  }
  return {suelo,bins,n:datos.length};
 }).filter(g=>g.n);
 const total=bin=>Object.values(bin).reduce((a,b)=>a+b,0);
 const max=Math.max(1,...grupos.flatMap(g=>g.bins.map(total)));
 cmp("cmpDistribucion").innerHTML='<p class="hint">'+nombre+' · '+unidad+' · macetas por intervalo. Los colores indican tratamientos.</p>'+grupos.map(g=>{
  const barras=g.bins.map((bin,i)=>{
   const detalle=Object.entries(bin).map(([tr,n])=>tr+' '+n).join(' · ');
   const segmentos=Object.entries(bin).map(([tr,n])=>'<b style="width:'+n/max*100+'%;background:'+palette[tr]+'"></b>').join("");
   return '<div aria-label="'+detalle+'" title="'+detalle+'"><span>'+cnum(i*paso)+'–'+cnum((i+1)*paso)+'</span><i>'+segmentos+'</i><strong>'+total(bin)+'</strong></div>';
  }).join("");
  return '<h3>Suelo '+g.suelo.toLowerCase()+'</h3><div class="histograma">'+barras+'</div>';
 }).join("");
}
function mapaComparador(){
 const key=cmp("cmpMetric").value,units=key==="area"?" cm²":" cm",vals=cmpData.map(d=>d[key]).filter(Number.isFinite);
 const lo=Math.min(...vals),hi=Math.max(...vals);
 cmp("cmpScale").textContent=vals.length?"Claro "+cnum(lo)+units+" · Oscuro "+cnum(hi)+units:"Sin datos";
 const byId=new Map(cmpData.map(d=>[d.id,d]));
 cmp("cmpMaps").innerHTML=[...new Set(cmpData.map(d=>d.id[0]))].sort().reverse().map(n=>{
 let grid="<section><h3>Bloque "+n+"</h3><div class='cmpGrid'><span></span>";
 for(let i=1;i<=10;i++)grid+="<small>"+i+"</small>";
 for(const r of "ABCDEFGH"){grid+="<small>"+r+"</small>";for(let i=1;i<=10;i++){
 const d=byId.get(n+r+i);
 if(!d||!Number.isFinite(d[key])){grid+="<span></span>";continue;}
 const k=hi===lo?.5:(d[key]-lo)/(hi-lo),color="hsl(151 35% "+(94-68*k)+"%)";
 grid+='<button data-id="'+d.id+'" title="'+d.id+" · "+cnum(d[key])+units+'" aria-label="'+d.id+" · "+cnum(d[key])+units+'" style="background:'+color+";color:"+(k>.58?"white":"#12392b")+'">'+cnum(Math.round(d[key]))+"</button>";
 }}return grid+"</div></section>";
 }).join("");
}
cmp("cmpMode").onchange=()=>actualizarGrupos();
for(const side of ["A","B"])cmp("cmp"+side).onchange=mostrarComparacion;
cmp("cmpOrder").onchange=ordenarComparador;
cmp("cmpUse").onclick=()=>seleccionarComparada(cmp("cmpRank").value);
cmp("cmpMetric").onchange=mapaComparador;
cmp("cmpX").onchange=graficoComparador;
for(const id of ["cmpMaps","cmpPlot","cmpNormalPlot"]){
 cmp(id).onclick=e=>{const el=e.target.closest("[data-id]");if(el)seleccionarComparada(el.dataset.id)};
}
for(const id of ["cmpPlot","cmpNormalPlot"])cmp(id).onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}};
