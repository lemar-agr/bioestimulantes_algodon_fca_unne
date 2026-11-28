"use strict";
function iniciarCarruselPortada(galeria){
 const imagenes=[...galeria.querySelectorAll("img")];
 const movimiento=matchMedia("(prefers-reduced-motion: reduce)");
 let actual=0,temporizador;
 const visible=()=>!movimiento.matches&&!document.hidden&&!galeria.closest("[hidden]");
 function programar(posicion=(actual+1)%imagenes.length){
  clearTimeout(temporizador);
  if(!visible())return;
  const img=imagenes[posicion];
  if(!img.hasAttribute("src"))img.src=img.dataset.src;
  temporizador=setTimeout(()=>mostrar(posicion),5000);
 }
 async function mostrar(posicion){
  const anterior=actual,imagen=imagenes[posicion];
  try{await imagen.decode()}catch{
   if(actual===anterior)programar((posicion+1)%imagenes.length);
   return;
  }
  if(!visible()||actual!==anterior||posicion===actual)return;
  imagenes[actual].classList.remove("foto-activa");
  imagenes[actual].setAttribute("aria-hidden","true");
  actual=posicion;
  imagen.classList.add("foto-activa");
  imagen.setAttribute("aria-hidden","false");
  programar();
 }
 movimiento.addEventListener("change",()=>programar());
 document.addEventListener("visibilitychange",()=>programar());
 window.addEventListener("hashchange",()=>programar());
 programar();
 return programar;
}
