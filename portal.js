"use strict";
const $=id=>document.getElementById(id);
let block;
function choices(id,values,label){
 const control=$(id);control.replaceChildren(new Option(label,""));
 for(const v of new Set(values))control.add(new Option(v,v));
}
function group(){return REGISTROS.filter(d=>d.block===block&&(!$("soil").value||d.soil===$("soil").value)&&(!$("trt").value||d.trt===$("trt").value))}
function filter(){choices("plant",group().map(d=>d.id),"Todas");render()}
function render(){
 const ds=group().filter(d=>!$("plant").value||d.id===$("plant").value);
 $("count").textContent=ds.length+" plantas";
 $("records").replaceChildren(...ds.map(d=>{
  const row=document.createElement("tr");
  for(const value of [d.id,d.trt,d.soil,...d.h.map(v=>v===null?"—":v.toLocaleString("es-AR",{maximumFractionDigits:2}))])row.insertCell().textContent=value;
  const cell=row.insertCell();
  if(d.photo){const a=document.createElement("a");a.href=d.photo;a.target="_blank";a.rel="noopener";a.textContent="Ver foto";cell.append(a)}else cell.textContent="—";
  return row;
 }));
}
function navigate(){
 const route=location.hash.slice(1),m=/^bloque-([12])$/.exec(route);
 const active=m?"mediciones":["crecimiento","germinacion"].includes(route)?route:"inicio";
 for(const section of document.querySelectorAll("main>section"))section.hidden=section.id!==active;
 if(m){block=m[1];$("blocktitle").textContent="Crecimiento vegetativo · Bloque "+block;const ds=REGISTROS.filter(d=>d.block===block);
 choices("soil",ds.map(d=>d.soil),"Ambos");choices("trt",ds.map(d=>d.trt),"Todos");filter();
 document.querySelectorAll(".tabs a").forEach(a=>a.setAttribute("aria-current",a.hash===location.hash?"page":"false"));
 }
 window.scrollTo(0,0);
}
$("soil").onchange=$("trt").onchange=filter;$("plant").onchange=render;
window.addEventListener("hashchange",navigate);navigate();