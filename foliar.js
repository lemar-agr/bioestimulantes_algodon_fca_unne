"use strict";
const leafUI=id=>document.getElementById(id);
let leafIds=[],leafId="",leafOutlined=true;
const leafNumber=new Intl.NumberFormat("es-AR",{maximumFractionDigits:2});
function actualizarGaleriaFoliar(group,selection){
 const ids=group.map(plant=>plant.id).filter(id=>Object.hasOwn(FOLIAR,id));
 const select=leafUI("leafPlant");
 if(ids.join()!==leafIds.join()){
  select.replaceChildren(...ids.map(id=>new Option(id,id)));
  leafIds=ids;
 }
 leafId=ids.includes(selection)?selection:ids.includes(leafId)?leafId:(ids[0]||"");
 select.value=leafId;
 pintarGaleriaFoliar();
}
function pintarGaleriaFoliar(){
 const d=FOLIAR[leafId],index=leafIds.indexOf(leafId);
 leafUI("leafBody").hidden=!d;leafUI("leafScene").disabled=!d;
 leafUI("leafPrev").disabled=index<=0;leafUI("leafNext").disabled=index<0||index===leafIds.length-1;
 leafUI("leafIndex").textContent=d?(index+1)+" de "+leafIds.length:"Sin registros para este filtro";
 if(!d)return;
 const area=n=>leafNumber.format(n)+" cm²";
 for(const [id,value] of [["leafTotal",d.total],["leafStages",d.etapas],["leafOther",d.otras]])leafUI(id).textContent=area(value);
 leafUI("leafPlantId").textContent=leafId;
 mostrarPreliminares(leafId);
 const hasPortrait=Boolean(d.originalPlanta),showOutline=!hasPortrait||leafOutlined;
 leafUI("leafLeftCaption").textContent=hasPortrait?"Planta entera":"Foto original de las hojas";
 leafUI("leafMissing").hidden=hasPortrait;
 fotoEn(leafUI("leafPortrait"),leafId,hasPortrait?"planta":"hojas");
 leafUI("leafPortrait").alt=(hasPortrait?"Planta entera ":"Hojas fotografiadas de ")+leafId;
 leafUI("leafPlantLink").href=hasPortrait?d.originalPlanta:d.originalHojas;
 const image="foto.html?id="+leafId+"&tipo=contornos";
 fotoEn(leafUI("leafImage"),leafId,showOutline?"contornos":"hojas");leafUI("leafImage").alt=(showOutline?"Contornos medidos de ":"Fotografía de las hojas de ")+leafId;
 leafUI("leafLink").href=showOutline?image:d.originalHojas;
 leafUI("leafModes").hidden=!hasPortrait;
 leafUI("leafOutline").setAttribute("aria-pressed",String(showOutline));leafUI("leafPhoto").setAttribute("aria-pressed",String(!showOutline));
 leafUI("leafLegend").hidden=!showOutline;leafUI("leafNote").textContent=d.nota;leafUI("leafNote").hidden=!d.nota;
 leafUI("leafRows").replaceChildren(...d.hojas.map(([etapa,n,area,largo,ancho])=>{
  const row=document.createElement("tr");
  for(const value of [etapa,n||"—",area,largo,ancho])row.insertCell().textContent=typeof value==="number"?leafNumber.format(value):value??"—";
  return row;
 }));
}
function elegirFoliar(id){leafId=id;leafUI("leafPlant").value=id;pintarGaleriaFoliar()}
leafUI("leafPlant").onchange=e=>elegirFoliar(e.target.value);
leafUI("leafPrev").onclick=()=>elegirFoliar(leafIds[leafIds.indexOf(leafId)-1]);
leafUI("leafNext").onclick=()=>elegirFoliar(leafIds[leafIds.indexOf(leafId)+1]);
leafUI("leafOutline").onclick=()=>{leafOutlined=true;pintarGaleriaFoliar()};
leafUI("leafPhoto").onclick=()=>{leafOutlined=false;pintarGaleriaFoliar()};
leafUI("leafScene").onclick=()=>{const plant=leafUI("plant");plant.value=leafId;plant.dispatchEvent(new Event("change"));leafUI("scene").scrollIntoView({block:"center"})};
