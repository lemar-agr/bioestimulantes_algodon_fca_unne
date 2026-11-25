"use strict";
// NOAA fractional-year approximation. Local civil time in Corrientes is UTC−3.
function sunPosition(date, minutes, bearing) {
  const rad=Math.PI/180, lat=-27.458693*rad, lon=-58.821959;
  const year=Number(date.slice(0,4)), start=Date.UTC(year,0,1);
  const day=(Date.parse(date+"T00:00:00Z")-start)/86400000;
  const days=(Date.UTC(year+1,0,1)-start)/86400000;
  const g=2*Math.PI/days*(day+(minutes/60-12)/24);
  const c=Math.cos, s=Math.sin;
  const eq=229.18*(.000075+.001868*c(g)-.032077*s(g)-.014615*c(2*g)-.040849*s(2*g));
  const dec=.006918-.399912*c(g)+.070257*s(g)-.006758*c(2*g)+.000907*s(2*g)-.002697*c(3*g)+.00148*s(3*g);
  const hour=((minutes+eq+4*lon+180)/4-180)*rad;
  const east=-c(dec)*s(hour), north=c(lat)*s(dec)-s(lat)*c(dec)*c(hour);
  const up=s(lat)*s(dec)+c(lat)*c(dec)*c(hour), a=bearing*rad;
  return {alt:Math.asin(up)/rad,az:(Math.atan2(east,north)/rad+360)%360,
    dx:up>0?-(east*s(a)+north*c(a))/up:0,dy:up>0?-(-east*c(a)+north*s(a))/up:0};
}