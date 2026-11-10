// Independent NOAA sunrise/sunset (NOAA_Solar_Calculations_day spreadsheet), written from scratch for the check.
const R = Math.PI/180;
function jdUTC(y,m,d,hoursUT){ // Julian Day of civil UTC date+time
  if (m<=2){y-=1;m+=12;} const A=Math.floor(y/100), B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+hoursUT/24;
}
function sunCrossUTC(y,m,d,lat,lon,zenith,rising,tzHoursGuess){
  // iterate: start with local noon
  let t = 12 - tzHoursGuess; // hours UT of local civil noon
  for(let i=0;i<3;i++){
    const JC=(jdUTC(y,m,d,t)-2451545)/36525;
    const L0=(280.46646+JC*(36000.76983+JC*0.0003032))%360;
    const M=357.52911+JC*(35999.05029-0.0001537*JC);
    const e=0.016708634-JC*(0.000042037+0.0000001267*JC);
    const C=Math.sin(M*R)*(1.914602-JC*(0.004817+0.000014*JC))+Math.sin(2*M*R)*(0.019993-0.000101*JC)+Math.sin(3*M*R)*0.000289;
    const trueL=L0+C;
    const appL=trueL-0.00569-0.00478*Math.sin((125.04-1934.136*JC)*R);
    const eps0=23+(26+(21.448-JC*(46.815+JC*(0.00059-JC*0.001813)))/60)/60;
    const eps=eps0+0.00256*Math.cos((125.04-1934.136*JC)*R);
    const decl=Math.asin(Math.sin(eps*R)*Math.sin(appL*R))/R;
    const vy=Math.tan(eps/2*R)**2;
    const eqt=4/R*(vy*Math.sin(2*L0*R)-2*e*Math.sin(M*R)+4*e*vy*Math.sin(M*R)*Math.cos(2*L0*R)-0.5*vy*vy*Math.sin(4*L0*R)-1.25*e*e*Math.sin(2*M*R));
    const cosHA=Math.cos(zenith*R)/(Math.cos(lat*R)*Math.cos(decl*R))-Math.tan(lat*R)*Math.tan(decl*R);
    if (cosHA<-1||cosHA>1) return null;
    const HA=Math.acos(cosHA)/R;
    const solarNoonMinUTC=720-4*lon-eqt; // minutes UTC
    const minUTC=solarNoonMinUTC+(rising?-4:4)*HA;
    t=minUTC/60;
  }
  return new Date(Date.UTC(y,m-1,d)+t*3600000);
}
const fmt=(d,tz)=>d?new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:tz}).format(d)+" "+d.toISOString():"null";
export { sunCrossUTC, fmt };
if (import.meta.url===`file://${process.argv[1]}`){
  // Known reference: Greenwich (51.4769, 0) sunset 2000-06-21: NOAA calculator gives 21:21 BST = 20:21 UTC approx (solstice)
  console.log("Greenwich 2000-06-21 sunset UTC", fmt(sunCrossUTC(2000,6,21,51.4769,0,90.833,false,0),"UTC"));
  console.log("Greenwich 2000-06-21 sunrise UTC", fmt(sunCrossUTC(2000,6,21,51.4769,0,90.833,true,0),"UTC"));
  // Equator on equinox: sunrise ~06:00 local solar -> 05:57 UTC at lon 0 (refraction + semidiameter brings it earlier by ~3.5 min, minus eq of time)
  console.log("Equator 2026-03-20 sunrise", fmt(sunCrossUTC(2026,3,20,0,0,90.833,true,0),"UTC"));
  for (const [name,lat,lon] of [["Toronto",43.65,-79.38],["Richmond Hill",43.87,-79.44]])
    for (const d of [6,13]) {
      const ss=sunCrossUTC(2026,11,d,lat,lon,90.833,false,-5);
      const hv=sunCrossUTC(2026,11,d+1,lat,lon,98.5,false,-5);
      const ssSat=sunCrossUTC(2026,11,d+1,lat,lon,90.833,false,-5);
      console.log(name,`2026-11-${d}`,"sunset",fmt(ss,"America/Toronto"),"candles-18",fmt(new Date(ss-18*60000),"America/Toronto"));
      console.log("   sat",`2026-11-${d+1}`,"sunset",fmt(ssSat,"America/Toronto"),"tzeit8.5",fmt(hv,"America/Toronto"));
    }
}
