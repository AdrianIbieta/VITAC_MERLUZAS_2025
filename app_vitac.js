
// ====== CONFIG ======
const DATA_URL = 'data.json?v=' + Date.now();
const FIXED_CLASSES = Array.from({length:22}, (_,i)=>{ const lo=15+i*5, hi=lo+4; return `${lo}-${hi}`; });
const LOGO_CANDIDATES = ['logo_vitac.png','logo vitac.png','logo_vitac.jpg','logo_vitac.jpeg','logo_vitac.PNG','logo_vitac.svg'];

// ====== UTILS ======
function setLogo(){
  const img = document.getElementById('logo-img');
  let i=0; img.onerror=()=>{ i++; if(i<LOGO_CANDIDATES.length) img.src=LOGO_CANDIDATES[i]; };
  img.src = LOGO_CANDIDATES[0];
}
function toDMS(lat, lon){
  function conv(v, isLat){
    if(v==null || isNaN(v)) return '';
    const hem = v < 0 ? (isLat ? 'S' : 'W') : (isLat ? 'N' : 'E');
    const abs = Math.abs(v);
    const deg = Math.floor(abs);
    const mins = (abs - deg) * 60;
    return `${deg}\u00B0${mins.toFixed(1)}'${hem}`;
  }
  return { lat: conv(lat, true), lon: conv(lon, false) };
}
function normalize(arr){
  const out = new Array(FIXED_CLASSES.length).fill(0);
  if(Array.isArray(arr)){ for(let i=0;i<Math.min(arr.length,out.length);i++) out[i] = Number(arr[i]||0); }
  return out;
}
function statsFromFreq(arr){
  const total = arr.reduce((a,b)=>a+b,0);
  let max=0, idx=-1; for(let i=0;i<arr.length;i++){ if(arr[i]>max){max=arr[i]; idx=i;} }
  const first = arr.findIndex(v=>v>0);
  const last = arr.length-1-[...arr].reverse().findIndex(v=>v>0);
  const rango = (first===-1) ? '–' : `${FIXED_CLASSES[first]} / ${FIXED_CLASSES[last]}`;
  return { total, max, moda: FIXED_CLASSES[idx]||'–', rango };
}

// ====== STATE ======
let DATA=null, current=null;
let chartMcola=null, chartMsur=null, chartDonut=null;
let mapL=null, marker=null;

// ====== DATA LOAD ======
async function loadData(){
  const r = await fetch(DATA_URL, {cache:'no-store'});
  if(!r.ok) throw new Error('No se pudo cargar '+DATA_URL+' ('+r.status+')');
  const j = await r.json();
  if(!j || !Array.isArray(j.lances) || j.lances.length===0) throw new Error('El JSON no trae "lances".');
  if(!j.freq || !j.freq.Mcola || !j.freq.Msur) throw new Error('Faltan bloques "freq.Mcola/Msur".');
  DATA = j;
}

// ====== UI ======
function buildSelector(){
  const cont = document.getElementById('selector'); cont.innerHTML='';
  DATA.lances.forEach(n=>{
    const b=document.createElement('button'); b.textContent='Lance '+n; b.dataset.lance=n;
    b.onclick=()=>setCurrent(n); cont.appendChild(b);
  });
  setCurrent(DATA.lances[0]);
}
function setCurrent(n){
  current=Number(n);
  document.querySelectorAll('#selector button').forEach(b=>b.classList.toggle('active', Number(b.dataset.lance)===current));
  updateAll();
}

// ====== CHARTS ======
function drawMcola(){
  const ctx=document.getElementById('chartMcola').getContext('2d');
  const data=normalize(DATA.freq.Mcola[current]||[]);
  const ds=[{label:'Lance '+current,data,borderColor:'#f28e2b',pointBackgroundColor:'#f28e2b',fill:false,tension:0.3,borderWidth:2,pointRadius:3}];
  if(chartMcola){ chartMcola.data.labels=FIXED_CLASSES; chartMcola.data.datasets=ds; chartMcola.options.plugins.title.text='Merluza de Cola – Lance '+current; chartMcola.update(); }
  else { chartMcola=new Chart(ctx,{type:'line',data:{labels:FIXED_CLASSES,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'},title:{display:true,text:'Merluza de Cola'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Frecuencia'}},x:{title:{display:true,text:'Clase de Talla (cm)'}}}}); }
  const s=statsFromFreq(data);
  document.getElementById('valModa').textContent=s.moda;
  document.getElementById('valFrec').textContent=s.max;
  document.getElementById('valRango').textContent=s.rango;
  document.getElementById('valTotal').textContent=s.total;
}
function drawMsur(){
  const ctx=document.getElementById('chartMsur').getContext('2d');
  const data=normalize(DATA.freq.Msur[current]||[]);
  const ds=[{label:'Lance '+current,data,borderColor:'#4e79a7',pointBackgroundColor:'#4e79a7',fill:false,tension:0.3,borderWidth:2,pointRadius:3}];
  if(chartMsur){ chartMsur.data.labels=FIXED_CLASSES; chartMsur.data.datasets=ds; chartMsur.options.plugins.title.text='Merluza del Sur – Lance '+current; chartMsur.update(); }
  else { chartMsur=new Chart(ctx,{type:'line',data:{labels:FIXED_CLASSES,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'},title:{display:true,text:'Merluza del Sur'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Frecuencia'}},x:{title:{display:true,text:'Clase de Talla (cm)'}}}}); }
  const s=statsFromFreq(data);
  document.getElementById('valModaS').textContent=s.moda;
  document.getElementById('valFrecS').textContent=s.max;
  document.getElementById('valRangoS').textContent=s.rango;
  document.getElementById('valTotalS').textContent=s.total;
}
function drawDonut(){
  const ctx=document.getElementById('donutCapt').getContext('2d');
  const vals=DATA.donut[current]||[0,0,0];
  if(chartDonut){ chartDonut.data.datasets[0].data=vals; chartDonut.options.plugins.title.text='Capturas – Lance '+current; chartDonut.update(); }
  else { chartDonut=new Chart(ctx,{type:'doughnut',data:{labels:['Merluza Sur','Merluza Cola','Otros'],datasets:[{data:vals,backgroundColor:['#4e79a7','#f28e2b','#76b7b2'],borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},title:{display:true,text:'Capturas'}}}}); }
  const info=DATA.info[current]||{};
  const pt=DATA.coords[current];
  if(pt && pt.length===2){
    const d=toDMS(pt[0], pt[1]);
    document.getElementById('metaLat').textContent=d.lat;
    document.getElementById('metaLon').textContent=d.lon;
  } else {
    const fecha = info.Fecha || info.fecha || '';
    document.getElementById('metaFecha').textContent=fecha;
    document.getElementById('metaLat').textContent=info.Lat||'';
    document.getElementById('metaLon').textContent=info.Lon||'';
  }
  document.getElementById('metaFecha').textContent=(info.Fecha||info.fecha||'');
  document.getElementById('kgMcola').textContent=((info.Mcola||0)).toFixed(1);
  document.getElementById('kgMsur').textContent=((info.Msur||0)).toFixed(1);
  document.getElementById('kgOtros').textContent=((info.Otros||0)).toFixed(1);
}

// ====== MAP ======
function initMap(){
  mapL=L.map('mapLance').setView([-43,-75],6);
  const bathy=L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:13,attribution:'© Esri, GEBCO, NOAA'}).addTo(mapL);
  const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'});
  L.control.layers({'Bathymetry (Esri)':bathy,'OSM estándar':osm},null,{position:'topright'}).addTo(mapL);
  L.control.scale({ position:'bottomleft', metric:true, imperial:true }).addTo(mapL);
  marker=L.marker([-43,-75]).addTo(mapL);
}
function updateMap(){
  if(!mapL) initMap();
  const pt=DATA.coords[current];
  if(pt && pt.length===2){
    marker.setLatLng(pt); mapL.setView(pt,7);
    marker.bindTooltip('Lance '+current,{permanent:true,direction:'top',offset:[0,-10]});
  }
}

// ====== FLOW ======
function updateAll(){ drawMcola(); drawMsur(); drawDonut(); updateMap(); }

(async function(){
  try{
    setLogo();
    await loadData();
    buildSelector();
  }catch(err){
    console.error(err);
    alert('Error cargando datos: '+err.message);
  }
})();
