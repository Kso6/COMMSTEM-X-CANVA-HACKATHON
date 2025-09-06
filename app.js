// app.js
const appState = {
  map: null,
  layers: { heat: null, impact: null, trees: L.layerGroup(), readings: L.layerGroup() },
  points: [],
  readings: JSON.parse(localStorage.getItem('canopy_readings')||'[]'),
  treePolygons: [],
  ui: { mode: 'heat' }
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
  refreshInsights();
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

function refreshInsights(){
  const list = document.getElementById('insightsList');
  list.innerHTML = '';
  const mode = appState.ui.mode;
  if(mode==='heat'){
    const hottest = [...appState.points].sort((a,b)=>b[2]-a[2])[0];
    const avg = appState.points.reduce((s,p)=>s+p[2],0)/appState.points.length;
    addInsight(`Hottest hotspot: ${hottest[2]}°C`);
    addInsight(`Average hotspot temp: ${avg.toFixed(1)}°C`);
    addInsight('Tip: target shaded corridors near transit stops.');
  } else if(mode==='impact'){
    const factor = 1.5 * (getCoolingPercent()/10);
    addInsight(`Estimated cooling in hotspots: -${factor.toFixed(1)}°C`);
    addInsight('Up to 12% lower A/C demand within 500m radius.');
    addInsight('Prioritize schoolyards and parking lots.');
  } else if(mode==='trees'){
    addInsight('Drag on map to paint tree clusters.');
    addInsight('Native species maximize biodiversity.');
  } else if(mode==='readings'){
    addInsight('Crowdsource micro-climate data street by street.');
    addInsight(`${appState.readings.length} community readings saved locally.`);
  }
}

function addInsight(text){
  const li = document.createElement('li');
  li.textContent = text;
  document.getElementById('insightsList').appendChild(li);
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
  refreshInsights();
  if(!localStorage.getItem('canopy_seen')){
    document.getElementById('onboarding').showModal();
    localStorage.setItem('canopy_seen','1');
  }
});
