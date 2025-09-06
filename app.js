const appState = {
  map: null,
  layers: { heat: null, impact: null, trees: L.layerGroup(), treeIcons: L.layerGroup() },
  points: [],
  treePolygons: [],
  treeDensities: {}, 
  selectedHeatSpot: null, 
  ui: { mode: 'heat' },
  weather: { lastCenter: null, data: null }
};

function initMap(){
  const start = [-33.8500, 150.9000]; 
  const map = L.map('map',{ zoomControl:true }).setView(start, 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);
  appState.map = map;

  const sydneySuburbs = [
    {
      name: "Redfern",
      samplingPoints: [
        {lat: -33.8917, lng: 151.1998},
        {lat: -33.8925, lng: 151.2010}, 
        {lat: -33.8905, lng: 151.1985}, 
        {lat: -33.8935, lng: 151.2020}, 
        {lat: -33.8900, lng: 151.2005}, 
      ]
    },
    {
      name: "Camperdown",
      samplingPoints: [
        {lat: -33.8886, lng: 151.1853}, 
        {lat: -33.8875, lng: 151.1835}, 
        {lat: -33.8895, lng: 151.1865}, 
        {lat: -33.8870, lng: 151.1845}, 
        {lat: -33.8905, lng: 151.1875}, 
      ]
    },
    {
      name: "Rozelle",
      samplingPoints: [
        {lat: -33.8615, lng: 151.1712}, 
        {lat: -33.8625, lng: 151.1725}, 
        {lat: -33.8605, lng: 151.1700}, 
        {lat: -33.8635, lng: 151.1735}, 
        {lat: -33.8620, lng: 151.1715}, 
      ]
    },
    {
      name: "Chatswood",
      samplingPoints: [
        {lat: -33.7967, lng: 151.1831}, 
        {lat: -33.7975, lng: 151.1845}, 
        {lat: -33.7955, lng: 151.1820}, 
        {lat: -33.7985, lng: 151.1855}, 
        {lat: -33.7960, lng: 151.1835}, 
      ]
    },
    {
      name: "Marsden Park",
      samplingPoints: [
        {lat: -33.7025, lng: 150.8454}, 
        {lat: -33.7035, lng: 150.8465}, 
        {lat: -33.7015, lng: 150.8445}, 
        {lat: -33.7045, lng: 150.8475}, 
        {lat: -33.7030, lng: 150.8460}, 
      ]
    },
    {
      name: "Kellyville",
      samplingPoints: [
        {lat: -33.7113, lng: 150.9518}, 
        {lat: -33.7125, lng: 150.9530}, 
        {lat: -33.7105, lng: 150.9510}, 
        {lat: -33.7135, lng: 150.9540}, 
        {lat: -33.7120, lng: 150.9525}, 
      ]
    },
    {
      name: "Glenhaven",
      samplingPoints: [
        {lat: -33.7065, lng: 151.0135}, 
        {lat: -33.7075, lng: 151.0145}, 
        {lat: -33.7055, lng: 151.0125}, 
        {lat: -33.7085, lng: 151.0155}, 
        {lat: -33.7070, lng: 151.0140}, 
      ]
    },
    {
      name: "Hornsby",
      samplingPoints: [
        {lat: -33.7051, lng: 151.0993}, 
        {lat: -33.7065, lng: 151.1005}, 
        {lat: -33.7040, lng: 151.0985}, 
        {lat: -33.7075, lng: 151.1015},
        {lat: -33.7055, lng: 151.0995}, 
      ]
    },
    {
      name: "Baulkham Hills",
      samplingPoints: [
        {lat: -33.7589, lng: 150.9892}, 
        {lat: -33.7600, lng: 150.9905}, 
        {lat: -33.7580, lng: 150.9880}, 
        {lat: -33.7610, lng: 150.9915}, 
        {lat: -33.7595, lng: 150.9900}, 
      ]
    },
    {
      name: "Bella Vista",
      samplingPoints: [
        {lat: -33.7346, lng: 150.9543}, 
        {lat: -33.7355, lng: 150.9555}, 
        {lat: -33.7338, lng: 150.9535}, 
        {lat: -33.7365, lng: 150.9565}, 
        {lat: -33.7350, lng: 150.9550}, 
      ]
    },
    {
      name: "Box Hill",
      samplingPoints: [
        {lat: -33.6483, lng: 150.8967}, 
        {lat: -33.6495, lng: 150.8980}, 
        {lat: -33.6475, lng: 150.8955}, 
        {lat: -33.6505, lng: 150.8990}, 
        {lat: -33.6490, lng: 150.8975}, 
      ]
    },
    {
      name: "Castle Hill",
      samplingPoints: [
        {lat: -33.7296, lng: 151.0035}, 
        {lat: -33.7310, lng: 151.0050}, 
        {lat: -33.7285, lng: 151.0025}, 
        {lat: -33.7320, lng: 151.0060}, 
        {lat: -33.7305, lng: 151.0045}, 
      ]
    },
    {
      name: "Kenthurst",
      samplingPoints: [
        {lat: -33.6741, lng: 150.9454}, 
        {lat: -33.6755, lng: 150.9470}, 
        {lat: -33.6730, lng: 150.9440}, 
        {lat: -33.6765, lng: 150.9480}, 
        {lat: -33.6750, lng: 150.9465}, 
      ]
    },
    {
      name: "North Kellyville",
      samplingPoints: [
        {lat: -33.6968, lng: 150.9347}, 
        {lat: -33.6980, lng: 150.9360}, 
        {lat: -33.6960, lng: 150.9335}, 
        {lat: -33.6990, lng: 150.9370}, 
        {lat: -33.6975, lng: 150.9355}, 
      ]
    },
    {
      name: "Norwest",
      samplingPoints: [
        {lat: -33.7324, lng: 150.9724}, 
        {lat: -33.7335, lng: 150.9735}, 
        {lat: -33.7315, lng: 150.9715}, 
        {lat: -33.7345, lng: 150.9745}, 
        {lat: -33.7330, lng: 150.9730}, 
      ]
    },
    {
      name: "Rouse Hill",
      samplingPoints: [
        {lat: -33.6859, lng: 150.9192}, 
        {lat: -33.6870, lng: 150.9205}, 
        {lat: -33.6850, lng: 150.9180}, 
        {lat: -33.6880, lng: 150.9215}, 
        {lat: -33.6865, lng: 150.9200}, 
      ]
    },
    {
      name: "West Pennant Hills",
      samplingPoints: [
        {lat: -33.7491, lng: 151.0391}, 
        {lat: -33.7505, lng: 151.0405}, 
        {lat: -33.7480, lng: 151.0380}, 
        {lat: -33.7515, lng: 151.0415}, 
        {lat: -33.7500, lng: 151.0400}, 
      ]
    },
    {
      name: "Winston Hills",
      samplingPoints: [
        {lat: -33.7753, lng: 150.9839}, 
        {lat: -33.7765, lng: 150.9850}, 
        {lat: -33.7745, lng: 150.9830}, 
        {lat: -33.7775, lng: 150.9860}, 
        {lat: -33.7760, lng: 150.9845}, 
      ]
    },
    {
      name: "North Rocks",
      samplingPoints: [
        {lat: -33.7716, lng: 151.0147}, 
        {lat: -33.7730, lng: 151.0160}, 
        {lat: -33.7705, lng: 151.0135}, 
        {lat: -33.7740, lng: 151.0170}, 
        {lat: -33.7725, lng: 151.0155}, 
      ]
    },
    {
      name: "Carlingford",
      samplingPoints: [
        {lat: -33.7793, lng: 151.0458}, 
        {lat: -33.7805, lng: 151.0470}, 
        {lat: -33.7785, lng: 151.0450}, 
        {lat: -33.7815, lng: 151.0480}, 
        {lat: -33.7800, lng: 151.0465}, 
      ]
    },
    {
      name: "Ryde",
      samplingPoints: [
        {lat: -33.8144, lng: 151.1103}, 
        {lat: -33.8155, lng: 151.1115}, 
        {lat: -33.8135, lng: 151.1095}, 
        {lat: -33.8165, lng: 151.1125}, 
        {lat: -33.8150, lng: 151.1110}, 
      ]
    },
    {
      name: "Liverpool",
      samplingPoints: [
        {lat: -33.9211, lng: 150.9234}, 
        {lat: -33.9225, lng: 150.9250}, 
        {lat: -33.9200, lng: 150.9220}, 
        {lat: -33.9235, lng: 150.9260}, 
        {lat: -33.9215, lng: 150.9240}, 
      ]
    },
    {
      name: "Campbelltown",
      samplingPoints: [
        {lat: -34.0656, lng: 150.8186}, 
        {lat: -34.0670, lng: 150.8200}, 
        {lat: -34.0645, lng: 150.8175}, 
        {lat: -34.0680, lng: 150.8210}, 
        {lat: -34.0660, lng: 150.8190}, 
      ]
    },
    {
      name: "Fairfield",
      samplingPoints: [
        {lat: -33.8711, lng: 150.9556}, 
        {lat: -33.8725, lng: 150.9570}, 
        {lat: -33.8700, lng: 150.9545}, 
        {lat: -33.8735, lng: 150.9580}, 
        {lat: -33.8715, lng: 150.9560}, 
      ]
    },
    {
      name: "Bankstown",
      samplingPoints: [
        {lat: -33.9173, lng: 151.0320}, 
        {lat: -33.9185, lng: 151.0335}, 
        {lat: -33.9165, lng: 151.0310}, 
        {lat: -33.9195, lng: 151.0345}, 
        {lat: -33.9180, lng: 151.0325}, 
      ]
    },
    {
      name: "Cabramatta",
      samplingPoints: [
        {lat: -33.8967, lng: 150.9356}, 
        {lat: -33.8975, lng: 150.9365}, 
        {lat: -33.8960, lng: 150.9350}, 
        {lat: -33.8985, lng: 150.9375}, 
        {lat: -33.8970, lng: 150.9360}, 
      ]
    },
    {
      name: "Camden",
      samplingPoints: [
        {lat: -34.0545, lng: 150.6957}, 
        {lat: -34.0555, lng: 150.6970}, 
        {lat: -34.0535, lng: 150.6945}, 
        {lat: -34.0565, lng: 150.6980}, 
        {lat: -34.0550, lng: 150.6965}, 
      ]
    },
    {
      name: "Penrith",
      samplingPoints: [
        {lat: -33.7506, lng: 150.6934}, 
        {lat: -33.7520, lng: 150.6950}, 
        {lat: -33.7495, lng: 150.6920}, 
        {lat: -33.7530, lng: 150.6960}, 
        {lat: -33.7510, lng: 150.6940}, 
      ]
    },
    {
      name: "Blacktown",
      samplingPoints: [
        {lat: -33.7689, lng: 150.9062}, 
        {lat: -33.7700, lng: 150.9075}, 
        {lat: -33.7680, lng: 150.9050}, 
        {lat: -33.7710, lng: 150.9085}, 
        {lat: -33.7695, lng: 150.9070}, 
      ]
    },
    {
      name: "Parramatta",
      samplingPoints: [
        {lat: -33.8151, lng: 151.0000}, 
        {lat: -33.8165, lng: 151.0015}, 
        {lat: -33.8140, lng: 150.9985}, 
        {lat: -33.8175, lng: 151.0025}, 
        {lat: -33.8155, lng: 151.0005}, 
      ]
    },
    {
      name: "Silverwater",
      samplingPoints: [
        {lat: -33.8293, lng: 151.0457}, 
        {lat: -33.8305, lng: 151.0470}, 
        {lat: -33.8285, lng: 151.0445}, 
        {lat: -33.8315, lng: 151.0480}, 
        {lat: -33.8300, lng: 151.0465}, 
      ]
    },
    {
      name: "Canada Bay",
      samplingPoints: [
        {lat: -33.8558, lng: 151.1024}, 
        {lat: -33.8570, lng: 151.1035}, 
        {lat: -33.8550, lng: 151.1015}, 
        {lat: -33.8580, lng: 151.1045},
        {lat: -33.8565, lng: 151.1030}, 
      ]
    },
    {
      name: "Marrickville",
      samplingPoints: [
        {lat: -33.9115, lng: 151.1559}, 
        {lat: -33.9125, lng: 151.1570}, 
        {lat: -33.9105, lng: 151.1550}, 
        {lat: -33.9135, lng: 151.1580}, 
        {lat: -33.9120, lng: 151.1565}, 
      ]
    },
    {
      name: "Randwick",
      samplingPoints: [
        {lat: -33.9148, lng: 151.2321}, 
        {lat: -33.9160, lng: 151.2335}, 
        {lat: -33.9140, lng: 151.2310}, 
        {lat: -33.9170, lng: 151.2345}, 
        {lat: -33.9155, lng: 151.2330}, 
      ]
    }
  ];

  appState.layers.heat = L.layerGroup();
  appState.layers.heat.addTo(map);

  fetchHeatIslandData(sydneySuburbs);

  buildTreeIconsLayer();

  buildImpactLayer(getTreeCount());

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
  if(t>=34) return '#f4c430';
  if(t>=30) return '#abd9e9';
  return '#2c7bb6';
}

function getTreeCount(){
  const v = Number(document.getElementById('coolingSlider').value||'3');
  return v;
}

function buildImpactLayer(numTrees){
  if(appState.layers.impact){ appState.layers.impact.remove(); }
  const coolingPerTree = 0.8;
  const totalCooling = Math.min(5.0, numTrees * coolingPerTree);
  
  const rectangles = appState.points.map(([lat,lng,temp])=>{
    const cooled = Math.max(20, temp - totalCooling);
    const color = tempColor(cooled);
    const offsetLat = 0.004;
    const offsetLng = 0.006;
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

async function fetchHeatIslandData(suburbs) {
  const key = 'acce1388ea5659880c18e478e553acec';
  const heatIslands = [];
  
  try {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    const batchSize = 3;
    for (let i = 0; i < suburbs.length; i += batchSize) {
      const batch = suburbs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (suburb) => {
        const suburbTemperatures = [];
        
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
            
            await new Promise(resolve => setTimeout(resolve, 15));
          } catch (error) {
            console.log(`Failed to fetch data for ${suburb.name} point:`, error);
          }
        }
        
        if (suburbTemperatures.length > 0) {
          const hottestSpot = suburbTemperatures.reduce((hottest, current) => 
            current.temp > hottest.temp ? current : hottest
          );
          
          heatIslands.push({
            ...hottestSpot,
            name: `${suburb.name} Heat Island`
          });
        }
      }));
      
      const progress = Math.round(((i + batchSize) / suburbs.length) * 100);
      const loadingContent = document.querySelector('.loading-content p');
      if (loadingContent) {
        loadingContent.textContent = `Loading temperature data... ${progress}%`;
      }
      
      if (i + batchSize < suburbs.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    appState.points = heatIslands.map(h => [h.lat, h.lng, h.temp]);
    
    buildRealHeatLayer(heatIslands);
    
    buildImpactLayer(getTreeCount());
    buildTreeIconsLayer();
    
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    console.log(`Found ${heatIslands.length} real heat islands across Sydney suburbs`);
    
    const loadingContent = document.querySelector('.loading-content p');
    if (loadingContent) {
      loadingContent.textContent = 'Processing heat data...';
    }
    
  } catch (error) {
    console.error('Error fetching heat island data:', error);
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

async function fetchRealHeatmapData(locations) {
  const key = 'acce1388ea5659880c18e478e553acec';
  const temperatureData = [];
  
  try {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${key}&units=metric`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const temp = data.main?.temp || 20;
          temperatureData.push({
            lat: location.lat,
            lng: location.lng,
            temp: temp,
            name: location.name,
            feels_like: data.main?.feels_like || temp,
            humidity: data.main?.humidity || 50
          });
        } else {
          temperatureData.push({
            lat: location.lat,
            lng: location.lng, 
            temp: 22,
            name: location.name,
            feels_like: 22,
            humidity: 50
          });
        }
        
        if (i < locations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      } catch (error) {
        console.log(`Failed to fetch data for ${location.name}:`, error);
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
    
    appState.points = temperatureData.map(d => [d.lat, d.lng, d.temp]);
    
    buildRealHeatLayer(temperatureData);
    
    buildImpactLayer(getCoolingPercent());
    buildTreeIconsLayer();
    
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

function buildRealHeatLayer(heatIslandData) {
  appState.layers.heat.clearLayers();
  
  heatIslandData.forEach(data => {
    const c = tempColor(data.temp);
    const offsetLat = 0.003;
    const offsetLng = 0.004;
    const bounds = [
      [data.lat - offsetLat, data.lng - offsetLng],
      [data.lat + offsetLat, data.lng + offsetLng]
    ];
    
    const rectangle = L.rectangle(bounds, { 
      color: c, 
      fillColor: c, 
      fillOpacity: 0.7,
      weight: 3,
      stroke: true,
      className: 'heat-spot-clickable'
    }).bindTooltip(`
      <strong>${data.name}</strong><br/>
      🌡️ Temperature: ${data.temp.toFixed(1)}°C<br/>
      Feels like: ${data.feels_like.toFixed(1)}°C<br/>
      Humidity: ${data.humidity}%<br/>
      <em>Click to select/unselect this heat island</em>
    `);
    
    rectangle.on('click', function(e) {
      selectHeatSpot(data);
      L.DomEvent.stopPropagation(e);
    });
    
    appState.layers.heat.addLayer(rectangle);
  });
}

function selectHeatSpot(data) {
  const isCurrentlySelected = appState.selectedHeatSpot && 
    Math.abs(appState.selectedHeatSpot.lat - data.lat) < 0.002 && 
    Math.abs(appState.selectedHeatSpot.lng - data.lng) < 0.002;
  
  if (isCurrentlySelected) {
    appState.selectedHeatSpot = null;
    resetHeatSpotHighlighting();
    const plantButton = document.getElementById('plantTrees');
    plantButton.textContent = '🌳 Plant Trees & See Impact';
    plantButton.style.background = 'linear-gradient(135deg, var(--brand), #059669)';
    return;
  }
  
  appState.selectedHeatSpot = data;
  
  const spotKey = `${data.lat}_${data.lng}`;
  if (!appState.treeDensities[spotKey]) {
    appState.treeDensities[spotKey] = 3;
  }
  
  appState.layers.heat.eachLayer(layer => {
    if (layer.getBounds) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      if (Math.abs(center.lat - data.lat) < 0.002 && Math.abs(center.lng - data.lng) < 0.002) {
        layer.setStyle({ weight: 4, color: '#10b981', fillOpacity: 0.8 });
      } else {
        layer.setStyle({ weight: 2, fillOpacity: 0.6 });
      }
    }
  });
  
  const plantButton = document.getElementById('plantTrees');
  plantButton.textContent = `🌳 Plant Trees in ${data.name}`;
  plantButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
}

function buildTreeIconsLayer(){
  if(appState.layers.treeIcons){ appState.layers.treeIcons.clearLayers(); }
  
  const treeMarkers = [];
  
  const spotsToProcess = appState.selectedHeatSpot ? 
    [[appState.selectedHeatSpot.lat, appState.selectedHeatSpot.lng, appState.selectedHeatSpot.temp]] : 
    [];
  
  spotsToProcess.forEach(([lat, lng, temp], index) => {
    const spotKey = `${lat}_${lng}`;
    const numTrees = getTreeCount();
    
    for (let i = 0; i < numTrees; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.001;
      const offsetLng = (Math.random() - 0.5) * 0.001;
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

function buildTreeIconsLayerForAll(){
  if(appState.layers.treeIcons){ appState.layers.treeIcons.clearLayers(); }
  
  const treeMarkers = [];
  
  appState.points.forEach(([lat, lng, temp], index) => {
    const numTrees = getTreeCount();
    
    for (let i = 0; i < numTrees; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.001;
      const offsetLng = (Math.random() - 0.5) * 0.001;
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
  [layers.heat, layers.impact, layers.treeIcons].forEach(l=> l && map.removeLayer(l));
  
  if(mode==='heat'){ 
    layers.heat && layers.heat.addTo(map);
    document.getElementById('coolingImpactCard').style.display = 'none';
    resetHeatSpotHighlighting();
  } 
  if(mode==='trees'){ 
    layers.treeIcons && layers.treeIcons.addTo(map);
    document.getElementById('coolingImpactCard').style.display = 'block';
    updateCoolingImpactDisplay();
  } 
}

function resetHeatSpotHighlighting() {
  appState.selectedHeatSpot = null;
  
  if (appState.layers.heat) {
    appState.layers.heat.eachLayer(layer => {
      if (layer.setStyle) {
        const bounds = layer.getBounds();
        if (bounds) {
          const center = bounds.getCenter();
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
  
  const plantButton = document.getElementById('plantTrees');
  if (plantButton) {
    plantButton.textContent = '🌳 Plant Trees & See Impact';
    plantButton.style.background = 'linear-gradient(135deg, var(--brand), #059669)';
  }
}

function updateCoolingImpactDisplay() {
  const numTrees = getTreeCount();
  
  let totalTrees = 0;
  let areaM2 = 0;
  
  if (appState.selectedHeatSpot) {
    totalTrees = numTrees;
    areaM2 = 400 * 600;
  } else {
    totalTrees = numTrees * appState.points.length;
    areaM2 = 400 * 600 * appState.points.length;
  }
  
  const canopyAreaPerTree = 176;
  const totalCanopyArea = totalTrees * canopyAreaPerTree;
  const areaCoveragePercent = Math.min(100, (totalCanopyArea / areaM2) * 100);
  
  const tempReduction = Math.min(5.0, totalTrees * 0.8).toFixed(1);
  
  document.getElementById('tempReduction').textContent = `-${tempReduction}°C`;
  document.getElementById('treesPlanted').textContent = `${totalTrees} trees`;
  document.getElementById('areaCoverage').textContent = `${areaCoveragePercent.toFixed(1)}%`;
}

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

    fetchForecast(lat, lon, key);
    fetchAQI(lat, lon, key);
  }catch(err){
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
  }catch(e){ }
}

async function fetchAQI(lat, lon, key){
  try{
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
    const res = await fetch(url); if(!res.ok) throw new Error('aqi http '+res.status);
    const data = await res.json();
    const aqi = data.list?.[0]?.main?.aqi || 0;
    const label = ['—','Good','Fair','Moderate','Poor','Very Poor'][aqi] || '—';
    setText('wAQI', `AQI ${aqi} (${label})`);
  }catch(e){ }
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
  
  const weatherMain = d.weather?.[0]?.main?.toLowerCase() || '';
  const weatherCard = document.querySelector('.current-weather');
  
  let backgroundImage = '';
  let weatherIcon = '';
  
  if (weatherMain.includes('rain') || weatherMain.includes('drizzle') || weatherMain.includes('thunderstorm')) {
    backgroundImage = 'url("Rainy Weather.png")';
    weatherIcon = '🌧️';
  } else if (weatherMain.includes('clear') || weatherMain.includes('sun')) {
    backgroundImage = 'url("Sunny Weather.png")';
    weatherIcon = '☀️';
  } else {
    backgroundImage = 'url("Cloudy Weather.png")';
    weatherIcon = '☁️';
  }
  
  if (weatherCard) {
    weatherCard.style.backgroundImage = backgroundImage;
  }
  
  const img = document.getElementById('wIcon');
  if (img) {
    img.style.display = 'none';
    let emojiIcon = document.getElementById('weatherEmoji');
    if (!emojiIcon) {
      emojiIcon = document.createElement('div');
      emojiIcon.id = 'weatherEmoji';
      emojiIcon.style.fontSize = '48px';
      emojiIcon.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
      img.parentNode.insertBefore(emojiIcon, img);
    }
    emojiIcon.textContent = weatherIcon;
    img.classList.remove('skeleton');
  }
  
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
}

function initUI(){
  document.getElementById('openOnboarding').addEventListener('click',()=>document.getElementById('onboarding').showModal());
  
  document.getElementById('plantTrees').addEventListener('click',()=>{
    if (appState.ui.mode === 'trees') {
      toggleMode('heat');
      setActiveViewButton('toggleHeat');
      document.getElementById('impactSlider').style.display = 'none';
      document.getElementById('plantTrees').textContent = '🌳 Plant Trees & See Impact';
      document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, var(--brand), #059669)';
      return;
    }
    
    document.getElementById('coolingSlider').value = 10;
    buildImpactLayer(getTreeCount());
    
    if (appState.selectedHeatSpot) {
      buildTreeIconsLayer();
    } else {
      buildTreeIconsLayerForAll();
    }
    
    toggleMode('trees');
    document.getElementById('impactSlider').style.display = 'block';
    setActiveViewButton('toggleTrees');
    document.getElementById('plantTrees').textContent = '🔍 View Real Heat Data';
    document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    
    setTimeout(() => {
      const weatherCard = document.querySelector('.current-weather');
      if (weatherCard) {
        weatherCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 300);
  });
  
  document.getElementById('coolingSlider').addEventListener('input',()=>{
    if(appState.ui.mode === 'trees'){ 
      if (appState.selectedHeatSpot) {
        buildTreeIconsLayer(); 
      } else {
        buildTreeIconsLayerForAll(); 
      }
      toggleMode('trees');
      updateCoolingImpactDisplay();
    }
  });
  
  const setActiveViewButton = (activeId) => {
    ['toggleHeat', 'toggleTrees'].forEach(id => {
      document.getElementById(id).classList.toggle('active', id === activeId);
    });
  };
  
  document.getElementById('toggleHeat').addEventListener('click',()=>{
    toggleMode('heat');
    setActiveViewButton('toggleHeat');
    document.getElementById('impactSlider').style.display = 'none';
    appState.selectedHeatSpot = null;
    const plantButton = document.getElementById('plantTrees');
    plantButton.textContent = '🌳 Plant Trees & See Impact';
    plantButton.style.background = 'linear-gradient(135deg, var(--brand), #059669)';
  });
  
  document.getElementById('toggleTrees').addEventListener('click',()=>{
    if (appState.selectedHeatSpot) {
      buildTreeIconsLayer();
    } else {
      buildTreeIconsLayerForAll();
    }
    
    toggleMode('trees');
    setActiveViewButton('toggleTrees');
    document.getElementById('impactSlider').style.display = 'block';
    document.getElementById('plantTrees').textContent = '🔍 View Real Heat Data';
    document.getElementById('plantTrees').style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    
    setTimeout(() => {
      const weatherCard = document.querySelector('.current-weather');
      if (weatherCard) {
        weatherCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 300); 
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