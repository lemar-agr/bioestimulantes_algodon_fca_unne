"use strict";
const colores={"Aminoácidos":"#2368aa","Hormonal":"#b93840","Trichoderma":"#24764e","Testigo":"#606c76"};
const variables={altura:"altura_cm",area:"area_cm2",raiz:"raiz_ml",peso:"hojas_g"};
const formato=new Intl.NumberFormat("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
for(const grafico of document.querySelectorAll(".graficos")){
 const clave=variables[grafico.dataset.variable];
 const suelos=["Pobre","Rico"].map(suelo=>({
  suelo,datos:Object.keys(colores).map(tratamiento=>{
   const valores=PLANTAS.filter(p=>p.sueloTipo===suelo&&p.tratamiento===tratamiento).map(p=>PRELIMINARES[p.id]?.[clave]).filter(Number.isFinite);
   const media=valores.length?valores.reduce((s,v)=>s+v,0)/valores.length:null;
   return {tratamiento,media};
  })
 }));
 const max=Math.max(1,...suelos.flatMap(s=>s.datos.map(d=>d.media)));
 grafico.innerHTML=suelos.map(({suelo,datos})=>'<div class="grupo"><strong>Suelo '+suelo.toLowerCase()+'</strong>'+datos.map(({tratamiento,media})=>
 '<div class="barra"><span>'+tratamiento+'</span><i aria-hidden="true"><b style="background:'+colores[tratamiento]+';width:'+((media??0)/max*100)+'%"></b></i><strong>'+ (media===null?"—":formato.format(media))+'</strong></div>').join("")+'</div>').join("");
}

const germColores=[["testigo","Testigo","#606c76"],["bio1","Hormonal","#b93840"],["bio2","Trichoderma","#24764e"],["bio3","Aminoácidos","#2368aa"]];
for(const grafico of document.querySelectorAll("[data-germ-dia]")){
 const registros=GERMINACION[grafico.dataset.germDia];
 grafico.innerHTML=[["env","Envejecidas"],["sin","Sin envejecer"]].map(([estado,titulo])=>{
  const barras=germColores.map(([tr,nombre,color])=>{
   const values=[1,2,3].map(rep=>registros[[tr,estado,rep].join("-")].emergencia);
   const media=values.reduce((s,v)=>s+v,0)/values.length;
   return '<div class="barra"><span>'+nombre+'</span><i aria-hidden="true"><b style="background:'+color+';width:'+media+'%"></b></i><strong>'+formato.format(media)+' %</strong></div>';
  }).join("");
  return '<div class="grupo"><strong>'+titulo+'</strong>'+barras+'</div>';
 }).join("");
}

const filminas=[...document.querySelectorAll("#filminas .filmina")];
const anterior=document.getElementById("anterior"),siguiente=document.getElementById("siguiente");
const contador=document.getElementById("pagina");
const germinacion=document.getElementById("entradaGerminacion"),crecimiento=document.getElementById("entradaCrecimiento");
let pagina=0;
const ajustarCarrusel=iniciarCarruselPortada(document.getElementById("fotosPortada"));

function destinoEnsayo(ref,id){
 const url=new URL(ref,location.href);
 url.searchParams.set("desde",id);
 return url.href;
}
for(const enlace of document.querySelectorAll('article[id] a[href^="visor.html"],article[id] a[href^="index.html"][href$="#germinacion"]')){
 enlace.href=destinoEnsayo(enlace.getAttribute("href"),enlace.closest("article").id);
}
function mostrarFilmina(indice,guardar=true){
 pagina=Math.max(0,Math.min(filminas.length-1,indice));
 const activa=filminas[pagina];
 filminas.forEach((filmina,i)=>filmina.hidden=i!==pagina);
 anterior.disabled=pagina===0;
 siguiente.disabled=pagina===filminas.length-1;
 contador.textContent=(pagina+1)+" / "+filminas.length;
 germinacion.href=destinoEnsayo("index.html#germinacion",activa.id);
 crecimiento.href=destinoEnsayo("visor.html",activa.id);
 if(guardar&&location.hash!=="#"+activa.id){
  try{history.replaceState(null,"","#"+activa.id)}
  catch{location.hash=activa.id}
 }
 ajustarCarrusel();
 window.scrollTo(0,0);
}
function leerFilmina(){
 if(!habilitada)return;
 const indice=filminas.findIndex(f=>"#"+f.id===location.hash);
 mostrarFilmina(indice<0?0:indice,false);
}
anterior.onclick=()=>mostrarFilmina(pagina-1);
siguiente.onclick=()=>mostrarFilmina(pagina+1);
document.getElementById("filminas").onclick=e=>{
 if(e.target.closest("a,button,input,select,textarea")||window.getSelection()?.toString())return;
 mostrarFilmina(pagina+1);
};
document.addEventListener("keydown",e=>{
 if(!habilitada||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat||e.target.closest("input,select,textarea"))return;
 if((e.key===" "||e.key==="Enter")&&e.target.closest("a,button"))return;
 const destinos={ArrowLeft:pagina-1,ArrowUp:pagina-1,PageUp:pagina-1,Backspace:pagina-1,
  ArrowRight:pagina+1,ArrowDown:pagina+1,PageDown:pagina+1," ":pagina+1,Enter:pagina+1,
  Home:0,End:filminas.length-1};
 if(!Object.hasOwn(destinos,e.key))return;
 e.preventDefault();
 mostrarFilmina(destinos[e.key]);
});
window.addEventListener("hashchange",leerFilmina);

const acceso=document.getElementById("accesoPresentacion");
const presentacion=document.getElementById("presentacion");
const formAcceso=document.getElementById("formAcceso");
const clavePresentacion=document.getElementById("clavePresentacion");
const errorAcceso=document.getElementById("errorAcceso");
const sesionPresentacion="tesis-presentacion-desbloqueada";
let habilitada=false;
function abrirPresentacion(){
 habilitada=true;
 acceso.hidden=true;
 presentacion.hidden=false;
 presentacion.focus({preventScroll:true});
 leerFilmina();
}
formAcceso.addEventListener("submit",e=>{
 e.preventDefault();
 if(clavePresentacion.value!=="512837"){
  errorAcceso.textContent="La clave es incorrecta.";
  clavePresentacion.setAttribute("aria-invalid","true");
  clavePresentacion.select();
  return;
 }
 try{sessionStorage.setItem(sesionPresentacion,"1")}catch{}
 clavePresentacion.value="";
 abrirPresentacion();
});
clavePresentacion.addEventListener("input",()=>{
 clavePresentacion.removeAttribute("aria-invalid");errorAcceso.textContent="";
});
try{if(sessionStorage.getItem(sesionPresentacion)==="1")abrirPresentacion()}catch{}
