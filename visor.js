"use strict";
const $=id=>document.getElementById(id), canvas=$("scene"), ctx=canvas.getContext("2d");
const rows="ABCDEFGH", photos=new Map(), review=$("review"), rc=review.getContext("2d");
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
const copy=p=>JSON.parse(JSON.stringify(p));
function points(d){return corrections[d.id]||d.p}
const filters={treatment:"tratamiento",soil:"sueloTipo",row:"fila",column:"col"};
const finalById=new Map(PLANTAS.map(d=>[d.id,d.altura]));
const photoMode=()=>$("measurement").value==="foto";
const blockColors={"1":"#b93840","2":"#2368aa","3":"#24764e"};
function dataset(){
 if(photoMode())return PLANTAS;
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
$("block").value=["1","2","3"].includes(requested)?requested:"3";
function syncMeasurement(){
 const photo=$("block").value==="3";
 $("measurement").querySelector('[value="foto"]').disabled=!!$("block").value&&!photo;
 if(photo)$("measurement").value="foto";
 else if(photoMode())$("measurement").value="2";
}
syncMeasurement();filterOptions();
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
$("inference").innerHTML=ANALISIS_ALTURAS;
function summaryTable(title,data,key){
 const groups=new Map();
 for(const plant of data){
  const label=key(plant);
  if(!groups.has(label))groups.set(label,[]);
  groups.get(label).push(plant.altura);
 }
 const number=n=>(Math.round(n*100+1e-9)/100).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
 const body=Array.from(groups,([name,values])=>{
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
  for(const el of [document.querySelector(".analysis"),$("openReview")])el.hidden=!photographic;
  $("positions").hidden=photographic;
  $("sceneNote").textContent=block==="1"||block==="2"?"Bloque "+block+" · espacio reservado para las fotografías calibradas.":
   !block&&photographic?"Altura final disponible para las 80 plantas del bloque 3. Bloques 1 y 2 pendientes.":
   !block?"Bloque 3 fotografiado. Bloques 2 y 1 reservados. Las fechas cambian la tabla; la escena conserva la calibración fotográfica.":
   photographic?"Bloque 3 · reconstrucción con las fotografías calibradas.":"Bloque 3 · la tabla muestra la fecha elegida. Las fotografías conservan su calibración.";
  if(!photographic){
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
  $("groupstats").innerHTML=group.length?'<p class="caption">Alturas de las '+group.length+' macetas del filtro · '+measureName+' · cm</p>'+
   summaryTable("Por tratamiento",group,d=>d.tratamiento)+summaryTable("Por suelo",group,d=>d.sueloTipo)+
   '<details><summary>Tratamiento × suelo</summary>'+summaryTable("Combinaciones presentes",group,d=>d.tratamiento+" · "+d.sueloTipo)+'</details>'+
   '<p class="caption">DE muestral entre macetas. Con una sola observación se muestra —.</p>':'<p>Sin datos para esta combinación.</p>';
  actualizarGaleriaFoliar(group,$("plant").value);
  actualizarComparador(group);
  $("visible").textContent=active.length+" de "+dataset().length+" seleccionadas";
  $("count").textContent=group.length+" registros";
  $("empty").hidden=active.length>0;
  $("openReview").disabled=!active.length;
  $("records").innerHTML=group.map(d=>'<tr data-plant="'+d.id+'" class="'+(d.id===$("plant").value?'active':'')+'"><td><button aria-label="Ver planta '+d.id+'">'+d.id+'</button></td><td><i class="dot" style="background:'+d.color+'"></i>'+d.tratamiento+'</td><td>'+fmt(d.altura)+' cm</td>'+(photographic?'':'<td>'+finalText(d.id)+'</td>')+'</tr>').join("");
  schedule();
}
for(const [n,a,e] of [["Desde el borde",...defaults],["Isométrica",45,35.264],["Frontal",0,0],["Lateral derecha",90,0],["Lateral izquierda",-90,0],["Posterior",180,0],["Superior",0,90]]){
 const b=document.createElement("button");b.textContent=n;if(["Posterior","Lateral izquierda","Lateral derecha"].includes(n))b.title="Cambia el punto de vista de la mesada. Cada planta conserva su cara fotografiada.";b.setAttribute("aria-pressed",String(n==="Desde el borde"));b.onclick=()=>{for(const other of $("presets").children)other.setAttribute("aria-pressed",String(other===b));perspective=n==="Desde el borde";az=a;el=e;zoom=1;schedule()};$("presets").append(b);
}
$("block").onchange=()=>{stopSun();syncMeasurement();filterOptions();fillPlants();refresh()};
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
$("showSigns").onchange=()=>{$("greenhouseSigns").hidden=!$("showSigns").checked};
function magnify(k){zoom=Math.max(.45,Math.min(5,zoom*k));schedule()}
$("minus").onclick=()=>magnify(.8);$("plus").onclick=()=>magnify(1.25);
$("reset").onclick=()=>{$("presets").firstElementChild.click()};
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY,az,el]};
canvas.onpointermove=e=>{if(drag){for(const button of $("presets").children)button.setAttribute("aria-pressed","false");az=drag[2]-(e.clientX-drag[0])*.35;el=Math.max(0,Math.min(90,drag[3]+(e.clientY-drag[1])*.3));schedule()}};
let posicionesClic=[];
canvas.onpointercancel=()=>drag=null;
canvas.onpointerup=e=>{
 const clic=drag && Math.hypot(e.clientX-drag[0],e.clientY-drag[1])<4;
 drag=null;
 if(!clic)return;
 const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 const hit=posicionesClic.slice().reverse().find(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);
 if(hit){
  $("cmpMode").value="id";actualizarGrupos(hit.id);elegirFoliar(hit.id);
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
const normalized=new Map(), pixelsPerCm=10;
function calibratedPhoto(d){
 const raw=photos.get(d.id),p=points(d),cached=normalized.get(d.id);
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
  g.drawImage(raw,0,y,raw.width,h,x1-left,y1-top,Math.round((x0+w0)*k)-x1,Math.round((y0+h0)*k)-y1);
 }
 const entry={img,points:p,box:[left,top,right,bottom]};
 normalized.set(d.id,entry);makeShadow(d.id,img);return entry;
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
 const [w,h]=size(canvas,ctx),active=selected();
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
 const scale=Math.min((w-70)/Math.max(1,hi-lo),(h-65)/Math.max(1,bottom-top))*zoom;
 const project=(x,y,z=0)=>{let [u,v]=optical(x,y,z);return [w/2+(u-(lo+hi)/2)*scale,h/2+(v-(top+bottom)/2)*scale]};
 function tag(s,x,y,color="#36534a"){ctx.fillStyle=color;ctx.font="12px Segoe UI, sans-serif";ctx.textAlign="center";ctx.fillText(s,x,y)}
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
 for(const n of new Set(active.map(d=>d.id[0]))){
  const offset=(3-Number(n))*550;
  const left=Math.max(minX,offset-26),right=Math.min(maxX,offset+521);
  polygon([[left,minY],[right,minY],[right,minY+4],[left,minY+4]],blockColors[n]);

 }
 for(let i=0;i<active.length;i++){
  if(active[i].id[0]==="3")continue;
  const {x,y}=positions[i],[u,v]=project(x,y);
  ctx.beginPath();ctx.arc(u,v,2,0,2*Math.PI);ctx.fillStyle=blockColors[active[i].id[0]];ctx.fill();
  posicionesClic.push({id:active[i].id,l:u-4,r:u+4,t:v-4,b:v+4});

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
 for(const [x,y,z,t] of [[maxX,minY,0,"X"],[minX,maxY,0,"Y"],[minX,minY,120,"Z · cm"]]){
  const q=project(x,y,z);if(Math.hypot(q[0]-origin[0],q[1]-origin[1])<2)continue;line(origin,q,"#749385");tag(t,q[0],q[1]-7);
 }
 if(el<83)for(let z=0;z<=120;z+=20){const [x,y]=project(minX,minY,z);line([x-3,y],[x+3,y],"#729283");tag(z,x-15,y+4)}
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
  if(ce<.0001){line([u-7*scale,v],[u+7*scale,v],d.color,2)}
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

}
function makeShadow(id,im){
 const sh=document.createElement("canvas");sh.height=300;sh.width=Math.max(1,Math.round(sh.height*im.width/im.height));
 const g=sh.getContext("2d");g.filter="blur(0.9px)";g.drawImage(im,0,0,sh.width,sh.height);
 g.filter="none";g.globalCompositeOperation="source-in";g.fillStyle="#435046";g.fillRect(0,0,sh.width,sh.height);
 shadowMaps.set(id,sh);
}
let index=0;
function loadNext(){if(index>=PLANTAS.length)return;const d=PLANTAS[index++],im=new Image();
 im.onload=()=>{photos.set(d.id,im);
loaded++;progress();schedule();loadNext()};
 im.onerror=()=>{failed++;progress();loadNext()};fotoEn(im,d.id,"escena");
}
function progress(){$("state").textContent=loaded+" / 80 fotografías cargadas"+(failed?" · "+failed+" errores de lectura":"")}
for(let i=0;i<4;i++)loadNext();
let current,raw,draft,detail=false,transform,focusPoint;
function reviewMessage(s){$("reviewMsg").textContent=s}
function choose(){
 current=PLANTAS.find(d=>d.id===$("rid").value);draft=copy(points(current));detail=false;transform=null;
 const img=new Image();raw=img;img.onload=()=>{if(raw===img)drawReview()};
 img.onerror=()=>reviewMessage("No se pudo abrir el original. Verificá la ruta registrada en el inventario.");
 fotoEn(img,current.id,'revision');reviewMessage(current.id+" · "+current.altura.toLocaleString("es-AR")+" cm · "+(corrections[current.id]?"revisada":current.estado));drawReview();
}
function drawReview(){
 if(!$("dialog").open)return;const [w,h]=size(review,rc);if(!raw||!raw.naturalWidth)return;
 const k=detail?Math.min(w/450,h/310):Math.min(w/raw.width,h/raw.height);
 const [cx,cy]=detail?focusPoint:[raw.width/2,raw.height/2],ox=w/2-cx*k,oy=h/2-cy*k;
 transform={k,ox,oy};rc.drawImage(raw,ox,oy,raw.width*k,raw.height*k);
 const names={suelo:"Sustrato",nudo:"Último nudo",apoyo:"Apoyo"};
 for(const [key,[x,y]] of Object.entries(draft)){
  const u=ox+x*k,v=oy+y*k;rc.strokeStyle=key===$("point").value?"#b2215c":"#15629a";rc.lineWidth=2;
  rc.beginPath();rc.arc(u,v,7,0,2*Math.PI);rc.moveTo(u-11,v);rc.lineTo(u+11,v);rc.moveTo(u,v-11);rc.lineTo(u,v+11);rc.stroke();
  rc.font="bold 13px Segoe UI";rc.fillStyle="white";rc.fillRect(u+12,v-15,rc.measureText(names[key]).width+7,18);rc.fillStyle=rc.strokeStyle;rc.fillText(names[key],u+15,v-2);
 }
}
$("openReview").onclick=()=>{$("rid").value=$("plant").value||selected()[0].id;$("dialog").showModal();choose()};
$("close").onclick=()=>$("dialog").close();$("rid").onchange=choose;
function focus(){focusPoint=[...draft[$("point").value]];detail=true;drawReview()}
$("point").onchange=focus;$("detail").onclick=focus;$("whole").onclick=()=>{detail=false;drawReview()};
review.onclick=e=>{if(!transform)return;const rect=review.getBoundingClientRect(),{k,ox,oy}=transform;
 const x=Math.round((e.clientX-rect.left-ox)/k),y=Math.round((e.clientY-rect.top-oy)/k);
 if(x>=0&&x<raw.width&&y>=0&&y<raw.height){draft[$("point").value]=[x,y];reviewMessage("Cambio pendiente de confirmación · ("+x+", "+y+") px");drawReview()}
};
$("save").onclick=()=>{
 if(!(draft.nudo[1]<current.maceta.union_y && draft.apoyo[1]>current.maceta.borde_y && draft.nudo[1]<draft.suelo[1]&&draft.suelo[1]<draft.apoyo[1])){reviewMessage("Revisá el orden vertical de los puntos.");return}
 corrections[current.id]=copy(draft);
 try{localStorage.setItem(storageKey,JSON.stringify(corrections));reviewMessage("Calibración aplicada. Descargá las correcciones para regenerar los PNG.")}catch{reviewMessage("Calibración aplicada en esta sesión. Descargá las correcciones para conservarla.")}
 refresh();
};
$("export").onclick=()=>{const blob=new Blob([JSON.stringify(corrections,null,2)],{type:"application/json"}),a=document.createElement("a");a.download="correcciones.json";a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
window.addEventListener("resize",()=>{schedule();drawReview()});refresh();
