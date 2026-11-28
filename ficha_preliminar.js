"use strict";
const fichaPreliminar=document.createElement("section");
fichaPreliminar.className="ficha-preliminar";
document.querySelector(".leaf-pair").after(fichaPreliminar);
function mostrarPreliminares(id){
 const d=PRELIMINARES[id];
 const numero=n=>n.toLocaleString("es-AR",{maximumFractionDigits:3});
 const lista=d.eventos.map(e=>e.nudo+" · "+(e.flores?"flor":e.pimpollos===2?"2 pimpollos":"pimpollo"));
 const pimp=d.eventos.reduce((s,e)=>s+e.pimpollos,0),flores=d.eventos.reduce((s,e)=>s+e.flores,0);
 const mediciones=[
  ["Altura final",numero(d.altura_cm)+" cm"],["Nudos totales",d.nudos],["Volumen de raíces",numero(d.raiz_ml)+" mL"],
  ["Peso seco de hojas",numero(d.hojas_g)+" g"],["Área foliar",numero(d.area_cm2)+" cm²"],
  ["Área foliar específica",d.hojas_g>0?numero(d.area_cm2/d.hojas_g)+" cm²/g":"—"],
  ["Masa foliar por área",d.area_cm2>0?numero(1000*d.hojas_g/d.area_cm2)+" mg/cm²":"—"]
 ];
 fichaPreliminar.innerHTML="<h3>Mediciones preliminares · "+id+"</h3><dl class='variables'>"+mediciones.map(([k,v])=>"<div><dt>"+k+"</dt><dd>"+v+"</dd></div>").join("")+"</dl><h4>Nudos reproductivos</h4><p>"+pimp+" pimpollos · "+flores+" flores</p><p>"+(lista.length?lista.join("　 /　 "):"Observada sin pimpollos ni flores.")+"</p><p class='hint'>Área foliar específica = área de las hojas / peso seco de hojas. Pesos secos de tallo, raíz y pimpollos pendientes. Fuente · DATOS PRELIMINARES.xlsx.</p>";
}
