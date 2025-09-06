// app.js
const appState = {
  map: null,
  layers: { heat: null, impact: null, trees: L.layerGroup(), treeIcons: L.layerGroup() },
  points: [],
  treePolygons: [],
  ui: { mode: 'heat' },
  weather: { lastCenter: null, data: null }
};

function initMap(){
  const start = [-33.8688, 151.2093]; // Sydney coordinates
  const map = L.map('map',{ zoomControl:true }).setView(start, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);
  appState.map = map;

  // Key Sydney locations for real temperature data
  const sydneyLocations = [
    // Sydney CBD and Inner City
    {lat: -33.8688, lng: 151.2093, name: "Sydney CBD"},
    {lat: -33.8695, lng: 151.2085, name: "Martin Place"},
    {lat: -33.8705, lng: 151.2105, name: "Town Hall"},
    {lat: -33.8680, lng: 151.2120, name: "Hyde Park"},
    {lat: -33.8568, lng: 151.2153, name: "The Rocks"},
    {lat: -33.8590, lng: 151.2110, name: "Circular Quay"},
    {lat: -33.8752, lng: 151.2380, name: "Kings Cross"},
    {lat: -33.8789, lng: 151.2405, name: "Darlinghurst"},
    {lat: -33.8820, lng: 151.2090, name: "Surry Hills"},
    {lat: -33.8882, lng: 151.1932, name: "Newtown"},
    {lat: -33.8910, lng: 151.1980, name: "Redfern"},
    {lat: -33.8780, lng: 151.1850, name: "Glebe"},
    
    // Northern Suburbs
    {lat: -33.8370, lng: 151.2140, name: "North Sydney"},
    {lat: -33.8280, lng: 151.2200, name: "Kirribilli"},
    {lat: -33.8200, lng: 151.2300, name: "Neutral Bay"},
    {lat: -33.7680, lng: 151.1543, name: "Macquarie Park"},
    
    // Eastern Suburbs
    {lat: -33.8950, lng: 151.2450, name: "Paddington"},
    {lat: -33.9148, lng: 151.2321, name: "Randwick"},
    {lat: -33.9300, lng: 151.2800, name: "Bondi Junction"},
    {lat: -33.8920, lng: 151.2770, name: "Bondi Beach"},
    
    // Western Suburbs
    {lat: -33.8697, lng: 151.1070, name: "Parramatta"},
    {lat: -33.8500, lng: 151.0800, name: "Auburn"},
    {lat: -33.8200, lng: 151.0300, name: "Blacktown"},
    
    // Southern Suburbs
    {lat: -33.9173, lng: 151.0642, name: "Bankstown"},
    {lat: -33.9500, lng: 151.1400, name: "Hurstville"},
    {lat: -33.9800, lng: 151.1800, name: "Sutherland"},
  ];

  // Initialize empty layers
  appState.layers.heat = L.layerGroup();
  appState.layers.heat.addTo(map);
  
  // Fetch real temperature data for all locations
  fetchRealHeatmapData(sydneyLocations);

  // Trees layer (user paint) - don't add by default
  // Tree icons layer (build but don't add to map yet)
  buildTreeIconsLayer();

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
  const rectangles = appState.points.map(([lat,lng,temp])=>{
    const cooled = Math.max(20, temp - factor);
    const color = tempColor(cooled);
    // Create impact area as rectangle representing building blocks
    const offsetLat = 0.004; // larger impact area
    const offsetLng = 0.006; // larger impact area
    const bounds = [
      [lat - offsetLat, lng - offsetLng],
      [lat + offsetLat, lng + offsetLng]
    ];
    return L.rectangle(bounds, { 
      color: color, 
      fillColor: color, 
      fillOpacity: 0.3, 
      weight: 1,
      stroke: true
    }).bindTooltip(`Impact: -${(temp-cooled).toFixed(1)}°C`);
  });
  appState.layers.impact = L.layerGroup(rectangles);
}

// Fetch real temperature data from OpenWeather API
async function fetchRealHeatmapData(locations) {
  const key = 'acce1388ea5659880c18e478e553acec';
  const temperatureData = [];
  
  try {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    // Fetch temperature data for each location (with rate limiting)
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${key}&units=metric`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const temp = data.main?.temp || 20; // fallback temperature
          temperatureData.push({
            lat: location.lat,
            lng: location.lng,
            temp: temp,
            name: location.name,
            feels_like: data.main?.feels_like || temp,
            humidity: data.main?.humidity || 50
          });
        } else {
          // Fallback for failed requests
          temperatureData.push({
            lat: location.lat,
            lng: location.lng, 
            temp: 22, // default temp
            name: location.name,
            feels_like: 22,
            humidity: 50
          });
        }
        
        // Rate limit: wait 100ms between requests to avoid overwhelming the API
        if (i < locations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.log(`Failed to fetch data for ${location.name}:`, error);
        // Add fallback data
        temperatureData.push({
          lat: location.lat,
          lng: location.lng,
          temp: 22,
          name: location.name,
          feels_like: 22,
          humidity: 50
        });
      }
    }
    
    // Store the real data
    appState.points = temperatureData.map(d => [d.lat, d.lng, d.temp]);
    
    // Build heat layer with real data
    buildRealHeatLayer(temperatureData);
    
    // Build impact and tree layers with real data
    buildImpactLayer(getCoolingPercent());
    buildTreeIconsLayer();
    
    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    // Fall back to default behavior if API fails completely
  }
}

function buildRealHeatLayer(temperatureData) {
  appState.layers.heat.clearLayers();
  
  temperatureData.forEach(data => {
    const c = tempColor(data.temp);
    // Create a small rectangular area around the point to represent a building block
    const offsetLat = 0.002; // roughly 200m
    const offsetLng = 0.003; // roughly 200m  
    const bounds = [
      [data.lat - offsetLat, data.lng - offsetLng],
      [data.lat + offsetLat, data.lng + offsetLng]
    ];
    
    const rectangle = L.rectangle(bounds, { 
      color: c, 
      fillColor: c, 
      fillOpacity: 0.6, 
      weight: 2,
      stroke: true
    }).bindTooltip(`
      <strong>${data.name}</strong><br/>
      Temperature: ${data.temp.toFixed(1)}°C<br/>
      Feels like: ${data.feels_like.toFixed(1)}°C<br/>
      Humidity: ${data.humidity}%
    `);
    
    appState.layers.heat.addLayer(rectangle);
  });
}

function buildTreeIconsLayer(){
  if(appState.layers.treeIcons){ appState.layers.treeIcons.clearLayers(); }
  
  // Create custom tree icon using the tree asset
  const treeIcon = L.icon({
    iconUrl: 'Tree art.png',
    iconSize: [32, 32], // size of the icon
    iconAnchor: [16, 32], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -32] // point from which the popup should open relative to the iconAnchor
  });

  // Create tree markers at hotspot locations to show impact of tree planting
  const treeMarkers = appState.points.map(([lat,lng,temp])=>{
    return L.marker([lat, lng], {icon: treeIcon})
      .bindTooltip(`Tree planted - Cooling: -2.5°C`);
  });
  
  appState.layers.treeIcons = L.layerGroup(treeMarkers);
}

function toggleMode(mode){
  appState.ui.mode = mode;
  const { map, layers } = appState;
  // Remove all layers first
  [layers.heat, layers.impact, layers.trees, layers.treeIcons].forEach(l=> l && map.removeLayer(l));
  
  if(mode==='heat'){ 
    layers.heat && layers.heat.addTo(map);
  } 
  if(mode==='trees'){ 
    // When trees mode is activated, show tree icons instead of hotspots
    layers.treeIcons && layers.treeIcons.addTo(map);
    layers.trees && layers.trees.addTo(map); // Also show the user-painted trees
  } 
}

// Removed unused reading functionality to simplify the app

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
  // Simplified UI event handlers
  document.getElementById('openOnboarding').addEventListener('click',()=>document.getElementById('onboarding').showModal());
  
  // Main CTA button - plant trees and show impact
  document.getElementById('plantTrees').addEventListener('click',()=>{
    document.getElementById('coolingSlider').value = 20;
    buildImpactLayer(getCoolingPercent());
    toggleMode('trees');
    // Show the impact slider
    document.getElementById('impactSlider').style.display = 'block';
    // Update button states
    setActiveViewButton('toggleTrees');
  });
  
  // Cooling slider updates
  document.getElementById('coolingSlider').addEventListener('input',()=>{
    buildImpactLayer(getCoolingPercent());
    if(appState.ui.mode === 'trees'){ 
      toggleMode('trees'); 
    }
  });
  
  // Simplified view toggles
  const setActiveViewButton = (activeId) => {
    ['toggleHeat', 'toggleTrees'].forEach(id => {
      document.getElementById(id).classList.toggle('active', id === activeId);
    });
  };
  
  document.getElementById('toggleHeat').addEventListener('click',()=>{
    toggleMode('heat');
    setActiveViewButton('toggleHeat');
    // Hide impact slider when viewing heat data
    document.getElementById('impactSlider').style.display = 'none';
  });
  
  document.getElementById('toggleTrees').addEventListener('click',()=>{
    toggleMode('trees');
    setActiveViewButton('toggleTrees');
    // Show impact slider when viewing tree impact
    document.getElementById('impactSlider').style.display = 'block';
  });
  
  document.getElementById('githubLink').href = 'https://github.com/Kso6/COMMSTEM-X-CANVA-HACKATHON';
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
