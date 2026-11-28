"use strict";
const codes={BIO1:"Hormonal",BIO2:"Trichoderma",BIO3:"Aminoácidos",TESTIGO:"Testigo"};
const cnum=n=>Number.isFinite(n)?n.toLocaleString("es-AR",{maximumFractionDigits:2}):"—";
const variablesGrupo={
 altura:["Altura","cm",d=>d.altura],area:["Área foliar","cm²",d=>d.area],
 peso:["Peso seco de hojas","g",d=>d.peso],raiz:["Volumen de raíces","mL",d=>PRELIMINARES[d.id].raiz_ml],
 nudos:["Nudos totales","nudos",d=>PRELIMINARES[d.id].nudos],
 pimpollos:["Pimpollos","pimpollos",d=>PRELIMINARES[d.id].eventos.reduce((n,e)=>n+e.pimpollos,0)],
 flores:["Flores","flores",d=>PRELIMINARES[d.id].eventos.reduce((n,e)=>n+e.flores,0)],
 afe:["Área foliar específica","cm²/g",d=>d.peso>0?PRELIMINARES[d.id].area_cm2/d.peso:null]
};
const $=id=>document.getElementById(id), canvas=$("scene"), ctx=canvas.getContext("2d");
const rows="ABCDEFGH", photos=new Map(), review=$("review"), rc=review.getContext("2d"), calPreview=$("calPreview"),pc=calPreview.getContext("2d");
const palette={"Aminoácidos":"#2368aa","Hormonal":"#b93840","Testigo":"#606c76","Trichoderma":"#24764e"};
const defaults=[16,14], storageKey="algodon-bloque3-calibracion-v1";
let perspective=true;
const shadowMaps=new Map();
let az=defaults[0],el=defaults[1],zoom=1,drag,scheduled=false,loaded=0,failed=0;
let corrections={};
try{
  const previous=localStorage.getItem(storageKey);
  if(previous && !localStorage.getItem(storageKey+"-3G8-actualizada")){
    const migrated=JSON.parse(previous);
    delete migrated["3G8"];
    localStorage.setItem(storageKey,JSON.stringify(migrated));
  }
  localStorage.setItem(storageKey+"-3G8-actualizada","1");
  corrections=JSON.parse(localStorage.getItem(storageKey)||"{}")||{};
}catch{}
for(const d of PLANTAS){
 if(d.firma && corrections[d.id] && corrections[d.id].firma!==d.firma && !(!corrections[d.id].firma && d.id[0]==="3" && !["3F2","3F3","3F4","3F5","3F6"].includes(d.id))) delete corrections[d.id];
}
window.algodonCalibracionesActivas=corrections;
const copy=p=>JSON.parse(JSON.stringify(p));
function points(d){return corrections[d.id]||d.p}
const filters={treatment:"tratamiento",soil:"sueloTipo",row:"fila",column:"col"};
const finalById=new Map(PLANTAS.map(d=>[d.id,d.altura]));
const photoMode=()=>$("measurement").value==="foto";
const blockColors={"1":"#b93840","2":"#2368aa","3":"#24764e"};
function dataset(){
 if(photoMode())return PLANTAS.filter(d=>!$("block").value || d.id[0]===$("block").value);
 const stage=Number($("measurement").value);
 return REGISTROS.filter(d=>!$("block").value||d.block===$("block").value).map(d=>({
  id:d.id,fila:d.id[1],col:Number(d.id.slice(2)),tratamiento:d.trt,sueloTipo:d.soil,
  altura:d.h[stage],color:blockColors[d.block],photo:d.photo
 }));
}
function filtered(){return dataset().filter(d=>Object.entries(filters).every(([id,key])=>!$(id).value||String(d[key])===$(id).value))}
function selected(){return filtered().filter(d=>!$("plant").value||d.id===$("plant").value)}
function option(el,value,txt){el.add(new Option(txt,value))}
function filterOptions(){
 const ds=dataset();
 for(const [id,key] of Object.entries(filters)){
  const control=$(id),old=control.value;control.length=1;
  for(const v of new Set(ds.map(d=>d[key])))option(control,v,id==="treatment"&&codes[v]?codes[v]+" · "+v:v);
  control.value=Array.from(control.options).some(o=>o.value===old)?old:"";
 }
}
const requested=new URLSearchParams(location.search).get("bloque");
$("block").value=["1","2","3"].includes(requested)?requested:"";
$("measurement").value="foto";filterOptions();
for(const d of PLANTAS)option($("rid"),d.id,d.id);
function fillPlants(){
 const previous=$("plant").value;
 $("plant").length=1;
 const candidates=filtered();
 candidates.forEach(d=>option($("plant"),d.id,d.id));
 $("plant").value=candidates.some(d=>d.id===previous)?previous:"";
}
fillPlants();
for(const [name,color] of Object.entries(palette)){
  const item=document.createElement("span");item.innerHTML='<i class="dot" style="background:'+color+'"></i>'+name;$("legend").append(item);
}
const benchBearingDeg=12; // H1 to H10, estimated from the annotated map.
let solar,timer,trackDate,dayTrack=[];
function updateSun(){
 const m=Number($("sunTime").value);
 if(trackDate!==$("sunDate").value){
  trackDate=$("sunDate").value;
  dayTrack=Array.from({length:145},(_,i)=>sunPosition(trackDate,i*10,benchBearingDeg));
 }
 solar=sunPosition($("sunDate").value,m,benchBearingDeg);
 $("clock").textContent=String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
 $("sunData").textContent=solar.alt>0?"Altura "+solar.alt.toFixed(1)+"° · Azimut "+solar.az.toFixed(1)+"° desde el norte":"Sol bajo el horizonte";
 schedule();
}
function stopSun(){clearInterval(timer);timer=null;$("playSun").textContent="Reproducir día"}
function photoTime(){stopSun();$("sunTime").value=$("sunDate").value==="2026-03-29"?1023:1123;updateSun()}
$("photoSun").onclick=photoTime;$("sunDate").onchange=photoTime;
$("sunTime").oninput=()=>{stopSun();updateSun()};
$("playSun").onclick=()=>{
 if(timer){stopSun();return}
 $("sunTime").value=360;updateSun();$("playSun").textContent="Pausar";
 timer=setInterval(()=>{const m=Number($("sunTime").value);if(m>=1230){stopSun();return}
 $("sunTime").value=m+5;updateSun()},150);
};
updateSun();

function summaryTable(title,data,key,valor){
 const groups=new Map();
 for(const plant of data){
  const label=key(plant);
  if(!groups.has(label))groups.set(label,[]);
  const v=valor(plant);
  if(Number.isFinite(v))groups.get(label).push(v);
 }
 const number=n=>(Math.round(n*100+1e-9)/100).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
 const body=Array.from(groups).filter(([,values])=>values.length).map(([name,values])=>{
  const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;
  const variance=values.reduce((sum,h)=>sum+(h-mean)**2,0)/(n-1);
  return "<tr><td>"+name+"</td><td>"+n+"</td><td>"+number(mean)+"</td><td>"+(n>1?number(Math.sqrt(variance)):"—")+"</td></tr>";
 }).join("");
 return "<h3>"+title+"</h3><table><thead><tr><th>Grupo</th><th>n</th><th>Media</th><th>DE</th></tr></thead><tbody>"+body+"</tbody></table>";
}
function refresh(){
  const active=selected();
  const group=filtered(),fmt=n=>n.toLocaleString("es-AR",{maximumFractionDigits:1});
  const single=active.length===1?active[0]:null;
  const finalText=id=>finalById.has(id)?fmt(finalById.get(id))+" cm":"Pendiente";
  const measureName=photoMode()?"Altura final":["10 mar","16 mar","24 mar"][Number($("measurement").value)];
  $("heightColumn").textContent=measureName;
  $("finalColumn").hidden=photoMode();
  const photographic=photoMode(),block=$("block").value;
  $("headingBlock").textContent=block||"1–3";
  document.querySelector(".analysis").hidden=!photographic || !!block || !!$("row").value || !!$("column").value || !!$("treatment").value;
  $("inference").innerHTML=["Pobre","Rico"].filter(s=>!$("soil").value||$("soil").value===s).map(s=>ANALISIS_POR_SUELO[s]).join("");
  $("openReview").hidden=!photographic;
  $("positions").hidden=false;
  $("sceneNote").textContent="Fotografías editadas de las macetas · altura final preliminar. Revisá los puntos de sustrato, nudo y apoyo para confirmar la escala.";
  {
   const byId=new Map(group.map(d=>[d.id,d]));
   const blocks=block?[block]:["3","2","1"];
   $("blockMap").innerHTML='<p class="mapnote">Plano de posiciones · A al fondo, H al borde. Elegí una planta para consultar su altura.</p><div class="mapblocks">'+blocks.map(n=>{
    const cells=Array.from(rows,f=>Array.from({length:10},(_,i)=>{
     const id=n+f+(i+1),d=byId.get(id);
     return d?'<button type="button" data-id="'+id+'" aria-label="Planta '+id+'" aria-pressed="'+(id===$("plant").value)+'" title="'+id+' · '+fmt(d.altura)+' cm">'+f+(i+1)+'</button>':'<span aria-hidden="true"></span>';
    }).join("")).join("");
    return '<section style="--accent:'+blockColors[n]+'"><button class="blocklink" data-block="'+n+'">Bloque '+n+'</button><div class="positiongrid">'+cells+'</div></section>';
   }).join("")+'</div>';
   if(!group.length)$("blockMap").insertAdjacentHTML("beforeend","<p class=mapnote>Sin plantas para estos filtros.</p>");
  }
  $("cardTitle").textContent=single?"Planta "+single.id:"Datos de la selección";
  $("info").innerHTML=single?'<div class="caption">'+(photographic?"Altura final registrada":"Altura al "+measureName)+'</div><div class="measure">'+fmt(single.altura)+' <small>cm</small></div><dl>'+
   [...(!photographic?[["Altura final",finalText(single.id)]]:[]),["Tratamiento",single.tratamiento],["Suelo",single.sueloTipo],["Fila / columna",single.fila+" / "+single.col],photographic?["Calibración",corrections[single.id]?"revisada":single.estado]:["Bloque",single.id[0]]].map(([k,v])=>"<dt>"+k+"</dt><dd>"+v+"</dd>").join("")+"</dl>":"";
  if(single?.photo)$("info").insertAdjacentHTML("beforeend",'<a href="'+single.photo+'" target="_blank" rel="noopener">Ver fotografía</a>');
  estadisticasLaterales(group);datosPerfil(active);
  actualizarGaleriaFoliar(group,$("plant").value);
  datosMesada(single,group);
  $("visible").textContent=active.length+" de "+dataset().length+" seleccionadas";
  $("count").textContent=group.length+" registros";
  $("empty").hidden=active.length>0;
  $("openReview").disabled=!active.length;
  $("records").innerHTML=group.map(d=>'<tr data-plant="'+d.id+'" class="'+(d.id===$("plant").value?'active':'')+'"><td><button aria-label="Ver planta '+d.id+'">'+d.id+'</button></td><td><i class="dot" style="background:'+d.color+'"></i>'+d.tratamiento+'</td><td>'+fmt(d.altura)+' cm</td>'+(photographic?'':'<td>'+finalText(d.id)+'</td>')+'</tr>').join("");
  schedule();
}
for(const [n,a,e] of [["Desde el borde",...defaults],["Isométrica",45,35.264],["Frontal",0,0],["Lateral derecha",90,0],["Lateral izquierda",-90,0],["Posterior",180,0],["Superior",0,90]]){
 const b=document.createElement("button");b.textContent=n;if(["Posterior","Lateral izquierda","Lateral derecha"].includes(n))b.title="Cambia el punto de vista de la mesada. Cada planta conserva su cara fotografiada.";b.setAttribute("aria-pressed",String(n==="Desde el borde"));b.onclick=()=>{for(const other of $("presets").children)other.setAttribute("aria-pressed",String(other===b));perspective=n==="Desde el borde";az=a;el=e;zoom=1;datosPerfil(selected());schedule()};$("presets").append(b);
}
$("block").onchange=()=>{stopSun();filterOptions();fillPlants();refresh()};
$("measurement").onchange=()=>{stopSun();filterOptions();fillPlants();refresh()};
$("blockMap").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.block){$("block").value=b.dataset.block;$("block").onchange()}
 else if(b.dataset.id){$("plant").value=b.dataset.id;refresh()}
};
for(const id of Object.keys(filters))$(id).onchange=()=>{fillPlants();refresh()};
$("clear").onclick=()=>{for(const id of [...Object.keys(filters),"plant","block"])$(id).value="";$("block").onchange()};
$("records").onclick=e=>{const tr=e.target.closest("tr[data-plant]");if(tr){$("plant").value=tr.dataset.plant;refresh()}};
$("plant").onchange=refresh;$("labels").onchange=()=>{$("positions").open=$("labels").checked};
$("positions").ontoggle=()=>{$("labels").checked=$("positions").open};
$("sceneIds").onchange=schedule;
$("showSigns").onchange=()=>{$("greenhouseSigns").hidden=!$("showSigns").checked};
function magnify(k){zoom=Math.max(.45,Math.min(5,zoom*k));schedule()}
$("minus").onclick=()=>magnify(.8);$("plus").onclick=()=>magnify(1.25);
$("reset").onclick=()=>{$("presets").firstElementChild.click()};
const punteros=new Map();
let tocandoVarios=false, movimiento=false;
function distanciaDedos(){
 const [a,b]=punteros.values();
 return Math.hypot(a.x-b.x,a.y-b.y);
}
canvas.onpointerdown=e=>{
 if(e.pointerType==="mouse" && e.button!==0)return;
 canvas.setPointerCapture(e.pointerId);
 punteros.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(punteros.size===1){tocandoVarios=false;movimiento=false;drag=[e.clientX,e.clientY,az,el]}
 else tocandoVarios=true;
};
canvas.onpointermove=e=>{
 if(!punteros.has(e.pointerId))return;
 const anterior=punteros.size===2?distanciaDedos():0;
 punteros.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(punteros.size===2){const nueva=distanciaDedos();if(anterior>0 && nueva>0)magnify(nueva/anterior);return}
 if(punteros.size!==1 || !drag)return;
 const dx=e.clientX-drag[0],dy=e.clientY-drag[1];
 if(Math.hypot(dx,dy)>=4)movimiento=true;
 if(!movimiento)return;
 for(const btn of $("presets").children)btn.setAttribute("aria-pressed","false");
 $("perfilVista").hidden=true;
 az=drag[2]-dx*.35;el=Math.max(0,Math.min(90,drag[3]+dy*.3));schedule();
};
function soltar(e){
 if(!punteros.delete(e.pointerId))return false;
 const clic=punteros.size===0 && !tocandoVarios && !movimiento && drag && Math.hypot(e.clientX-drag[0],e.clientY-drag[1])<4;
 drag=null;
 if(punteros.size===1){const [p]=punteros.values();drag=[p.x,p.y,az,el]}
 return clic;
}
let posicionesClic=[];
canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(punteros.has(e.pointerId)){tocandoVarios=true;soltar(e)}};
canvas.onpointerup=e=>{
 if(!soltar(e))return;
 const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 if(el<83 && x<44)return;
 const hit=posicionesClic.slice().reverse().find(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);
 if(hit){
  $("cmpMode").value="id";actualizarGrupos(hit.id);elegirFoliar(hit.id);datosMesada(filtered().find(d=>d.id===hit.id),filtered());
  $("cmpStatus").textContent="Maceta "+hit.id+" asignada al lado "+$("cmpSide").value+".";
 }
};
canvas.addEventListener("wheel",e=>{e.preventDefault();magnify(Math.exp(-e.deltaY*.001))},{passive:false});
function size(c,g){
 const w=c.clientWidth,h=c.clientHeight,k=Math.min(devicePixelRatio||1,2);
 if(c.width!==Math.round(w*k)||c.height!==Math.round(h*k)){c.width=Math.round(w*k);c.height=Math.round(h*k)}
 g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,w,h);return [w,h];
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()})}}
function line(p,q,color,width=1){ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
const normalized=new Map(), pixelsPerCm=4;
function calibratedPhoto(d,pointOverride){
 const raw=photos.get(d.id),p=pointOverride||points(d),cached=pointOverride?null:normalized.get(d.id);
 if(!raw)return null;
 if(cached && cached.points===p)return cached;
 const m=d.maceta,[l,t,r,b]=d.caja,foot=p.apoyo[1],cut=m.union_y;
 const sy=m.alto_cm/(foot-m.borde_y),sx=m.ancho_cm/m.ancho_px;
 const shoot=(d.altura-(p.suelo[1]-cut)*sy)/(cut-p.nudo[1]);
 if(!(shoot>0 && sy>0))return null;
 const jointX=(m.union_x-m.centro_x)*sx,jointY=(cut-foot)*sy,k=pixelsPerCm;
 const layers=[
  [cut-t,b-cut,(l-m.centro_x)*sx,jointY,(r-l)*sx,(b-cut)*sy],
  [0,cut-t,jointX+(l-m.union_x)*shoot,jointY-(cut-t)*shoot,(r-l)*shoot,(cut-t)*shoot]
 ];
 const left=Math.floor(Math.min(...layers.map(q=>q[2]))*k),top=Math.floor(Math.min(...layers.map(q=>q[3]))*k);
 const right=Math.ceil(Math.max(...layers.map(q=>q[2]+q[4]))*k),bottom=Math.ceil(Math.max(...layers.map(q=>q[3]+q[5]))*k);
 const img=document.createElement("canvas");img.width=right-left;img.height=bottom-top;
 const g=img.getContext("2d");g.imageSmoothingQuality="high";
 for(const [y,h,x0,y0,w0,h0] of layers){
  const x1=Math.round(x0*k),y1=Math.round(y0*k);
  g.drawImage(raw,0,y*raw.height/(b-t),raw.width,h*raw.height/(b-t),x1-left,y1-top,Math.round((x0+w0)*k)-x1,Math.round((y0+h0)*k)-y1);
 }
 const entry={img,points:p,box:[left,top,right,bottom]};
 if(!pointOverride){normalized.set(d.id,entry);makeShadow(d.id,img)}return entry;
}
// Top-down sky chart: rim = horizon, center = zenith. Rotation follows the camera.
const compass=$("compass"),compassContext=compass.getContext("2d");
function drawCompass(){
 const ctx=compassContext,[w,h]=size(compass,ctx);
 if(!w||!h)return;
 const cx=w/2,cy=h/2,rad=Math.PI/180,radius=25;
 const skyPoint=(bearing,alt,r)=>{
  const angle=(az-benchBearingDeg+bearing)*rad;
  return [cx+r*Math.cos(angle)*(1-alt/90),cy+r*Math.sin(angle)*(1-alt/90)];
 };
 ctx.save();
 ctx.fillStyle="rgba(255,255,251,.94)";ctx.strokeStyle="#b5c4b7";ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(cx,cy,radius+1,0,2*Math.PI);ctx.fill();ctx.stroke();
 const rim=radius-7;
 ctx.beginPath();ctx.arc(cx,cy,rim,0,2*Math.PI);ctx.stroke();
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 9px Segoe UI";
 for(const [label,bearing] of [["N",0],["E",90],["S",180],["O",270]]){
  const pt=skyPoint(bearing,0,radius-2);
  ctx.fillStyle=label==="N"?"#a33d37":"#25483b";ctx.fillText(label,...pt);
 }
 ctx.beginPath();
 let started=false;
 for(const sample of dayTrack){
  if(sample.alt<0){started=false;continue}
  const pt=skyPoint(sample.az,sample.alt,rim);
  if(started)ctx.lineTo(...pt);else ctx.moveTo(...pt);
  started=true;
 }
 ctx.strokeStyle="#c19244";ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);
 if(solar.alt>0){
  const [x,y]=skyPoint(solar.az,solar.alt,rim);
  ctx.strokeStyle="#ad6708";ctx.lineWidth=1.3;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;
   ctx.beginPath();ctx.moveTo(x+3.5*Math.cos(a),y+3.5*Math.sin(a));ctx.lineTo(x+5*Math.cos(a),y+5*Math.sin(a));ctx.stroke()}
  ctx.beginPath();ctx.arc(x,y,2.6,0,2*Math.PI);ctx.fillStyle="#ffc544";ctx.fill();ctx.stroke();
 }
 ctx.restore();
}
function draw(){
 drawCompass();
 for(const arrow of document.querySelectorAll("#greenhouseSigns i")){
  arrow.style.transform="rotate("+(az+Number(arrow.dataset.angle))+"deg)";
 }
 if(window.innerWidth<=700 && !canvas.closest(".ampliada")){
  const arriba=canvas.getBoundingClientRect().top+window.scrollY;
  const alto=Math.max(135,Math.min(360,Math.floor(window.innerHeight-arriba-6)));
  canvas.style.setProperty("--alto-vista-inicial",alto+"px");
 }
 const [w,h]=size(canvas,ctx),active=selected();
 actualizarRotulosBloque(active);
 posicionesClic=[];
 if(!w||!h||!active.length)return;
 const chosen=new Set(active.map(d=>d.id));
 const ds=PLANTAS.filter(d=>chosen.has(d.id));
 const positions=active.map(d=>({x:(3-Number(d.id[0]))*550+(d.col-1)*55,y:(7-rows.indexOf(d.fila))*55}));
 const a=az*Math.PI/180,e=el*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),ce=Math.cos(e),se=Math.sin(e);
 const view=(x,y,z)=>[x*ca+y*sa,(x*sa-y*ca)*se-z*ce];
 const minX=Math.min(...positions.map(d=>d.x))-30,maxX=Math.max(...positions.map(d=>d.x))+30;
 const minY=Math.min(...positions.map(d=>d.y))-28,maxY=Math.max(...positions.map(d=>d.y))+28;
 const midX=(minX+maxX)/2,midY=(minY+maxY)/2;
 const distance=Math.max(245,1.45*Math.hypot(maxX-minX,maxY-minY));
 const depth=(x,y)=>(x-midX)*sa-(y-midY)*ca;
 const factor=(x,y,z)=>perspective?distance/(distance-depth(x,y)*ce-(z-54)*se):1;
 const optical=(x,y,z)=>{
  const [u,v]=view(x-midX,y-midY,z-54),k=factor(x,y,z);
  return [u*k,v*k];
 };
 const corners=[];for(const x of [minX,maxX])for(const y of [minY,maxY])for(const z of [0,133])corners.push(optical(x,y,z));
 const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]),lo=Math.min(...xs),hi=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const scaleGutter=el<83?44:0;
 const scale=Math.max(.01,Math.min((w-scaleGutter-22)/Math.max(1,hi-lo),(h-42)/Math.max(1,bottom-top)))*zoom;
 ctx.save();ctx.beginPath();ctx.rect(scaleGutter,0,w-scaleGutter,h);ctx.clip();
 const project=(x,y,z=0)=>{let [u,v]=optical(x,y,z);return [(w+scaleGutter)/2+(u-(lo+hi)/2)*scale,h/2+(v-(top+bottom)/2)*scale]};
 function tag(s,x,y,color="#36534a"){ctx.fillStyle=color;ctx.font="12px Segoe UI, sans-serif";ctx.textAlign="center";ctx.fillText(s,x,y)}
 const blocks=[...new Set(active.map(d=>d.id[0]))];
 const backdrop=ctx.createLinearGradient(0,0,0,h);
 backdrop.addColorStop(0,"#e5e9e7");backdrop.addColorStop(.55,"#f8f9f6");backdrop.addColorStop(1,"#e6e8e3");
 ctx.fillStyle=backdrop;ctx.fillRect(0,0,w,h);
 function polygon(vertices,color){
  ctx.beginPath();vertices.forEach(([x,y,z],i)=>ctx[i?"lineTo":"moveTo"](...project(x,y,z||0)));
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
 }
 const deck=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]];
 const edges=deck.map((a,i)=>[a,deck[(i+1)%4]]).sort(([a,b],[c,d])=>depth(a[0]+b[0],a[1]+b[1])-depth(c[0]+d[0],c[1]+d[1]));
 for(const [a,b] of edges)polygon([a,b,[...b,-3],[...a,-3]],a[0]===b[0]?"#abb2ac":"#929e99");
 const surface=ctx.createLinearGradient(w*.2,0,w*.8,h);
 surface.addColorStop(0,"#fafaf6");surface.addColorStop(.6,"#e8ebe5");surface.addColorStop(1,"#dce1db");
 polygon(deck,surface);
 for(const n of blocks){
  const offset=(3-Number(n))*550;
  const left=Math.max(minX,offset-26),right=Math.min(maxX,offset+521);
  polygon([[left,minY],[right,minY],[right,minY+5],[left,minY+5]],blockColors[n]);
  polygon([[left,maxY-5],[right,maxY-5],[right,maxY],[left,maxY]],blockColors[n]);
  const boundary=offset-27.5;
  if(boundary>minX && boundary<maxX)line(project(boundary,minY),project(boundary,maxY),"#5b6d65",2);

 }
 // Slim edge strips locate both soil groups while leaving the work surface neutral.
 for(const [y0,y1,c] of [[minY,Math.min(maxY,192),"#a2b8a6"],[Math.max(minY,193),maxY,"#c6ba9f"]]){
  if(y1>y0)polygon([[minX,y0],[minX+3,y0],[minX+3,y1],[minX,y1]],c);
 }
 if(!perspective){
  for(const x of new Set(ds.map(d=>d.x)))line(project(x,minY),project(x,maxY),"#bec9be");
  for(const y of new Set(ds.map(d=>d.y)))line(project(minX,y),project(maxX,y),"#bec9be");
 }
 const origin=project(minX,minY);
 for(const [x,y,z,t] of [[maxX,minY,0,"X"],[minX,maxY,0,"Y"]]){
  const q=project(x,y,z);if(Math.hypot(q[0]-origin[0],q[1]-origin[1])<2)continue;line(origin,q,"#749385");tag(t,q[0],q[1]-7);
 }
 const order=ds.slice().sort((u,v)=>(u.x-v.x)*sa-(u.y-v.y)*ca);
 ctx.save();ctx.beginPath();deck.forEach(([x,y],i)=>ctx[i?"lineTo":"moveTo"](...project(x,y)));ctx.closePath();ctx.clip();
 for(const d of ds){
  const entry=calibratedPhoto(d);if(!entry)continue;
  const sh=shadowMaps.get(d.id),[l,t,rightEdge,b]=entry.box;
  // Face the silhouette across the light rays so camera rotation cannot flatten its shadow.
  const direction=solar.az*Math.PI/180-benchBearingDeg*Math.PI/180;
  const acrossX=Math.sin(direction),acrossY=Math.cos(direction);
  const shadowPoint=(px,py)=>{
   const lateral=px/pixelsPerCm,height=-py/pixelsPerCm;
   const base=project(d.x,d.y),ex=project(d.x+1,d.y),ey=project(d.x,d.y+1);
   const x=acrossX*lateral+solar.dx*height,y=acrossY*lateral+solar.dy*height;
   return base.map((v,i)=>v+x*(ex[i]-v)+y*(ey[i]-v));
  };
  if(sh && el>1 && solar.alt>0){
   const o=shadowPoint(l,t),right=shadowPoint(rightEdge,t),bottom=shadowPoint(l,b);
   ctx.save();ctx.transform((right[0]-o[0])/sh.width,(right[1]-o[1])/sh.width,(bottom[0]-o[0])/sh.height,(bottom[1]-o[1])/sh.height,...o);
   ctx.globalAlpha=.46*Math.min(1,solar.alt/3);ctx.drawImage(sh,0,0);ctx.restore();
  }
  let [u,v]=project(d.x,d.y);ctx.save();ctx.translate(u,v);ctx.scale(1,Math.max(.14,se*.63));const r=Math.max(2,6*scale*factor(d.x,d.y,0)),g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,"#29392c72");g.addColorStop(1,"#314e4000");ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
 }
 ctx.restore();
 for(const d of order){
  const entry=calibratedPhoto(d);if(!entry)continue;
  const [u,v]=project(d.x,d.y),[l,t,r,b]=entry.box,img=entry.img;
  const cm=1/pixelsPerCm,s=scale*factor(d.x,d.y,0)*cm;
  const head=project(d.x,d.y,-t*cm);
  posicionesClic.push({id:d.id,l:u+l*s,r:u+r*s,t:Math.min(head[1],v)-3,b:Math.max(head[1],v)+3});
  if(ce<.0001){line([u-7*scale,v],[u+7*scale,v],d.color,3)}
  else if(img){
   if(perspective){
    // Narrow horizontal bands project the vertical photograph through the camera.
    const strips=12;
    for(let i=0;i<strips;i++){
     const y0=i*img.height/strips,y1=(i+1)*img.height/strips;
     const z0=(-t-y0)*cm,z1=(-t-y1)*cm;
     const q=project(d.x,d.y,z0),end=project(d.x,d.y,z1),k=scale*factor(d.x,d.y,(z0+z1)/2)*cm;
     ctx.drawImage(img,0,y0,img.width,y1-y0,q[0]+l*k,q[1],img.width*k,end[1]-q[1]+.25);
    }
   }else ctx.drawImage(img,u+l*s,v+t*s*ce,(r-l)*s,(b-t)*s*ce);
  }

 }

 dibujarEtiquetasMacetas(ds,project,scaleGutter,w,h,el>=83);
 ctx.restore();
 if(scaleGutter){
  const medidas=[0,20,40,60,80,100,120].map(z=>[z,project(midX,midY,z)[1]]);
  dibujarEscalaAltura(medidas,h,scaleGutter);
 }

}
function actualizarRotulosBloque(active){
 const ladoInvertido=Math.cos(az*Math.PI/180)<-0.001;
 const ids=[...new Set(active.map(d=>d.id[0]))].sort((a,b)=>ladoInvertido?a-b:b-a);
 const list=$("sceneBlocks"),key=ids.join(",");
 if(list.dataset.order===key)return;
 list.dataset.order=key;
 list.replaceChildren(...ids.map(n=>{
  const badge=document.createElement("span");
  badge.textContent="Bloque "+n;
  badge.style.borderColor=blockColors[n];
  return badge;
 }));
}
function dibujarEscalaAltura(medidas,h,gutter){
 ctx.fillStyle="#f5f8f5";ctx.fillRect(0,0,gutter,h);
 line([gutter-1,0],[gutter-1,h],"#b8c9bd");
 ctx.font="600 11px Segoe UI, sans-serif";ctx.textAlign="center";ctx.fillStyle="#234c3d";ctx.fillText("Z · cm",21,15);
 const eje=34,limite=y=>Math.max(22,Math.min(h-7,y));
 line([eje,limite(medidas[0][1])],[eje,limite(medidas.at(-1)[1])],"#527464");
 let ultimo=Infinity;
 for(const [cm,y] of medidas){
  if(y<25||y>h-6||ultimo-y<13)continue;
  line([eje-4,y],[eje+3,y],"#527464");
  ctx.fillStyle="#234c3d";ctx.textAlign="right";ctx.fillText(cm,eje-7,y+4);ultimo=y;
 }
}
function dibujarEtiquetasMacetas(plantas,project,left,w,h,superior){
 const mostrar=$("sceneIds").checked;
 const rects=[];
 const orden=plantas.map(d=>({d,pos:project(d.x,d.y)})).sort((a,b)=>b.pos[1]-a.pos[1]);
 ctx.font="600 10px Segoe UI, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
 const seCruzan=(a,b)=>a.l<b.r && a.r>b.l && a.t<b.b && a.b>b.t;
 for(const {d,pos:[x,y]} of orden){
  if(x<left+2||x>w-2||y<0||y>h)continue;
  const ancho=mostrar?Math.ceil(ctx.measureText(d.id).width)+8:8;
  const centro=y+(superior?0:11),alto=mostrar?13:6;
  const rect={id:d.id,l:x-ancho/2,r:x+ancho/2,t:centro-alto/2,b:centro+alto/2};
  if(rect.l<left||rect.r>w||rect.b>h||rects.some(r=>seCruzan(r,rect)))continue;
  if(!superior && posicionesClic.some(r=>!r.etiqueta&&seCruzan(r,rect)))continue;
  rects.push(rect);
  ctx.fillStyle=d.color;ctx.fillRect(rect.l,rect.t,ancho,alto);
  if(mostrar){
   ctx.fillStyle="white";ctx.fillText(d.id,x,centro);
   posicionesClic.push({...rect,etiqueta:true});
  }
 }
 ctx.textBaseline="alphabetic";
}
function makeShadow(id,im){
 const sh=document.createElement("canvas");sh.height=300;sh.width=Math.max(1,Math.round(sh.height*im.width/im.height));
 const g=sh.getContext("2d");g.filter="blur(0.9px)";g.drawImage(im,0,0,sh.width,sh.height);
 g.filter="none";g.globalCompositeOperation="source-in";g.fillStyle="#435046";g.fillRect(0,0,sh.width,sh.height);
 shadowMaps.set(id,sh);
}
window.addEventListener("algodon-calibracion-actualizada",()=>{
 normalized.clear();
 shadowMaps.clear();
 schedule();
});
let index=0;
function loadNext(){if(index>=PLANTAS.length)return;const d=PLANTAS[index++],im=new Image();
 im.onload=()=>{const pic=document.createElement("canvas");pic.width=Math.ceil(im.naturalWidth/2);pic.height=Math.ceil(im.naturalHeight/2);pic.getContext("2d").drawImage(im,0,0,pic.width,pic.height);photos.set(d.id,pic);
loaded++;progress();schedule();if(current?.id===d.id&&$("dialog").open)drawCalibrationPreview();loadNext()};
 im.onerror=()=>{failed++;progress();loadNext()};fotoEn(im,d.id,"escena");
}
function progress(){$("state").textContent=loaded+" / "+PLANTAS.length+" fotografías cargadas"+(failed?" · "+failed+" errores de lectura":"")}
for(let i=0;i<4;i++)loadNext();
let current,raw,draft,detail=false,transform,focusPoint;
function reviewMessage(s){$("reviewMsg").textContent=s}
function choose(){
 current=PLANTAS.find(d=>d.id===$("rid").value);draft=copy(points(current));detail=false;transform=null;
 const img=new Image();raw=img;img.onload=()=>{if(raw===img)drawReview()};
 img.onerror=()=>reviewMessage("No se pudo abrir el original. Verificá la ruta registrada en el inventario.");
 fotoEn(img,current.id,'revision');reviewMessage(current.id+" · "+current.altura.toLocaleString("es-AR")+" cm · "+(corrections[current.id]?"revisada":current.estado));drawReview();drawCalibrationPreview();
}
function drawCalibrationPreview(){
 if(!$('dialog').open)return;const [w,h]=size(calPreview,pc);pc.fillStyle="#f7f9f6";pc.fillRect(0,0,w,h);
 const entry=current&&draft?calibratedPhoto(current,draft):null;if(!entry){pc.fillStyle="#53685e";pc.font="14px Segoe UI";pc.textAlign="center";pc.fillText("Esperando la fotografía…",w/2,h/2);return}
 const pad=14,k=Math.min((w-pad*2)/entry.img.width,(h-pad*2)/entry.img.height),dw=entry.img.width*k,dh=entry.img.height*k;pc.imageSmoothingQuality="high";pc.drawImage(entry.img,(w-dw)/2,(h-dh)/2,dw,dh);
}
function drawReview(){
 if(!$("dialog").open)return;const [w,h]=size(review,rc);if(!raw||!raw.naturalWidth)return;
 const k=detail?Math.min(w/450,h/310):Math.min(w/raw.width,h/raw.height);
 const [cx,cy]=detail?focusPoint:[raw.width/2,raw.height/2],ox=w/2-cx*k,oy=h/2-cy*k;
 transform={k,ox,oy};rc.drawImage(raw,ox,oy,raw.width*k,raw.height*k);
 const names={suelo:"Sustrato",nudo:"Último nudo",apoyo:"Apoyo"};
 for(const [key,[x,y]] of Object.entries(draft).filter(([k])=>["suelo","nudo","apoyo"].includes(k))){
  const u=ox+x*k,v=oy+y*k;rc.strokeStyle=key===$("point").value?"#b2215c":"#15629a";rc.lineWidth=2;
  rc.beginPath();rc.arc(u,v,7,0,2*Math.PI);rc.moveTo(u-11,v);rc.lineTo(u+11,v);rc.moveTo(u,v-11);rc.lineTo(u,v+11);rc.stroke();
  rc.font="bold 13px Segoe UI";rc.fillStyle="white";rc.fillRect(u+12,v-15,rc.measureText(names[key]).width+7,18);rc.fillStyle=rc.strokeStyle;rc.fillText(names[key],u+15,v-2);
 }
 drawCalibrationPreview();
}
$("openReview").onclick=()=>{$("rid").value=$("plant").value||selected()[0].id;$("dialog").showModal();choose()};
$("close").onclick=()=>$("dialog").close();$("rid").onchange=choose;
function focus(){focusPoint=[...draft[$("point").value]];detail=true;drawReview()}
$("point").onchange=focus;$("detail").onclick=focus;$("whole").onclick=()=>{detail=false;drawReview()};
review.onclick=e=>{if(!transform)return;const rect=review.getBoundingClientRect(),{k,ox,oy}=transform;
 const x=Math.round((e.clientX-rect.left-ox)/k),y=Math.round((e.clientY-rect.top-oy)/k);
 if(x>=0&&x<raw.width&&y>=0&&y<raw.height){draft[$("point").value]=[x,y];reviewMessage("Vista previa recalculada · cambio pendiente de confirmación · ("+x+", "+y+") px");drawReview()}
};
$("save").onclick=()=>{
 if(!(draft.nudo[1]<current.maceta.union_y && draft.apoyo[1]>current.maceta.borde_y && draft.nudo[1]<draft.suelo[1]&&draft.suelo[1]<draft.apoyo[1])){reviewMessage("Revisá el orden vertical de los puntos.");return}
 corrections[current.id]={...copy(draft),firma:current.firma};
 window.algodonCalibracionesActivas=corrections;
 try{localStorage.setItem(storageKey,JSON.stringify(corrections));reviewMessage("Calibración aplicada. El visor y las gráficas usan esta versión; los PNG se actualizan al descargarlos.")}catch{reviewMessage("Calibración aplicada en esta sesión. El visor y las gráficas ya usan esta versión.")}
 window.dispatchEvent(new Event("algodon-calibracion-actualizada"));
 refresh();drawCalibrationPreview();
};
$("export").onclick=()=>{const blob=new Blob([JSON.stringify(corrections,null,2)],{type:"application/json"}),a=document.createElement("a");a.download="correcciones.json";a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const mesada=$("scene").closest(".panel"),filtros=document.querySelector("section.filters");
const origenFiltros=document.createComment("filtros"),origenPlano=document.createComment("plano");
filtros.before(origenFiltros);$("positions").before(origenPlano);
function datosMesada(d,grupo){
 const prefijo=d?d.id+" · "+(codes[d.tratamiento]||d.tratamiento)+" · Suelo "+d.sueloTipo.toLowerCase():"";
 $("resumenMesada").textContent=d?prefijo+" · "+$("measurement").selectedOptions[0].text+" · "+cnum(d.altura)+" cm · Área foliar "+cnum(FOLIAR[d.id]?.total)+" cm²":grupo.length+" macetas · "+$("measurement").selectedOptions[0].text;
}
function ajustarPantalla(activa){
 mesada.classList.toggle("ampliada",activa);
 document.body.classList.toggle("mesada-abierta",activa);
 $("ampliarMesada").textContent=activa?"Salir de pantalla completa":"Pantalla completa";
 $("ampliarMesada").setAttribute("aria-pressed",String(activa));
 if(activa){
  mesada.querySelector(".bar").after(filtros);
  $("sunPanel").append($("positions"));
  mesada.classList.toggle("con-referencias",window.innerWidth>700);
 }else{
  origenFiltros.after(filtros);origenPlano.after($("positions"));mesada.classList.remove("con-referencias");$("ampliarMesada").focus();
 }
 $("alternarReferencias").setAttribute("aria-expanded",String(mesada.classList.contains("con-referencias")));
 schedule();
}
$("ampliarMesada").onclick=async()=>{
 if(mesada.classList.contains("ampliada")){
  if(document.fullscreenElement===mesada)await document.exitFullscreen();else ajustarPantalla(false);
 }else{
  ajustarPantalla(true);
  try{if(mesada.requestFullscreen)await mesada.requestFullscreen()}catch{/* Conservar la vista expandida dentro de la ventana. */}
 }
};
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&mesada.classList.contains("ampliada"))ajustarPantalla(false)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.fullscreenElement&&mesada.classList.contains("ampliada"))ajustarPantalla(false)});
$("alternarReferencias").onclick=()=>{
 const abierta=mesada.classList.toggle("con-referencias");
 $("alternarReferencias").setAttribute("aria-expanded",String(abierta));schedule();
};
new ResizeObserver(schedule).observe(canvas);
const panelDatos=$("datosLaterales"),solapas=panelDatos.querySelector(".datos-tabs");
const seccionesDatos=[["estadisticas","Estadísticas"],["listaMacetas","Macetas"]];
function activarSolapa(id){
 for(const [nombre] of seccionesDatos){
  const activa=id===nombre,boton=$("tab-"+nombre);
  boton.setAttribute("aria-selected",String(activa));boton.tabIndex=activa?0:-1;
  $(nombre).hidden=!activa;
 }
}
for(const [id,label] of seccionesDatos){
 const panel=$(id),boton=document.createElement("button");
 boton.id="tab-"+id;boton.textContent=label;boton.type="button";
 boton.setAttribute("role","tab");boton.setAttribute("aria-controls",id);
 panel.setAttribute("role","tabpanel");panel.setAttribute("aria-labelledby",boton.id);
 boton.onclick=()=>activarSolapa(id);
 solapas.append(boton);panelDatos.append(panel);
}
solapas.onkeydown=e=>{
 const botones=[...solapas.children],i=botones.indexOf(e.target);
 if(i<0)return;
 const destino={ArrowLeft:(i+3)%4,ArrowRight:(i+1)%4,Home:0,End:3}[e.key];
 if(destino===undefined)return;
 e.preventDefault();botones[destino].click();botones[destino].focus();
};
function abrirSolapaEnlace(){
 const id=location.hash.slice(1);
 if(seccionesDatos.some(([key])=>key===id))activarSolapa(id);
}
document.querySelector(".portal-nav").addEventListener("click",e=>{
 const id=e.target.closest("a")?.hash.slice(1);
 if(seccionesDatos.some(([key])=>key===id))activarSolapa(id);
});
window.addEventListener("hashchange",abrirSolapaEnlace);
activarSolapa("estadisticas");abrirSolapaEnlace();
for(const [key,[nombre,unidad]] of Object.entries(variablesGrupo)){
 option($("statVar"),key,nombre+" ("+unidad+")");
}
$("statVar").onchange=()=>estadisticasLaterales(filtered());
function estadisticasLaterales(group){
 const [nombre,unidad,valor]=variablesGrupo[$("statVar").value];
 const suelos=["Pobre","Rico"].filter(s=>group.some(d=>d.sueloTipo===s));
 const datos=group.map(d=>({...d,area:FOLIAR[d.id]?.total,peso:PRELIMINARES[d.id]?.hojas_g}));
 const fecha=$("statVar").value==="altura"?" · "+$("measurement").selectedOptions[0].text:"";
 $("groupstats").innerHTML=suelos.length?'<p class="caption">'+nombre+' ('+unidad+')'+fecha+'</p>'+suelos.map(s=>summaryTable("Suelo "+s.toLowerCase(),datos.filter(d=>d.sueloTipo===s),d=>codes[d.tratamiento]||d.tratamiento,valor)).join("")+'<p class="caption">DE muestral dentro de cada tratamiento y suelo.</p>':"<p>Sin datos para estos filtros.</p>";
}
function datosPerfil(plantas){
 const cont=$("perfilVista"),vista=$("presets").querySelector('[aria-pressed="true"]')?.textContent;
 const fila=$("row").value,col=$("column").value;
 cont.hidden=!(["Frontal","Lateral derecha","Lateral izquierda","Posterior"].includes(vista)&&(fila||col));
 if(cont.hidden)return;
 const datos=plantas.map(d=>{
  const p=PRELIMINARES[d.id],valores=[cnum(d.altura),cnum(FOLIAR[d.id]?.total),cnum(p?.raiz_ml),cnum(p?.hojas_g),cnum(p?.nudos)];
  return '<tr><th scope="row">'+d.id+'</th><td>'+(codes[d.tratamiento]||d.tratamiento)+'</td><td>'+d.sueloTipo+'</td>'+valores.map(v=>'<td>'+v+'</td>').join("")+'</tr>';
 }).join("");
 cont.innerHTML='<h3>'+[vista,fila&&"Fila "+fila,col&&"Columna "+col].filter(Boolean).join(" · ")+'</h3><div class="scroll"><table><thead><tr>'+["Maceta","Tratamiento","Suelo",$("measurement").selectedOptions[0].text+" (cm)","Área foliar (cm²)","Volumen de raíces (mL)","Peso seco de hojas (g)","Nudos"].map(v=>'<th scope="col">'+v+'</th>').join("")+'</tr></thead><tbody>'+datos+'</tbody></table></div>';
 if(!datos)cont.insertAdjacentHTML("beforeend","<p>Sin macetas para esta selección.</p>");
}
async function copiarEscenaExportable(g,offset){
 const copiar=()=>g.drawImage(canvas,0,offset);
 copiar();
 try{g.getImageData(0,0,1,1);return}
 catch(error){if(error.name!=="SecurityError")throw error}
 // file:// puede aislar las imágenes vecinas. Usar las copias incrustadas
 // que también se usan para la lámina del comparador.
 const seleccion=selected().map(d=>d.id);
 const ids=seleccion.filter(id=>photos.has(id));
 const seguras=await Promise.all(ids.map(async id=>[id,(await imagenesLamina(id)).planta]));
 if(selected().map(d=>d.id).join()!==seleccion.join())throw Error("Cambió la selección durante la descarga");
 const originales=new Map(seleccion.filter(id=>photos.has(id)).map(id=>[id,photos.get(id)]));
 const invalidar=id=>{normalized.delete(id);shadowMaps.delete(id)};
 try{
  for(const id of originales.keys()){photos.delete(id);invalidar(id)}
  for(const [id,img] of seguras)if(img)photos.set(id,img);
  canvas.width=canvas.width;
  draw();
  g.canvas.width=g.canvas.width;
  copiar();
 }finally{
  for(const [id,img] of originales){photos.set(id,img);invalidar(id)}
  canvas.width=canvas.width;schedule();
 }
}
$("capturarMesada").onclick=async()=>{
 const btn=$("capturarMesada");
 btn.disabled=true;
 btn.textContent="Preparando PNG…";
 try{
 draw();
 const imagen=document.createElement("canvas"),cabecera=58;
 imagen.width=canvas.width;imagen.height=canvas.height+cabecera;
 const g=imagen.getContext("2d");
 await copiarEscenaExportable(g,cabecera);
 g.fillStyle="#f5f8f5";g.fillRect(0,0,imagen.width,cabecera);
 g.fillStyle="#24453a";g.font="600 15px Segoe UI, sans-serif";
 g.fillText("Mesada experimental · Ensayo de algodón",10,21,imagen.width-20);
 const vista=$("presets").querySelector('[aria-pressed="true"]')?.textContent||"Vista libre";
 const filtro=["block","row","column","treatment","soil","plant"].map(id=>$(id).value&&$(id).selectedOptions[0].text).filter(Boolean);
 const bloques=Array.from($("sceneBlocks").children,el=>el.textContent).join(", ");
 const resumen=[vista,bloques,...filtro,$("sunDate").value+" "+$("clock").textContent].filter(Boolean).join(" · ");
 g.font="12px Segoe UI, sans-serif";g.fillText(resumen,10,43,imagen.width-20);
 const blob=await new Promise(resolve=>imagen.toBlob(resolve,"image/png"));
 if(!blob)throw Error("PNG vacío");
  const link=document.createElement("a");link.href=URL.createObjectURL(blob);
  link.download="Mesada de algodón - "+vista+".png";link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),30000);
 }catch(error){
  console.error(error);
  btn.title="No se pudo guardar la imagen. Volvé a intentar.";
  btn.textContent="Reintentar descarga PNG";btn.disabled=false;return;
 }finally{btn.disabled=false}
 btn.textContent="Descargar vista PNG";btn.removeAttribute("title");
};
window.addEventListener("resize",()=>{schedule();drawReview()});refresh();

const apartadoPresentacion=new URLSearchParams(location.search).get("desde");
if(apartadoPresentacion&&/^[a-z][a-z0-9-]*$/.test(apartadoPresentacion)){
 const enlace=$("volverPresentacion");
 enlace.href="presentacion.html#"+apartadoPresentacion;
 enlace.hidden=false;
}
