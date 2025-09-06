// app.js
const appState = {
  map: null,
  layers: { heat: null, impact: null, trees: L.layerGroup(), readings: L.layerGroup() },
  points: [],
  readings: JSON.parse(localStorage.getItem('canopy_readings')||'[]'),
  treePolygons: [],
  ui: { mode: 'heat' },
  weather: { lastCenter: null, data: null }
};

function initMap(){
  const start = [40.7128,-74.0060];
  const map = L.map('map',{ zoomControl:true }).setView(start, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);
  appState.map = map;

  // Sample synthetic heat points (NYC-ish)
  const hotspots = [
    [40.7549,-73.9840,38],[40.7306,-73.9866,36],[40.7000,-73.9200,37],[40.6782,-73.9442,39],
    [40.8075,-73.9626,35],[40.8241,-73.9448,37],[40.8484,-73.9419,36],[40.7128,-74.0060,34]
  ];
  appState.points = hotspots;

  // Render as circle markers for now (no heat plugin). Color by temp
  appState.layers.heat = L.layerGroup(hotspots.map(([lat,lng,temp])=>{
    const c = tempColor(temp);
    return L.circleMarker([lat,lng],{ radius:14, color:c, fillColor:c, fillOpacity:.55, weight:2 }).bindTooltip(`${temp.toFixed(1)}°C`);
  }));
  appState.layers.heat.addTo(map);

  // Trees layer (user paint)
  appState.layers.trees.addTo(map);

  // Readings layer
  appState.layers.readings.addTo(map);
  renderReadings();

  // Handle click for placing reading when modal open
  map.on('click', (e)=>{
    if(document.getElementById('readingModal').open){
      const m = L.marker(e.latlng,{opacity:.7});
      m.addTo(map).bindTooltip('Position selected',{permanent:false});
      m._isTemp = true;
    }
  });

  // Simple impact overlay based on slider
  buildImpactLayer(getCoolingPercent());

  // Fetch weather initially and on move end (debounced)
  fetchWeatherForCenter();
  let weatherTimer = null;
  map.on('moveend', ()=>{
    clearTimeout(weatherTimer);
    weatherTimer = setTimeout(fetchWeatherForCenter, 250);
  });

  document.getElementById('locateMe')?.addEventListener('click', ()=>{
    if(!navigator.geolocation){ return alert('Geolocation not available'); }
    navigator.geolocation.getCurrentPosition((pos)=>{
      const { latitude, longitude } = pos.coords;
      appState.map.setView([latitude, longitude], 13);
    }, ()=> alert('Unable to access location'));
  });
}

function tempColor(t){
  if(t>=40) return '#d7191c';
  if(t>=37) return '#fdae61';
  if(t>=34) return '#ffffbf';
  if(t>=30) return '#abd9e9';
  return '#2c7bb6';
}

function getCoolingPercent(){
  const v = Number(document.getElementById('coolingSlider').value||'10');
  return v;
}

function buildImpactLayer(percent){
  if(appState.layers.impact){ appState.layers.impact.remove(); }
  const factor = 1.5 * (percent/10); // degC drop in hotspots per +10% canopy
  const circles = appState.points.map(([lat,lng,temp])=>{
    const cooled = Math.max(20, temp - factor);
    const color = tempColor(cooled);
    return L.circle([lat,lng],{ radius: 500, color, fillColor: color, fillOpacity:.22, weight:1 })
      .bindTooltip(`Impact: -${(temp-cooled).toFixed(1)}°C`);
  });
  appState.layers.impact = L.layerGroup(circles);
}

function toggleMode(mode){
  appState.ui.mode = mode;
  const { map, layers } = appState;
  [layers.heat, layers.impact, layers.trees, layers.readings].forEach(l=> l && map.removeLayer(l));
  if(mode==='heat'){ layers.heat && layers.heat.addTo(map);} 
  if(mode==='impact'){ layers.impact && layers.impact.addTo(map);} 
  if(mode==='trees'){ layers.trees && layers.trees.addTo(map);} 
  if(mode==='readings'){ layers.readings && layers.readings.addTo(map);} 
}

function renderReadings(){
  const group = appState.layers.readings;
  group.clearLayers();
  appState.readings.forEach(r=>{
    const m = L.marker(r.latlng);
    m.bindPopup(`<strong>${r.temp}°C</strong><br/>${r.notes||''}`);
    group.addLayer(m);
  });
}

function saveReading(temp, notes){
  let lastClick = null;
  const toRemove = [];
  appState.map.eachLayer(l=>{ if(l instanceof L.Marker && l._isTemp){ lastClick = l.getLatLng(); toRemove.push(l);} });
  toRemove.forEach(l=> appState.map.removeLayer(l));
  if(!lastClick){ alert('Click the map to place your reading pin.'); return; }
  appState.readings.push({ latlng: lastClick, temp: Number(temp), notes });
  localStorage.setItem('canopy_readings', JSON.stringify(appState.readings));
  renderReadings();
  refreshInsights();
}

// Weather integration (OpenWeather Current Weather)
async function fetchWeatherForCenter(){
  const center = appState.map.getCenter();
  const lat = center.lat.toFixed(4);
  const lon = center.lng.toFixed(4);
  const key = 'acce1388ea5659880c18e478e553acec';
  try{
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('weather http '+res.status);
    const data = await res.json();
    appState.weather = { lastCenter: {lat,lon}, data };
    renderWeather();

    // Also fetch simple forecast (every 3 hours) and AQI
    fetchForecast(lat, lon, key);
    fetchAQI(lat, lon, key);
  }catch(err){
    // optional: show minimal error state
    const el = document.getElementById('wUpdated');
    if(el) el.textContent = 'Weather unavailable';
  }
}

async function fetchForecast(lat, lon, key){
  try{
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    const res = await fetch(url); if(!res.ok) throw new Error('forecast http '+res.status);
    const data = await res.json();
    const items = (data.list||[]).slice(0,5).map(x=>({
      time: new Date(x.dt*1000), temp: Math.round(x.main?.temp ?? 0), icon: x.weather?.[0]?.icon
    }));
    renderForecast(items);
  }catch(e){ /* ignore */ }
}

async function fetchAQI(lat, lon, key){
  try{
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
    const res = await fetch(url); if(!res.ok) throw new Error('aqi http '+res.status);
    const data = await res.json();
    const aqi = data.list?.[0]?.main?.aqi || 0; // 1..5
    const label = ['—','Good','Fair','Moderate','Poor','Very Poor'][aqi] || '—';
    setText('wAQI', `AQI ${aqi} (${label})`);
  }catch(e){ /* ignore */ }
}

function renderWeather(){
  const d = appState.weather?.data; if(!d) return;
  const city = d.name || 'Here';
  const temp = Math.round(d.main?.temp ?? 0);
  const feels = Math.round(d.main?.feels_like ?? 0);
  const hum = Math.round(d.main?.humidity ?? 0);
  const wind = (d.wind?.speed ?? 0).toFixed(1);
  const cond = (d.weather && d.weather[0] && d.weather[0].description) ? d.weather[0].description : '—';
  const now = new Date();
  const fmt = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  setText('wCity', city);
  setText('wTemp', String(temp));
  setText('wFeels', `feels like ${feels}°C`);
  setText('wHum', `${hum}% humidity`);
  setText('wWind', `${wind} m/s wind`);
  setText('wCond', capitalize(cond));
  setText('wUpdated', `Updated ${fmt}`);
  const icon = d.weather?.[0]?.icon; // e.g. 10d
  const iconUrl = icon ? `https://openweathermap.org/img/wn/${icon}.png` : '';
  const img = document.getElementById('wIcon'); if(img) { img.src = iconUrl; img.classList.remove('skeleton'); }
  ['wCity','wTemp','wFeels','wHum','wWind','wCond'].forEach(id=>document.getElementById(id)?.classList.remove('skeleton'));
}

function setText(id, text){ const el=document.getElementById(id); if(el) el.textContent=text; }
function capitalize(s){ return s? s.charAt(0).toUpperCase()+s.slice(1): s; }

function renderForecast(items){
  const wrap = document.getElementById('wForecast'); if(!wrap) return;
  wrap.innerHTML = '';
  items.forEach(it=>{
    const t = it.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `${t} <span class="small">${it.temp}°C</span>`;
    wrap.appendChild(el);
  });
}

function enableTreePainting(){
  let isMouseDown = false;
  const paint = (latlng)=>{
    const poly = L.circle(latlng,{ radius:18, color:'#60d394', fillColor:'#60d394', fillOpacity:.25, weight:1 });
    appState.layers.trees.addLayer(poly);
    appState.treePolygons.push(poly);
  };
  appState.map.on('mousedown', ()=>{ if(appState.ui.mode==='trees'){ isMouseDown=true; }});
  appState.map.on('mouseup', ()=> isMouseDown=false );
  appState.map.on('mousemove', (e)=>{ if(isMouseDown && appState.ui.mode==='trees'){ paint(e.latlng); }});
  appState.map.on('click', (e)=>{ if(appState.ui.mode==='trees'){ paint(e.latlng); }});
}

function initUI(){
  document.getElementById('openOnboarding').addEventListener('click',()=>document.getElementById('onboarding').showModal());
  document.getElementById('plantTrees').addEventListener('click',()=>{
    document.getElementById('coolingSlider').value = 20;
    buildImpactLayer(getCoolingPercent());
    toggleMode('impact');
  });
  document.getElementById('addReading').addEventListener('click',()=>{
    document.getElementById('readingModal').showModal();
  });
  document.getElementById('saveReading').addEventListener('click',(e)=>{
    e.preventDefault();
    const t = document.getElementById('readingTemp').value;
    const n = document.getElementById('readingNotes').value;
    saveReading(t,n);
    document.getElementById('readingModal').close();
  });
  document.getElementById('coolingSlider').addEventListener('input',()=>{
    buildImpactLayer(getCoolingPercent());
    if(appState.ui.mode==='impact'){ toggleMode('impact'); }
  });
  const setActive=(id,active)=>{ const el=document.getElementById(id); el.classList.toggle('active',active); };
  document.getElementById('toggleHeat').addEventListener('click',()=>{ toggleMode('heat'); setActive('toggleHeat',true);['toggleImpact','toggleTrees','toggleReadings'].forEach(id=>setActive(id,false)); });
  document.getElementById('toggleImpact').addEventListener('click',()=>{ toggleMode('impact'); setActive('toggleImpact',true);['toggleHeat','toggleTrees','toggleReadings'].forEach(id=>setActive(id,false)); });
  document.getElementById('toggleTrees').addEventListener('click',()=>{ toggleMode('trees'); setActive('toggleTrees',true);['toggleHeat','toggleImpact','toggleReadings'].forEach(id=>setActive(id,false)); });
  document.getElementById('toggleReadings').addEventListener('click',()=>{ toggleMode('readings'); setActive('toggleReadings',true);['toggleHeat','toggleImpact','toggleTrees'].forEach(id=>setActive(id,false)); });
  document.getElementById('githubLink').href = '#';
}

window.addEventListener('DOMContentLoaded',()=>{
  initMap();
  initUI();
  enableTreePainting();
  if(!localStorage.getItem('canopy_seen')){
    document.getElementById('onboarding').showModal();
    localStorage.setItem('canopy_seen','1');
  }
});
