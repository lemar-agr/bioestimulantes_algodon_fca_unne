"use strict";
const paquetes={}, solicitudes=new Map(), solicitudesImg=new WeakMap();
function recurso(id,tipo){
 const familia=["escena","revision"].includes(tipo)?tipo:"galeria";
 const nombre=familia+"-"+id.slice(0,2);
 if(!solicitudes.has(nombre)){
  solicitudes.set(nombre,new Promise((ok,fallo)=>{
   const s=document.createElement("script");s.src=nombre+".js";s.onload=ok;
   s.onerror=()=>{solicitudes.delete(nombre);fallo(new Error("Falta "+nombre))};document.head.append(s);
  }));
 }
 return solicitudes.get(nombre).then(()=>{
  const url=paquetes[nombre]?.[id]?.[tipo];
  if(!url)throw Error("Imagen no disponible");return url;
 });
}
function fotoEn(img,id,tipo){
 const ticket={};solicitudesImg.set(img,ticket);
 recurso(id,tipo).then(url=>{if(solicitudesImg.get(img)===ticket)img.src=url})
 .catch(()=>{if(solicitudesImg.get(img)===ticket)img.dispatchEvent(new Event("error"))});
}