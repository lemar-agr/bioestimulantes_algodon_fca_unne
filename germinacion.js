"use strict";
(() => {
 const $g=id=>document.getElementById(id);
 const tratamientos={
  testigo:["Testigo","#606c76"],bio1:["BIO1 · Hormonal","#b93840"],
  bio2:["BIO2 · Trichoderma","#24764e"],bio3:["BIO3 · Aminoácidos","#2368aa"]
 };
 const estados={env:"Envejecidas",sin:"Sin envejecer"};
 const variables=[
  [5,"emergencia","Día 5 · Emergencia visible","%","Semillas con tejido emergido visible por cada 50 sembradas."],
  [12,"emergencia","Día 12 · PG por emergencia","%","Semillas con emergencia visible, incluidas las de aspecto normal y dudoso."],
  [12,"normalidad","Día 12 · Aspecto normal","%","Indicador morfológico complementario. Plántulas de aspecto normal por cada 50 semillas sembradas."],
  [5,"eje","Día 5 · Eje visible","cm","Longitud media del eje visible entre las semillas con emergencia."],
  [12,"raiz","Día 12 · Raíz principal","cm","Longitud media de la raíz principal en la submuestra medida."]
 ];
 const fmt=new Intl.NumberFormat("es-AR",{maximumFractionDigits:2});
 const variable=$g("germVariable"),tratamiento=$g("germTratamiento"),estado=$g("germEstado"),rep=$g("germRep"),diaFoto=$g("germDia"),seccionGerm=$g("germinacion");
 const tabNames={germResults:"Resultados",germMeans:"Medias",germBandejas:"Bandejas",germDesign:"Diseno",germMetodo:"Criterios"};
 const germTabs=Object.keys(tabNames);
 function activarTab(id){for(const panelId of germTabs){const activa=panelId===id,panel=$g(panelId),boton=$g("tabGerm"+tabNames[panelId]);panel.hidden=!activa;boton.setAttribute("aria-selected",String(activa));boton.tabIndex=activa?0:-1}}
 for(const panelId of germTabs)$g("tabGerm"+tabNames[panelId]).onclick=()=>activarTab(panelId);
 seccionGerm.querySelector(".germ-tabs").onkeydown=e=>{const ids=germTabs.map(id=>"tabGerm"+tabNames[id]),i=ids.indexOf(e.target.id);if(i<0)return;const next={ArrowLeft:(i+ids.length-1)%ids.length,ArrowRight:(i+1)%ids.length,Home:0,End:ids.length-1}[e.key];if(next===undefined)return;e.preventDefault();$g(ids[next]).click();$g(ids[next]).focus()};
 const fullscreenBtn=$g("germFullscreen");
 async function alternarPantallaGerm(){if(document.fullscreenElement===seccionGerm){await document.exitFullscreen()}else{try{await seccionGerm.requestFullscreen()}catch{seccionGerm.classList.toggle("germ-full-window",location.hash==="#germinacion")}}}
 fullscreenBtn.onclick=alternarPantallaGerm;
 $g("germHome").addEventListener("click",async e=>{e.preventDefault();if(document.fullscreenElement===seccionGerm)await document.exitFullscreen();seccionGerm.classList.remove("germ-full-window");location.hash="inicio"});
 document.addEventListener("fullscreenchange",()=>{const inmersiva=document.fullscreenElement===seccionGerm;seccionGerm.classList.toggle("germ-full-window",inmersiva||location.hash==="#germinacion");fullscreenBtn.textContent=inmersiva?"Salir de pantalla completa":"Pantalla completa";fullscreenBtn.setAttribute("aria-pressed",String(inmersiva))});
 function vistaInicialGerminacion(){const abierta=location.hash==="#germinacion",inmersiva=document.fullscreenElement===seccionGerm;seccionGerm.classList.toggle("germ-full-window",abierta||inmersiva);fullscreenBtn.textContent=inmersiva?"Salir de pantalla completa":"Pantalla completa";fullscreenBtn.setAttribute("aria-pressed",String(inmersiva))}
 window.addEventListener("hashchange",vistaInicialGerminacion);vistaInicialGerminacion();
 for(const [i,def] of variables.entries())variable.add(new Option(def[2],i));
 for(const [id,[nombre]] of Object.entries(tratamientos))tratamiento.add(new Option(nombre,id));
 for(const [id,nombre] of Object.entries(estados))estado.add(new Option(nombre,id));

 function resumen(dia,metrica,tr,semilla){
  const valores=[1,2,3].map(r=>GERMINACION[dia][tr+"-"+semilla+"-"+r]?.[metrica]).filter(Number.isFinite);
  const media=valores.reduce((s,v)=>s+v,0)/valores.length;
  const de=Math.sqrt(valores.reduce((s,v)=>s+(v-media)**2,0)/(valores.length-1));
  return {media,de,n:valores.length};
 }
 function escapeSvg(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]))}
 function dibujarComparacion(dia,metrica,titulo,unidad){
  const W=1200,H=680,left=112,right=32,top=74,bottom=132,plotW=W-left-right,plotH=H-top-bottom,base=top+plotH;
  const datos=Object.keys(tratamientos).map(tr=>({tr,estados:Object.keys(estados).map(sem=>({sem,...resumen(dia,metrica,tr,sem)}))}));
  const techo=unidad==="%"?100:Math.max(1,Math.ceil(Math.max(...datos.flatMap(d=>d.estados.map(x=>x.media+x.de)))/5)*5),paso=techo/4;
  const piezas=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="germSvgTitle germSvgDesc"><title id="germSvgTitle">${escapeSvg(titulo)}</title><desc id="germSvgDesc">Medias y desviación estándar para cuatro tratamientos, comparando semillas envejecidas y sin envejecer.</desc><rect width="${W}" height="${H}" fill="#fff"/><text x="${left}" y="36" class="chartTitle">${escapeSvg(titulo)}</text>`];
  for(let i=0;i<=4;i++){const v=techo-i*paso,y=top+i*plotH/4;piezas.push(`<line x1="${left}" y1="${y}" x2="${W-right}" y2="${y}" class="grid"/><text x="${left-14}" y="${y+6}" text-anchor="end" class="tick">${fmt.format(v)} ${escapeSvg(unidad)}</text>`)}
  piezas.push(`<line x1="${left}" y1="${top}" x2="${left}" y2="${base}" class="axis"/><line x1="${left}" y1="${base}" x2="${W-right}" y2="${base}" class="axis"/>`);
  const slot=plotW/datos.length,bw=56,gap=20,total=bw*2+gap;
  datos.forEach((d,i)=>{
   const x0=left+i*slot+(slot-total)/2;
   d.estados.forEach((v,j)=>{
    const x=x0+j*(bw+gap),h=Math.max(0,v.media/techo*plotH),y=base-h,color=tratamientos[d.tr][1],err=Math.max(0,v.de||0)/techo*plotH,op=j===0?.45:1;
    piezas.push(`<g class="chartBar" tabindex="0" role="button" data-tr="${d.tr}" data-state="${v.sem}" aria-label="${escapeSvg(tratamientos[d.tr][0])}, ${escapeSvg(estados[v.sem])}: media ${fmt.format(v.media)} ${escapeSvg(unidad)}, desvío estándar ${fmt.format(v.de)}"><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${color}" fill-opacity="${op}" stroke="${color}" stroke-width="2"/><line x1="${x+bw/2}" y1="${y-err}" x2="${x+bw/2}" y2="${y+err}" class="error"/><line x1="${x+bw/2-9}" y1="${y-err}" x2="${x+bw/2+9}" y2="${y-err}" class="error"/><line x1="${x+bw/2-9}" y1="${y+err}" x2="${x+bw/2+9}" y2="${y+err}" class="error"/><text x="${x+bw/2}" y="${Math.max(top+18,y-err-8)}" text-anchor="middle" class="value">${fmt.format(v.media)}</text><title>${escapeSvg(estados[v.sem])} · ${escapeSvg(tratamientos[d.tr][0])} · n=${v.n}</title></g>`);
   });
   const label=tratamientos[d.tr][0].replace(/^BIO\d+ · /,"");
   piezas.push(`<text x="${left+i*slot+slot/2}" y="${base+30}" text-anchor="middle" class="category">${escapeSvg(label)}</text>`);
  });
  const ly=H-40;piezas.push(`<rect x="${left}" y="${ly-13}" width="18" height="18" rx="3" fill="#718077" fill-opacity=".45"/><text x="${left+27}" y="${ly+1}" class="legendText">Envejecidas</text><rect x="${left+190}" y="${ly-13}" width="18" height="18" rx="3" fill="#718077"/><text x="${left+217}" y="${ly+1}" class="legendText">Sin envejecer</text><text x="${W-right}" y="${ly+1}" text-anchor="end" class="note">Barras: media · líneas: DE · n = 3</text></svg>`);
  const panel=$g("germChart");panel.innerHTML=piezas.join("");
  panel.querySelectorAll(".chartBar").forEach(bar=>{const elegir=()=>{tratamiento.value=bar.dataset.tr;estado.value=bar.dataset.state;diaFoto.value=String(dia);fichas();activarTab("germBandejas");rep.focus({preventScroll:true})};bar.onclick=elegir;bar.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();elegir()}}});
 }
 function graficar(){
  const [dia,metrica,,unidad,criterio]=variables[variable.value];
  diaFoto.value=String(dia);
  $g("germCriterio").textContent=criterio;
  dibujarComparacion(dia,metrica,variables[variable.value][2],unidad);
  const grupos=Object.entries(estados).map(([id,nombre])=>({id,nombre,datos:Object.keys(tratamientos).map(tr=>({tr,...resumen(dia,metrica,tr,id)}))}));
  const max=unidad==="%"?100:Math.ceil(Math.max(...grupos.flatMap(g=>g.datos.map(d=>d.media))));
  const secciones=grupos.map(({id,nombre,datos})=>{
   const panel=document.createElement("section");
   panel.className="germ-grupo";
   panel.innerHTML='<h4>'+nombre+'</h4><p class="source">Escala 0–'+max+' '+unidad+'</p>';
   for(const {tr,media,de,n} of datos){
    const [nombre,color]=tratamientos[tr],boton=document.createElement("button");
    boton.type="button";boton.className="germ-resultado";
    boton.innerHTML='<span>'+nombre+'</span><strong>'+fmt.format(media)+' '+unidad+'</strong><i aria-hidden="true"><b style="width:'+media/max*100+'%;background:'+color+'"></b></i><small>DE '+fmt.format(de)+' '+(unidad==="%"?"pp":unidad)+' · '+n+' bandejas</small>';
    boton.onclick=()=>{tratamiento.value=tr;estado.value=id;diaFoto.value=String(dia);fichas();activarTab("germBandejas");rep.focus({preventScroll:true})};
    panel.append(boton);
   }
   return panel;
  });
  $g("germGraficos").replaceChildren(...secciones);
 }
 $g("germExport").onclick=()=>{
  const svg=$g("germChart").querySelector("svg"),xml=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml;charset=utf-8"})),img=new Image();
  const status=$g("germExportStatus");status.textContent="Preparando PNG 4K…";
  img.onload=()=>{const canvas=document.createElement("canvas");canvas.width=3840;canvas.height=2160;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob){status.textContent="No se pudo generar el PNG.";return}const a=document.createElement("a"),link=URL.createObjectURL(blob);a.href=link;a.download="germinacion-dia"+variables[variable.value][0]+"-"+variables[variable.value][1]+".png";a.click();setTimeout(()=>URL.revokeObjectURL(link),1200);status.textContent="PNG 4K descargado."},"image/png")};
  img.onerror=()=>{URL.revokeObjectURL(url);status.textContent="No se pudo generar el PNG."};img.src=url;
 };
 function ficha(dia,id){
  const d=GERMINACION[dia][id],panel=document.createElement("article");
  panel.className="germ-bandeja";
  const h=document.createElement("h4");h.textContent=dia+" días";panel.append(h);
  if(!d){
   const p=document.createElement("p");p.textContent="Registro de bandeja no disponible.";
   panel.append(p);return panel;
  }
  const enlace=document.createElement("a");enlace.href=d.foto;enlace.target="_blank";enlace.rel="noopener";enlace.title="Ampliar la bandeja";
  const img=new Image();img.src=d.foto;img.loading="lazy";
  img.alt=dia+" días · "+tratamientos[tratamiento.value][0]+" · "+estados[estado.value]+" · R"+rep.value;
  enlace.append(img);panel.append(enlace);
  const lista=dia===5?[
   ["Semillas sembradas",d.sembradas],["Con emergencia visible",d.emergidas],
   ["Emergencia visible",fmt.format(d.emergencia)+" %"],["Eje medio",fmt.format(d.eje)+" cm"]
  ]:[
   ["Semillas sembradas",d.sembradas],["Aspecto normal",d.normales],["Dudosas",d.dudosas],["No germinadas",d.ng],
   ["PG por emergencia",fmt.format(d.emergencia)+" %"],["Aspecto normal (%)",fmt.format(d.normalidad)+" %"],
   ["Raíz media",fmt.format(d.raiz)+" cm · "+d.medidas+" raíces"]
  ];
  const dl=document.createElement("dl");dl.className="germ-valores";
  dl.innerHTML=lista.map(([nombre,valor])=>"<div><dt>"+nombre+"</dt><dd>"+valor+"</dd></div>").join("");
  panel.append(dl);
  if(d.nota){const p=document.createElement("p");p.className="source";p.textContent=d.nota;panel.append(p)}
  return panel;
 }
 function fichas(){
  const id=[tratamiento.value,estado.value,rep.value].join("-");
  $g("germFotos").replaceChildren(ficha(Number(diaFoto.value),id));
 }
 variable.onchange=()=>{graficar();fichas()};
 for(const control of [tratamiento,estado,rep,diaFoto])control.onchange=fichas;
 const params=new URLSearchParams(location.search);
 function valorPermitido(control,nombre,predeterminado){
  const valor=params.get(nombre);
  control.value=[...control.options].some(o=>o.value===valor)?valor:predeterminado;
 }
 valorPermitido(tratamiento,"tratamiento","testigo");
 valorPermitido(estado,"semilla","sin");
 valorPermitido(rep,"rep","1");
 valorPermitido(variable,"variable","0");
 const apartado=params.get("desde");
 if(apartado&&/^[a-z][a-z0-9-]*$/.test(apartado)){
  const enlace=$g("volverGermPresentacion");
  enlace.href="presentacion.html#"+apartado;
  enlace.hidden=false;
 }
 graficar();fichas();
})();
