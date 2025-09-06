// app.js
const appState = {
  map: null,
  layers: { heat: null, impact: null, trees: L.layerGroup(), treeIcons: L.layerGroup() },
  points: [],
  treePolygons: [],
  treeDensities: {}, // Track tree density for each heat spot
  selectedHeatSpot: null, // Track which heat spot is selected
  ui: { mode: 'heat' },
  weather: { lastCenter: null, data: null }
};

function initMap(){
  const start = [-33.7500, 151.0500]; // Centered to show all suburbs
  const map = L.map('map',{ zoomControl:true }).setView(start, 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);
  appState.map = map;

  // Specific Sydney suburbs with dense sampling points to find hottest spots
  const sydneySuburbs = [
    {
      name: "Redfern",
      samplingPoints: [
        {lat: -33.8917, lng: 151.1998}, // Redfern Station (transport hub)
        {lat: -33.8925, lng: 151.2010}, // Commercial district
        {lat: -33.8905, lng: 151.1985}, // Industrial area
        {lat: -33.8935, lng: 151.2020}, // Dense residential
        {lat: -33.8900, lng: 151.2005}, // Mixed development
      ]
    },
    {
      name: "Camperdown",
      samplingPoints: [
        {lat: -33.8886, lng: 151.1853}, // RPA Hospital complex
        {lat: -33.8875, lng: 151.1835}, // University of Sydney
        {lat: -33.8895, lng: 151.1865}, // Commercial strip
        {lat: -33.8870, lng: 151.1845}, // Dense urban area
        {lat: -33.8905, lng: 151.1875}, // Mixed residential
      ]
    },
    {
      name: "Rozelle",
      samplingPoints: [
        {lat: -33.8615, lng: 151.1712}, // Rozelle Bay (industrial)
        {lat: -33.8625, lng: 151.1725}, // Commercial center
        {lat: -33.8605, lng: 151.1700}, // Dense residential
        {lat: -33.8635, lng: 151.1735}, // Mixed development
        {lat: -33.8620, lng: 151.1715}, // Transport corridor
      ]
    },
    {
      name: "Chatswood",
      samplingPoints: [
        {lat: -33.7967, lng: 151.1831}, // Chatswood Chase (shopping)
        {lat: -33.7975, lng: 151.1845}, // Train station area
        {lat: -33.7955, lng: 151.1820}, // Commercial district
        {lat: -33.7985, lng: 151.1855}, // High-rise residential
        {lat: -33.7960, lng: 151.1835}, // Mixed development
      ]
    },
    {
      name: "Marsden Park",
      samplingPoints: [
        {lat: -33.7025, lng: 150.8454}, // Industrial estate
        {lat: -33.7035, lng: 150.8465}, // Commercial development
        {lat: -33.7015, lng: 150.8445}, // New residential
        {lat: -33.7045, lng: 150.8475}, // Mixed development
        {lat: -33.7030, lng: 150.8460}, // Transport hub
      ]
    },
    {
      name: "Kellyville",
      samplingPoints: [
        {lat: -33.7113, lng: 150.9518}, // Shopping center
        {lat: -33.7125, lng: 150.9530}, // Dense residential
        {lat: -33.7105, lng: 150.9510}, // Commercial strip
        {lat: -33.7135, lng: 150.9540}, // New developments
        {lat: -33.7120, lng: 150.9525}, // Mixed suburban
      ]
    },
    {
      name: "Glenhaven",
      samplingPoints: [
        {lat: -33.7065, lng: 151.0135}, // Commercial center
        {lat: -33.7075, lng: 151.0145}, // Dense residential
        {lat: -33.7055, lng: 151.0125}, // Suburban area
        {lat: -33.7085, lng: 151.0155}, // Mixed development
        {lat: -33.7070, lng: 151.0140}, // Transport area
      ]
    },
    {
      name: "Hornsby",
      samplingPoints: [
        {lat: -33.7051, lng: 151.0993}, // Hornsby Station (major hub)
        {lat: -33.7065, lng: 151.1005}, // Shopping center
        {lat: -33.7040, lng: 151.0985}, // Commercial district
        {lat: -33.7075, lng: 151.1015}, // Dense residential
        {lat: -33.7055, lng: 151.0995}, // Mixed development
      ]
    }
  ];

  // Initialize empty layers
  appState.layers.heat = L.layerGroup();
  appState.layers.heat.addTo(map);

  // Fetch real temperature data and identify heat islands per suburb
  fetchHeatIslandData(sydneySuburbs);

  // Trees layer (user paint) - don't add by default
  // Tree icons layer (build but don't add to map yet)
  buildTreeIconsLayer();

  // Simple impact overlay based on initial tree count
  buildImpactLayer(getTreeCount());

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

function getTreeCount(){
  const v = Number(document.getElementById('coolingSlider').value||'3');
  return v;
}

function buildImpactLayer(numTrees){
  if(appState.layers.impact){ appState.layers.impact.remove(); }
  // Oak tree cooling effect: ~0.8°C per tree in immediate vicinity
  const coolingPerTree = 0.8;
  const totalCooling = Math.min(5.0, numTrees * coolingPerTree); // Cap at 5°C max
  
  const rectangles = appState.points.map(([lat,lng,temp])=>{
    const cooled = Math.max(20, temp - totalCooling);
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
    }).bindTooltip(`Impact: -${totalCooling.toFixed(1)}°C from ${numTrees} oak trees`);
  });
  appState.layers.impact = L.layerGroup(rectangles);
}

// Fetch temperature data for all sampling points and identify heat islands per suburb
async function fetchHeatIslandData(suburbs) {
  const key = 'acce1388ea5659880c18e478e553acec';
  const heatIslands = [];
  
  try {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    // Process each suburb to find its hottest spot
    for (let suburb of suburbs) {
      const suburbTemperatures = [];
      
      // Sample all points in this suburb
      for (let point of suburb.samplingPoints) {
        try {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lng}&appid=${key}&units=metric`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            const temp = data.main?.temp || 20;
            suburbTemperatures.push({
              lat: point.lat,
              lng: point.lng,
              temp: temp,
              feels_like: data.main?.feels_like || temp,
              humidity: data.main?.humidity || 50,
              suburb: suburb.name
            });
          }
          
          // Rate limit: wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`Failed to fetch data for ${suburb.name} point:`, error);
        }
      }
      
      // Find the hottest spot in this suburb (heat island)
      if (suburbTemperatures.length > 0) {
        const hottestSpot = suburbTemperatures.reduce((hottest, current) => 
          current.temp > hottest.temp ? current : hottest
        );
        
        // Only include if it's significantly hot (above median + threshold)
        const suburbMedianTemp = suburbTemperatures
          .map(p => p.temp)
          .sort((a, b) => a - b)[Math.floor(suburbTemperatures.length / 2)];
        
        // Always show the hottest spot in each suburb (reduced threshold)
        // Heat island threshold: at least 0.1°C above suburb median, or if it's the hottest
        if (hottestSpot.temp >= suburbMedianTemp + 0.1 || suburbTemperatures.length > 0) {
          heatIslands.push({
            ...hottestSpot,
            name: `${suburb.name} Heat Island`,
            tempDifference: (hottestSpot.temp - suburbMedianTemp).toFixed(1)
          });
        }
      }
    }
    
    // Store the heat island data
    appState.points = heatIslands.map(h => [h.lat, h.lng, h.temp]);
    
    // Build heat layer with real heat island data
    buildRealHeatLayer(heatIslands);
    
    // Build impact and tree layers
    buildImpactLayer(getTreeCount());
    buildTreeIconsLayer();
    
    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    console.log(`Found ${heatIslands.length} real heat islands across Sydney suburbs`);
    
  } catch (error) {
    console.error('Error fetching heat island data:', error);
    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

// Legacy function - keeping for compatibility
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

function buildRealHeatLayer(heatIslandData) {
  appState.layers.heat.clearLayers();
  
  heatIslandData.forEach(data => {
    const c = tempColor(data.temp);
    // Create a larger rectangular area to represent the heat island zone
    const offsetLat = 0.003; // roughly 300m - larger for heat islands
    const offsetLng = 0.004; // roughly 400m  
    const bounds = [
      [data.lat - offsetLat, data.lng - offsetLng],
      [data.lat + offsetLat, data.lng + offsetLng]
    ];
    
    const rectangle = L.rectangle(bounds, { 
      color: c, 
      fillColor: c, 
      fillOpacity: 0.7, // More prominent for heat islands
      weight: 3,
      stroke: true,
      className: 'heat-spot-clickable'
    }).bindTooltip(`
      <strong>${data.name}</strong><br/>
      🌡️ Temperature: ${data.temp.toFixed(1)}°C<br/>
      🔥 ${data.tempDifference}°C above suburb average<br/>
      Feels like: ${data.feels_like.toFixed(1)}°C<br/>
      Humidity: ${data.humidity}%<br/>
      <em>Click to plant trees in this heat island</em>
    `);
    
    // Make heat islands clickable for tree planting
    rectangle.on('click', function(e) {
      selectHeatSpot(data);
      L.DomEvent.stopPropagation(e);
    });
    
    appState.layers.heat.addLayer(rectangle);
  });
}

function selectHeatSpot(data) {
  appState.selectedHeatSpot = data;
  
  // Store the selected heat spot in treeDensities if not exists
  const spotKey = `${data.lat}_${data.lng}`;
  if (!appState.treeDensities[spotKey]) {
    appState.treeDensities[spotKey] = 3; // Start with 3 trees
  }
  
  // Visual feedback - highlight selected heat spot
  appState.layers.heat.eachLayer(layer => {
    if (layer.getBounds) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      if (Math.abs(center.lat - data.lat) < 0.002 && Math.abs(center.lng - data.lng) < 0.002) {
        layer.setStyle({ weight: 4, color: '#10b981', fillOpacity: 0.8 }); // Highlight selected
      } else {
        layer.setStyle({ weight: 2, fillOpacity: 0.6 }); // Reset others
      }
    }
  });
  
  // Update UI to show selection
  const plantButton = document.getElementById('plantTrees');
  plantButton.textContent = `🌳 Plant Trees in ${data.name}`;
  plantButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
}

function buildTreeIconsLayer(){
  if(appState.layers.treeIcons){ appState.layers.treeIcons.clearLayers(); }
  
  const treeMarkers = [];
  
  // Only show trees if there's a selected heat spot
  const spotsToProcess = appState.selectedHeatSpot ? 
    [[appState.selectedHeatSpot.lat, appState.selectedHeatSpot.lng, appState.selectedHeatSpot.temp]] : 
    []; // Don't show any trees if no heat spot is selected
  
  spotsToProcess.forEach(([lat, lng, temp], index) => {
    const spotKey = `${lat}_${lng}`;
    // Use slider value directly as number of trees
    const numTrees = getTreeCount();
    
    // Create trees in a small cluster for the heat spot
    for (let i = 0; i < numTrees; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.001; // small random offset within ~100m
      const offsetLng = (Math.random() - 0.5) * 0.001;
      
      // Consistent size for mature oak trees (30px = ~15m canopy diameter)
      const size = 30;
      
      const treeIcon = L.icon({
        iconUrl: 'Tree art.png',
        iconSize: [size, size],
        iconAnchor: [size/2, size],
        popupAnchor: [0, -size]
      });

      const marker = L.marker([lat + offsetLat, lng + offsetLng], {icon: treeIcon});
      treeMarkers.push(marker);
    }
  });
  
  appState.layers.treeIcons = L.layerGroup(treeMarkers);
}

// New function to build trees for all heat spots
function buildTreeIconsLayerForAll(){
  if(appState.layers.treeIcons){ appState.layers.treeIcons.clearLayers(); }
  
  const treeMarkers = [];
  
  // Show trees for all heat spots
  appState.points.forEach(([lat, lng, temp], index) => {
    // Use slider value directly as number of trees for each area
    const numTrees = getTreeCount();
    
    // Create trees in a small cluster for each heat spot
    for (let i = 0; i < numTrees; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.001; // small random offset within ~100m
      const offsetLng = (Math.random() - 0.5) * 0.001;
      
      // Consistent size for mature oak trees (30px = ~15m canopy diameter)
      const size = 30;
      
      const treeIcon = L.icon({
        iconUrl: 'Tree art.png',
        iconSize: [size, size],
        iconAnchor: [size/2, size],
        popupAnchor: [0, -size]
      });

      const marker = L.marker([lat + offsetLat, lng + offsetLng], {icon: treeIcon});
      treeMarkers.push(marker);
    }
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
    // Hide cooling impact card in heat mode
    document.getElementById('coolingImpactCard').style.display = 'none';
    // Reset all heat spot highlighting when switching back to heat mode
    resetHeatSpotHighlighting();
  } 
  if(mode==='trees'){ 
    // When trees mode is activated, show tree icons instead of hotspots
    layers.treeIcons && layers.treeIcons.addTo(map);
    layers.trees && layers.trees.addTo(map); // Also show the user-painted trees
    // Show cooling impact card in tree mode
    document.getElementById('coolingImpactCard').style.display = 'block';
    updateCoolingImpactDisplay();
  } 
}

function resetHeatSpotHighlighting() {
  // Clear the selected heat spot
  appState.selectedHeatSpot = null;
  
  // Reset all heat spots to normal appearance
  if (appState.layers.heat) {
    appState.layers.heat.eachLayer(layer => {
      if (layer.setStyle) {
        // Get the original temperature color
        const bounds = layer.getBounds();
        if (bounds) {
          const center = bounds.getCenter();
          // Find the temperature data for this spot
          const tempData = appState.points.find(([lat, lng]) => 
            Math.abs(lat - center.lat) < 0.002 && Math.abs(lng - center.lng) < 0.002
          );
          if (tempData) {
            const [, , temp] = tempData;
            layer.setStyle({ 
              weight: 2, 
              fillOpacity: 0.6,
              color: tempColor(temp),
              fillColor: tempColor(temp)
            });
          }
        }
      }
    });
  }
  
  // Reset plant button text and styling
  const plantButton = document.getElementById('plantTrees');
  if (plantButton) {
    plantButton.textContent = '🌳 Plant Trees & See Impact';
    plantButton.style.background = 'linear-gradient(135deg, var(--brand), #059669)';
  }
}

function updateCoolingImpactDisplay() {
  const numTrees = getTreeCount();
  
  // Calculate accurate metrics based on actual oak tree characteristics
  let totalTrees = 0;
  let areaM2 = 0; // Total area being analyzed in square meters
  
  if (appState.selectedHeatSpot) {
    // Single selected area
    totalTrees = numTrees;
    areaM2 = 400 * 600; // ~240,000 m² (approximate size of our heat rectangles)
  } else {
    // All heat spots
    totalTrees = numTrees * appState.points.length;
    areaM2 = 400 * 600 * appState.points.length; // Total area of all rectangles
  }
  
  // Oak tree calculations based on research:
  // - Mature oak canopy diameter: ~15m (176 m² coverage per tree)
  // - Cooling effect: ~0.8-1.2°C per tree in immediate vicinity
  // - Coverage percentage: (trees * canopy area) / total area * 100
  
  const canopyAreaPerTree = 176; // m² per mature oak tree
  const totalCanopyArea = totalTrees * canopyAreaPerTree;
  const areaCoveragePercent = Math.min(100, (totalCanopyArea / areaM2) * 100);
  
  // Temperature reduction: 0.8°C per tree in local area, diminishing with distance
  const tempReduction = Math.min(5.0, totalTrees * 0.8).toFixed(1);
  
  document.getElementById('tempReduction').textContent = `-${tempReduction}°C`;
  document.getElementById('treesPlanted').textContent = `${totalTrees} trees`;
  document.getElementById('areaCoverage').textContent = `${areaCoveragePercent.toFixed(1)}%`;
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
  // Only allow individual clicks for tree painting, not continuous painting on mouse hold
  const paint = (latlng)=>{
    const poly = L.circle(latlng,{ radius:18, color:'#60d394', fillColor:'#60d394', fillOpacity:.25, weight:1 });
    appState.layers.trees.addLayer(poly);
    appState.treePolygons.push(poly);
  };
  
  // Only handle click events, removed mousedown/mousemove/mouseup handlers
  appState.map.on('click', (e)=>{ 
    if(appState.ui.mode==='trees'){ 
      paint(e.latlng); 
    }
  });
}

function initUI(){
  // Simplified UI event handlers
  document.getElementById('openOnboarding').addEventListener('click',()=>document.getElementById('onboarding').showModal());
  
  // Main CTA button - toggle between plant trees and real heat data
  document.getElementById('plantTrees').addEventListener('click',()=>{
    // If already in trees mode, switch back to heat map
    if (appState.ui.mode === 'trees') {
      // Switch back to heat map view
      toggleMode('heat');
      setActiveViewButton('toggleHeat');
      // Hide impact slider when viewing heat data
      document.getElementById('impactSlider').style.display = 'none';
      // Reset plant button text
      document.getElementById('plantTrees').textContent = '🌳 Plant Trees & See Impact';
      document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, var(--brand), #059669)';
      return;
    }
    
    // Otherwise, plant trees and show impact
    document.getElementById('coolingSlider').value = 10; // Default to 10 trees
    buildImpactLayer(getTreeCount());
    
    if (appState.selectedHeatSpot) {
      // Plant trees in the selected heat spot only
      buildTreeIconsLayer();
    } else {
      // Plant trees in ALL heat spots
      buildTreeIconsLayerForAll();
    }
    
    toggleMode('trees');
    // Show the impact slider
    document.getElementById('impactSlider').style.display = 'block';
    // Update button states
    setActiveViewButton('toggleTrees');
    // Change button text to indicate it can toggle back
    document.getElementById('plantTrees').textContent = '🔍 View Real Heat Data';
    document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
  });
  
  // Tree count slider updates (each step = 1 tree)
  document.getElementById('coolingSlider').addEventListener('input',()=>{
    if(appState.ui.mode === 'trees'){ 
      // Rebuild trees based on whether we have a selection or showing all
      if (appState.selectedHeatSpot) {
        buildTreeIconsLayer(); // Selected area only
      } else {
        buildTreeIconsLayerForAll(); // All areas
      }
      toggleMode('trees');
      updateCoolingImpactDisplay();
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
    // Clear selected heat spot to reset to "plant everywhere" mode
    appState.selectedHeatSpot = null;
    // Reset plant button text and styling
    const plantButton = document.getElementById('plantTrees');
    plantButton.textContent = '🌳 Plant Trees & See Impact';
    plantButton.style.background = 'linear-gradient(135deg, var(--brand), #059669)';
  });
  
  document.getElementById('toggleTrees').addEventListener('click',()=>{
    if (appState.selectedHeatSpot) {
      // Show trees for selected area only
      buildTreeIconsLayer();
    } else {
      // Show trees for all areas
      buildTreeIconsLayerForAll();
    }
    
    toggleMode('trees');
    setActiveViewButton('toggleTrees');
    // Show impact slider when viewing tree impact
    document.getElementById('impactSlider').style.display = 'block';
    // Update main button text to reflect toggle capability
    document.getElementById('plantTrees').textContent = '🔍 View Real Heat Data';
    document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
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
