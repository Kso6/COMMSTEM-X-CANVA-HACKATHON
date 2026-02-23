'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const OWM_KEY = process.env.OWM_KEY;

if (!OWM_KEY) {
  console.error('ERROR: OWM_KEY environment variable is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

// Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet({ contentSecurityPolicy: false })); // CSP is set in index.html

// Rate-limit the proxy: 120 requests/minute per IP (~2 req/s, well above normal usage).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

// Validate lat/lon query params to prevent SSRF / parameter injection.
function parseCoords(query) {
  const lat = parseFloat(query.lat);
  const lon = parseFloat(query.lon);
  if (
    isNaN(lat) || isNaN(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) {
    return null;
  }
  return { lat: lat.toFixed(4), lon: lon.toFixed(4) };
}

// Generic OWM fetch helper (server-side, key never sent to client).
async function owmFetch(endpoint, params) {
  const qs = new URLSearchParams({ ...params, appid: OWM_KEY });
  const res = await fetch(`${OWM_BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw Object.assign(new Error('OWM error'), { status: res.status });
  return res.json();
}

// --- Proxy routes ---

app.get('/api/weather', async (req, res) => {
  const coords = parseCoords(req.query);
  if (!coords) return res.status(400).json({ error: 'Invalid lat/lon' });
  try {
    const data = await owmFetch('weather', { lat: coords.lat, lon: coords.lon, units: 'metric' });
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: 'Weather fetch failed' });
  }
});

app.get('/api/forecast', async (req, res) => {
  const coords = parseCoords(req.query);
  if (!coords) return res.status(400).json({ error: 'Invalid lat/lon' });
  try {
    const data = await owmFetch('forecast', { lat: coords.lat, lon: coords.lon, units: 'metric' });
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: 'Forecast fetch failed' });
  }
});

app.get('/api/air_pollution', async (req, res) => {
  const coords = parseCoords(req.query);
  if (!coords) return res.status(400).json({ error: 'Invalid lat/lon' });
  try {
    const data = await owmFetch('air_pollution', { lat: coords.lat, lon: coords.lon });
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: 'AQI fetch failed' });
  }
});

// Serve static files (HTML, CSS, JS, images).
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  dotfiles: 'deny',
}));

app.listen(PORT, () => {
  console.log(`Thallo running at http://localhost:${PORT}`);
});
