// public/client.js - COMPLETE WORKING VERSION
const socket = io();
let map;
const vehicleMarkers = new Map();
const segmentPolylines = new Map();
let vehicles = [];
let congestionChart = null;
let speedChart = null;
let incidentChart = null;
let speedHistory = [];

// ============ MAP INITIALIZATION ============
function initMap() {
  map = L.map('map').setView([12.9716, 77.5946], 12); // Bengaluru view
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
  
  console.log('✅ Map initialized');
  
  setupCitySearch();
  setupWeatherDisplay();
  initCharts();
  startAnalyticsUpdates();
}

// ============ CITY SEARCH ============
function setupCitySearch() {
  const searchControl = L.control({ position: 'topleft' });
  searchControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'search-control');
    div.innerHTML = `
      <div style="background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: flex; gap: 5px;">
        <input type="text" id="citySearchInput" placeholder="Enter city name..." style="padding: 6px; width: 150px; border: 1px solid #ccc; border-radius: 4px;">
        <button id="searchCityBtn" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Search</button>
      </div>
    `;
    return div;
  };
  searchControl.addTo(map);
  
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'searchCityBtn') {
      const city = document.getElementById('citySearchInput').value;
      if (city) await searchCity(city);
    }
  });
}

async function searchCity(cityName) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
    const data = await response.json();
    if (data?.length > 0) {
      map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
      L.popup().setLatLng([data[0].lat, data[0].lon]).setContent(`<b>${cityName}</b>`).openOn(map);
    } else alert('City not found');
  } catch (error) {
    console.error('Search error:', error);
  }
}

// ============ WEATHER DISPLAY ============
function setupWeatherDisplay() {
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    const popup = L.popup().setLatLng([lat, lng]).setContent('Loading...').openOn(map);
    
    try {
      const response = await fetch(`/api/traffic-weather?lat=${lat}&lng=${lng}`);
      const result = await response.json();
      
      if (result.success) {
        const { traffic, weather } = result.data;
        popup.setContent(`
          <div style="min-width: 200px;">
            <b>📍 Location Info</b><hr>
            🚗 Speed: ${traffic.flowSpeed} km/h<br>
            🚦 Congestion: ${traffic.congestionLevel}<br>
            🌤️ ${weather.condition}<br>
            🌡️ Temp: ${weather.temperature}<br>
            💨 Wind: ${weather.windSpeed}<br>
            📉 Impact: ${weather.trafficImpact}
          </div>
        `);
        
        document.getElementById('weatherWidget').innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 32px;">${weather.icon || '🌡️'}</div>
            <div style="font-weight: bold;">${weather.condition}</div>
            <div>${weather.temperature}</div>
            <div>💨 Wind: ${weather.windSpeed}</div>
            <div class="impact-${weather.trafficImpact === 'Poor' ? 'poor' : 'normal'}">${weather.trafficImpact} impact</div>
          </div>
        `;
      }
    } catch (error) {
      popup.setContent('Error loading data');
    }
  });
}

// ============ DRAW ROAD SEGMENTS ============
function drawSegment(segment) {
  if (segmentPolylines.has(segment.id)) return;
  
  let coords = segment.coords;
  if (typeof coords === 'string') {
    try { coords = JSON.parse(coords); } catch(e) { return; }
  }
  
  if (coords && coords.length) {
    const polyline = L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.7 }).addTo(map);
    polyline.bindTooltip(`${segment.name} | Speed Limit: ${segment.speed_limit} km/h`);
    segmentPolylines.set(segment.id, polyline);
    console.log(`✅ Drawn segment: ${segment.name}`);
  }
}

// ============ VEHICLE MARKERS ============
function createVehicleIcon(vehicle) {
  let color = '#3b82f6';
  let icon = '🚗';
  if (vehicle.vehicle_tag.includes('BUS')) { color = '#ef4444'; icon = '🚌'; }
  else if (vehicle.vehicle_tag.includes('TAXI')) { color = '#f59e0b'; icon = '🚕'; }
  else if (vehicle.vehicle_tag.includes('TRUCK')) { color = '#8b5cf6'; icon = '🚚'; }
  
  return L.divIcon({
    html: `<div style="background:${color}; width:32px; height:32px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${icon}</div>`,
    iconSize: [32, 32],
    className: 'vehicle-marker'
  });
}

function setVehicle(vehicle) {
  const key = vehicle.vehicle_tag;
  const lat = parseFloat(vehicle.lat);
  const lng = parseFloat(vehicle.lng);
  
  if (isNaN(lat) || isNaN(lng)) {
    console.warn(`Invalid coordinates for ${key}`);
    return;
  }
  
  if (vehicleMarkers.has(key)) {
    vehicleMarkers.get(key).setLatLng([lat, lng]);
  } else {
    const marker = L.marker([lat, lng], { icon: createVehicleIcon(vehicle) }).addTo(map);
    marker.bindPopup(`<b>${vehicle.vehicle_tag}</b><br>Speed: ${Math.round(vehicle.speed)} km/h`);
    vehicleMarkers.set(key, marker);
    console.log(`✅ Added vehicle: ${key} at [${lat}, ${lng}]`);
  }
  
  updateVehicleList(vehicle);
}

function updateVehicleList(vehicle) {
  const ul = document.getElementById('vehicleList');
  let li = document.getElementById(`vehicle-${vehicle.vehicle_tag}`);
  if (!li) {
    li = document.createElement('li');
    li.id = `vehicle-${vehicle.vehicle_tag}`;
    ul.appendChild(li);
  }
  li.innerHTML = `<strong>${vehicle.vehicle_tag}</strong><div style="font-size:11px;">Speed: ${Math.round(vehicle.speed)} km/h</div>`;
  li.onclick = () => map.setView([parseFloat(vehicle.lat), parseFloat(vehicle.lng)], 16);
}

// Function to add alert to sidebar
function addAlertToSidebar(incident) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;
  
  const alertItem = document.createElement('div');
  alertItem.className = `alert-item alert-severity-${incident.severity}`;
  alertItem.innerHTML = `
    <div class="alert-icon">🚨</div>
    <div class="alert-info">
      <div class="alert-title">${incident.type}</div>
      <div class="alert-desc">${incident.description}</div>
      <div class="alert-time">${new Date().toLocaleTimeString()}</div>
    </div>
  `;
  
  alertList.insertBefore(alertItem, alertList.firstChild);
  
  // Keep only last 10 alerts
  while (alertList.children.length > 10) {
    alertList.removeChild(alertList.lastChild);
  }
}

// Update socket.on('new_incident') to use this:
socket.on('new_incident', (incident) => {
  updateIncidentList(incident);
  updateStats();
  addAlertToSidebar(incident); // Add to sidebar instead of popup
});

// ============ INCIDENTS WITH LOCATION ============
function updateIncidentList(incident) {
  const ul = document.getElementById('incidentList');
  let li = document.getElementById(`incident-${incident.id}`);
  if (!li) {
    li = document.createElement('li');
    li.id = `incident-${incident.id}`;
    ul.insertBefore(li, ul.firstChild);
  }
  
  // Add location info if available
  const locationText = incident.location_lat && incident.location_lng 
    ? `<br><small>📍 Location: ${incident.location_lat.toFixed(4)}, ${incident.location_lng.toFixed(4)}</small>`
    : '';
  
  li.innerHTML = `
    <strong>⚠️ ${incident.type}</strong><br>
    ${incident.description}<br>
    <small>🕐 ${new Date(incident.created_at).toLocaleTimeString()}</small>
    ${locationText}
    <span style="display:inline-block; background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">Severity ${incident.severity}</span>
  `;
  
  // Add marker on map for incident if location exists
  if (incident.location_lat && incident.location_lng && map) {
    const incidentIcon = L.divIcon({
      html: '<div style="background:#ef4444; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:12px;">⚠️</div>',
      iconSize: [20, 20]
    });
    L.marker([incident.location_lat, incident.location_lng], { icon: incidentIcon })
      .addTo(map)
      .bindPopup(`<b>${incident.type}</b><br>${incident.description}`);
  }
}

// ============ STATS UPDATE ============
function updateStats() {
  document.getElementById('vehicleCount').innerText = vehicleMarkers.size;
  const avgSpeed = vehicles.reduce((sum, v) => sum + (v.speed || 0), 0) / (vehicles.length || 1);
  document.getElementById('avgSpeed').innerText = Math.round(avgSpeed);
  document.getElementById('incidentCount').innerText = document.querySelectorAll('#incidentList li').length;
}

// ============ ANALYTICS CHARTS ============
function initCharts() {
  const congestionCtx = document.getElementById('congestionChart')?.getContext('2d');
  if (congestionCtx) {
    congestionChart = new Chart(congestionCtx, {
      type: 'doughnut',
      data: { labels: ['Low', 'Moderate', 'Heavy', 'Severe'], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'] }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
  
  const speedCtx = document.getElementById('speedChart')?.getContext('2d');
  if (speedCtx) {
    speedChart = new Chart(speedCtx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Avg Speed (km/h)', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } } }
    });
  }
  
  const incidentCtx = document.getElementById('incidentChart')?.getContext('2d');
  if (incidentCtx) {
    incidentChart = new Chart(incidentCtx, {
      type: 'bar',
      data: { labels: ['Accident', 'Breakdown', 'Traffic Jam', 'Construction'], datasets: [{ label: 'Count', data: [0, 0, 0, 0], backgroundColor: '#ef4444', borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }
}

async function updateAnalytics() {
  try {
    const response = await fetch('/api/analytics/dashboard-stats');
    const result = await response.json();
    
    if (result.success && result.data && congestionChart) {
      const data = result.data;
      
      if (data.congestionLevels) {
        congestionChart.data.datasets[0].data = [
          data.congestionLevels.low || 0,
          data.congestionLevels.moderate || 0,
          data.congestionLevels.heavy || 0,
          data.congestionLevels.severe || 0
        ];
        congestionChart.update();
      }
      
      if (data.avgSpeed && speedChart) {
        speedHistory.push(data.avgSpeed);
        if (speedHistory.length > 10) speedHistory.shift();
        
        speedChart.data.labels = Array.from({ length: speedHistory.length }, (_, i) => `${i+1}m`);
        speedChart.data.datasets[0].data = [...speedHistory];
        speedChart.update();
      }
      
      if (data.vehicles) {
        const tbody = document.getElementById('vehiclePerformanceBody');
        if (tbody) {
          const topVehicles = data.vehicles.slice(0, 5);
          tbody.innerHTML = topVehicles.map(v => `
            <tr>
              <td>${v.vehicle_tag}</td>
              <td>${Math.round(v.speed)} km/h</td>
              <td>${Math.round(v.speed)} km/h</td>
              <td><span class="status-badge status-${v.status}">${v.status}</span></td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

function startAnalyticsUpdates() {
  updateAnalytics();
  setInterval(updateAnalytics, 30000);
}

// ============ SOCKET.IO ============
socket.on('connect', () => {
  console.log('✅ Connected to server');
  socket.emit('request_initial_data');
});

socket.on('initial_data', (data) => {
  console.log('📦 Received initial data:', data.vehicles.length, 'vehicles');
  vehicles = data.vehicles;
  data.segments.forEach(s => drawSegment(s));
  data.vehicles.forEach(v => setVehicle(v));
  data.incidents.forEach(i => updateIncidentList(i));
  updateStats();
  
  // Fit map to show all segments
  const allCoords = [];
  data.segments.forEach(s => {
    let c = s.coords;
    if (typeof c === 'string') c = JSON.parse(c);
    if (c) allCoords.push(...c);
  });
  if (allCoords.length) map.fitBounds(L.latLngBounds(allCoords).pad(0.1));
});

socket.on('vehicle_update', (vehicle) => {
  const idx = vehicles.findIndex(v => v.id === vehicle.id);
  if (idx !== -1) vehicles[idx] = vehicle;
  else vehicles.push(vehicle);
  setVehicle(vehicle);
  updateStats();
});

socket.on('new_incident', (incident) => {
  updateIncidentList(incident);
  updateStats();
  
  // ✅ REMOVED browser alert popup
  // ✅ Added toast notification inside the web app instead
  
  // Show notification inside the web page (not browser popup)
  showToastNotification(incident);
});

// Add this function to show notifications inside the app
function showToastNotification(incident) {
  // Create notification element
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-severity-${incident.severity}`;
  toast.innerHTML = `
    <div class="toast-icon">🚨</div>
    <div class="toast-content">
      <div class="toast-title">${incident.type}</div>
      <div class="toast-message">${incident.description}</div>
      <div class="toast-location">📍 ${incident.segment_name || 'Unknown location'}</div>
    </div>
    <div class="toast-close" onclick="this.parentElement.remove()">×</div>
  `;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 5000);
}

// ============ UI CONTROLS ============
document.getElementById('centerBtn').addEventListener('click', () => {
  if (segmentPolylines.size) {
    const bounds = L.latLngBounds(Array.from(segmentPolylines.values()).flatMap(p => p.getLatLngs()));
    map.fitBounds(bounds.pad(0.1));
  }
});

document.getElementById('simSpeed').addEventListener('change', (e) => {
  socket.emit('set_simulation_speed', parseInt(e.target.value));
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  socket.emit('request_initial_data');
});

document.getElementById('vehicleSearch').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll('#vehicleList li').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
});

// ============ START ============
window.onload = () => { initMap(); };