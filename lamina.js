async function imagenesLamina(id){
 const tipos={hojas:"contornos"};
 if(FOLIAR[id].originalPlanta)tipos.planta="escena";
 const pares=await Promise.all(Object.entries(tipos).map(async ([k,t])=>{
 const im=new Image();im.src=await recurso(id,t);await im.decode();return [k,im];
 }));return Object.fromEntries(pares);
}
function dibujarPar(ctx,img,cal,i,x,y,w,h){
 const d=cal.dims[i],s=Math.min(w/cal.width,h/cal.height);
 ctx.drawImage(img,x+(w-d.w*s)/2,y+(h-cal.height*s)/2+(cal.above-d.foot)*s,d.w*s,d.h*s);
}
const botonExportarComparacion=document.getElementById("cmpExport");
if(botonExportarComparacion) botonExportarComparacion.onclick=async()=>{
 const btn=cmp("cmpExport"),a=lado("A"),b=lado("B"),grupo=cmp("cmpMode").value!=="id",scope=alcance(),dif=textoDiferencia(a,b),cal=calibracionPar(a,b);
 btn.disabled=true;cmp("cmpStatus").textContent="Preparando la lámina…";
 try{
  const cv=document.createElement("canvas");cv.width=3840;cv.height=2160;
  const g=cv.getContext("2d");g.scale(2,2);g.fillStyle="#f5f7f4";g.fillRect(0,0,1920,1080);
  function texto(s,x,y,size,bold=false,color="#1b392e"){g.fillStyle=color;g.font=(bold?"600 ":"")+size+"px Segoe UI, sans-serif";g.fillText(s,x,y)}
  texto("Efecto de Bioestimulantes en la Germinación y en el Crecimiento Vegetativo",64,72,40,true);
  texto("del Cultivo de Algodón (Gossypium hirsutum L.)",64,125,40,true);
  texto(scope,64,184,25);
  const imgs=grupo?[]:await Promise.all([a,b].map(v=>imagenesLamina(v.nombre)));
  for(const [i,v] of [a,b].entries()){
   const x=64+910*i;g.fillStyle="white";g.fillRect(x,220,880,646);
   texto((i?"B":"A")+" · "+v.nombre,x+30,284,38,true);
   texto(grupo?v.ds.length+" macetas":v.ds[0].tratamiento+" · Suelo "+v.ds[0].sueloTipo.toLowerCase(),x+30,333,27);
   texto((grupo?"Altura media":"Altura")+" · "+lineaMedida(v.h,"cm",grupo),x+30,401,30,true);
   texto((grupo?"Área foliar media":"Área foliar")+" · "+lineaMedida(v.a,"cm²",grupo),x+30,453,30,true);
   if(grupo){
    for(const [j,k] of ["h","a"].entries()){
     const max=Math.max(a[k].media,b[k].media);const y=556+j*118;
     texto(k==="h"?"Altura media (cm)":"Área foliar media (cm²)",x+30,y,23);
     g.fillStyle="#e2ebe6";g.fillRect(x+30,y+18,800,32);g.fillStyle=i?"#447c9a":"#357357";g.fillRect(x+30,y+18,max?800*v[k].media/max:0,32);
    }
    texto("DE muestral · n = macetas con medición",x+30,819,23);
   }else{
    for(const [j,key] of ["planta","hojas"].entries()){
     const im=imgs[i][key],left=x+30+j*415;
     if(im){
      if(!j&&cal)dibujarPar(g,im,cal,i,left,480,392,312);
      else{const scale=Math.min(392/im.width,312/im.height);g.drawImage(im,left+(392-im.width*scale)/2,480+(312-im.height*scale)/2,im.width*scale,im.height*scale);}
     }
     texto(j?"Hojas con contornos":!im?"Foto de planta pendiente":cal?"Planta a escala común":"Planta · escala individual",left,831,23);
    }
   }
  }
  texto(dif,64,938,31,true);
  texto("Gonzalez Leandro Martín  ·  Facultad de Ciencias Agrarias — UNNE",64,1020,28);
  const blob=await new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(new Error("Falló la exportación PNG")),"image/png"));
  const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="Algodón - "+a.nombre+" y "+b.nombre+".png";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000);
  cmp("cmpStatus").textContent="Lámina PNG generada · 3840 × 2160 px.";
 }catch(err){cmp("cmpStatus").textContent="No se pudo generar la lámina. "+err.message}
 finally{btn.disabled=!cmpData.length}
};
