"use strict";
const cmp=id=>document.getElementById(id);
const comparePanel=document.createElement("section");
comparePanel.id="comparador";
comparePanel.className="panel";
comparePanel.innerHTML=`<div class="bar"><h2>Comparador del ensayo</h2><button id="cmpExport">Descargar lámina PNG · 4K</button></div>
<p id="cmpScope" class="hint"></p><div class="leaf-nav"><label>Comparar por<select id="cmpMode"><option value="id">Maceta</option><option value="tratamiento">Tratamiento</option><option value="sueloTipo">Tipo de suelo</option><option value="cruce">Tratamiento × suelo</option></select></label><label>Selección A<select id="cmpA"></select></label><label>Selección B<select id="cmpB"></select></label></div>
<div id="cmpCards"></div><p id="cmpDelta"></p><output id="cmpStatus"></output>
<details open><summary>Medias por tratamiento y por suelo</summary><div id="cmpMeans" class="scroll"></div></details>
<details open><summary>Elegir por altura o área foliar</summary><div class="leaf-nav"><label>Ordenar por<select id="cmpOrder"><option value="alta">Mayor altura</option><option value="baja">Menor altura</option><option value="grande">Mayor área foliar</option><option value="chica">Menor área foliar</option></select></label><label>Plantas del filtro<select id="cmpRank"></select></label><label>Asignar al lado<select id="cmpSide"><option>A</option><option>B</option></select></label><button id="cmpUse">Usar planta</button></div></details>
<details open><summary>Altura y área foliar por maceta</summary><p class="hint">Elegí un punto para ver la ficha y asignar la maceta al lado indicado.</p><svg id="cmpPlot" viewBox="0 0 640 305" aria-label="Altura según la fecha y área foliar total por maceta"></svg><div class="legend" id="cmpLegend"></div></details>
<details open><summary>Variación sobre la mesada</summary><div class="leaf-nav"><label>Colorear por<select id="cmpMetric"><option value="altura">Altura (cm)</option><option value="area">Área foliar (cm²)</option></select></label><span id="cmpScale"></span></div><div id="cmpMaps"></div><p class="hint">A junto a las ventanas laterales · H junto al pasillo. Desde la puerta hacia las ventanas traseras, los bloques siguen el orden 3, 2 y 1.</p></details>`;
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
 cmpData=group.map(d=>({...d,tratamiento:codes[d.tratamiento]||d.tratamiento,area:FOLIAR[d.id]?.total}));
 const plant=cmp("plant").value;
 actualizarGrupos(plant&&plant!==ultimaMaceta?plant:null);
 ultimaMaceta=plant;
 cmp("cmpScope").textContent=alcance();
 const tables=["tratamiento","sueloTipo"].map(key=>{
  const groups=new Map();
  for(const d of cmpData){const k=d[key];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)}
  const body=[...groups].map(([name,ds])=>{
   const h=resumen(ds,"altura"),a=resumen(ds,"area");
   return "<tr>"+[name,h.n,cnum(h.media),cnum(h.de),a.n,cnum(a.media),cnum(a.de)].map(v=>"<td>"+v+"</td>").join("")+"</tr>";
  }).join("");
  return "<table><thead><tr><th>"+(key==="tratamiento"?"Tratamiento":"Suelo")+"</th><th colspan='3'>Altura (cm)</th><th colspan='3'>Área foliar (cm²)</th></tr><tr><th>Grupo</th><th>n</th><th>Media</th><th>DE</th><th>n</th><th>Media</th><th>DE</th></tr></thead><tbody>"+body+"</tbody></table>";
 });
 cmp("cmpMeans").innerHTML=tables.join("")+"<p class='hint'>DE muestral entre macetas. El área foliar corresponde a la medición de hojas de cada planta y se mantiene al cambiar la fecha de altura.</p>";
 ordenarComparador();graficoComparador();mapaComparador();
}
function alcance(){
 return ["block","treatment","soil","row","column","measurement"].map(k=>cmp(k).selectedOptions[0]?.textContent).filter(Boolean).join(" · ")+" · "+cmpData.length+" macetas";
}
function actualizarGrupos(id){
 const mode=cmp("cmpMode").value;cmpGroups=new Map();
 for(const d of cmpData){
  const key=mode==="cruce"?d.tratamiento+" · "+d.sueloTipo:d[mode];
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
 const data=cmpData.filter(d=>Number.isFinite(d.altura)&&Number.isFinite(d.area));
 const svg=cmp("cmpPlot"),maxX=Math.max(1,...data.map(d=>d.altura))*1.05,maxY=Math.max(1,...data.map(d=>d.area))*1.05;
 let s='<g fill="#34594b" font-size="12"><text x="55" y="17">Área foliar total (cm²)</text><text x="318" y="299">Altura (cm)</text>';
 for(let i=0;i<=4;i++){const x=61+i*138,y=252-i*55;
 s+='<path d="M61 '+y+' H613 M'+x+' 32 V252" stroke="#dae5dd"/><text x="54" y="'+(y+4)+'" text-anchor="end">'+cnum(Math.round(i*maxY/4))+'</text><text x="'+x+'" y="273" text-anchor="middle">'+cnum(i*maxX/4)+'</text>';}
 svg.innerHTML=s+"</g>"+data.map(d=>'<circle tabindex="0" role="button" aria-label="'+d.id+' · '+cnum(d.altura)+' cm · '+cnum(d.area)+' cm²" data-id="'+d.id+'" cx="'+(61+552*d.altura/maxX)+'" cy="'+(252-220*d.area/maxY)+'" r="'+(d.id===cmp("plant").value?6:4.4)+'" fill="'+palette[d.tratamiento]+'" stroke="'+(d.id===cmp("plant").value?"black":"white")+'"><title>'+d.id+" · "+d.tratamiento+" · "+cnum(d.altura)+" cm · "+cnum(d.area)+" cm²</title></circle>").join("");
 cmp("cmpLegend").innerHTML=[...new Set(data.map(d=>d.tratamiento))].map(t=>'<span><i class="dot" style="background:'+palette[t]+'"></i>'+t+'</span>').join("");
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
for(const id of ["cmpMaps","cmpPlot"]){
 cmp(id).onclick=e=>{const el=e.target.closest("[data-id]");if(el)seleccionarComparada(el.dataset.id)};
}
cmp("cmpPlot").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}};
