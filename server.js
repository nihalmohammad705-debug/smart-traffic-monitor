// server.js - Main Application Entry Point
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');


// Import custom modules
const { testConnection } = require('./config/database');
const SimulationService = require('./services/simulationService');
const TrafficApiService = require('./services/trafficApiService');
const WeatherService = require('./services/weatherService');
const trafficApi = new TrafficApiService();
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

app.get('/api/analytics/congestion-report', async (req, res) => {
    try {
        const AnalyticsService = require('./services/analyticsService');
        const report = await AnalyticsService.getCongestionReport();
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/vehicle-performance', async (req, res) => {
    try {
        const AnalyticsService = require('./services/analyticsService');
        const performance = await AnalyticsService.getVehiclePerformance();
        res.json({ success: true, data: performance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/hourly-patterns', async (req, res) => {
    try {
        const AnalyticsService = require('./services/analyticsService');
        const patterns = await AnalyticsService.getHourlyPatterns(req.query.segmentId);
        res.json({ success: true, data: patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get traffic and weather for a location
app.get('/api/traffic-weather', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const [traffic, weather] = await Promise.all([
      trafficApi.getTrafficFlow(parseFloat(lat), parseFloat(lng)),
      WeatherService.getWeatherForLocation(parseFloat(lat), parseFloat(lng))
    ]);
    
    res.json({
      success: true,
      data: {
        traffic,
        weather: WeatherService.formatWeatherForUI(weather),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Geocode an address
app.get('/api/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }
    
    const location = await trafficApi.geocodeAddress(address);
    res.json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this after your other API routes
app.get('/api/analytics/dashboard-stats', async (req, res) => {
  try {
    const [vehicles] = await pool.query(`
      SELECT vehicle_tag, speed, status FROM vehicles LIMIT 10
    `);
    
    const [congestionData] = await pool.query(`
      SELECT 
        SUM(CASE WHEN speed >= 40 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN speed >= 25 AND speed < 40 THEN 1 ELSE 0 END) as moderate,
        SUM(CASE WHEN speed >= 15 AND speed < 25 THEN 1 ELSE 0 END) as heavy,
        SUM(CASE WHEN speed < 15 THEN 1 ELSE 0 END) as severe
      FROM vehicles
    `);
    
    const avgSpeed = vehicles.reduce((sum, v) => sum + (v.speed || 0), 0) / (vehicles.length || 1);
    
    res.json({
      success: true,
      data: {
        vehicles: vehicles,
        avgSpeed: avgSpeed,
        congestionLevels: congestionData[0] || { low: 0, moderate: 0, heavy: 0, severe: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize services
let simulationService = null;
let alertService = null;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  // Send initial data
  socket.on('request_initial_data', async () => {
    try {
      const Vehicle = require('./models/Vehicle');
      const RoadSegment = require('./models/RoadSegment');
      const Incident = require('./models/Incident');
      
      const [segments, vehicles, incidents] = await Promise.all([
        RoadSegment.findAll(),
        Vehicle.findAll(),
        Incident.findAllActive()
      ]);
      
      const segmentsWithParsedCoords = segments.map(segment => ({
        ...segment,
        coords: typeof segment.coords === 'string' ? JSON.parse(segment.coords) : segment.coords
      }));
      
      socket.emit('initial_data', {
        segments: segmentsWithParsedCoords,
        vehicles: vehicles,
        incidents: incidents
      });
      
      console.log(`📦 Sent initial data to ${socket.id}`);
    } catch (error) {
      console.error('Error sending initial data:', error);
      socket.emit('error', { message: 'Failed to load initial data' });
    }
  });
  
  // Handle simulation speed change
  socket.on('set_simulation_speed', (speed) => {
    if (simulationService) {
      simulationService.setSpeed(parseInt(speed));
      io.emit('simulation_speed_changed', { speed: parseInt(speed) });
      console.log(`⚡ Simulation speed changed to ${speed}ms`);
    }
  });
  
  // Handle incident reporting
  socket.on('report_incident', async (incidentData) => {
    try {
      const Incident = require('./models/Incident');
      const incident = await Incident.create(incidentData);
      io.emit('new_incident', incident);
      console.log(`🚨 New incident reported: ${incident.type}`);
    } catch (error) {
      console.error('Error reporting incident:', error);
    }
  });
  
  // Handle resolve incident
  socket.on('resolve_incident', async (incidentId) => {
    try {
      const Incident = require('./models/Incident');
      const incident = await Incident.resolve(incidentId);
      io.emit('incident_resolved', incident);
      console.log(`✅ Incident ${incidentId} resolved`);
    } catch (error) {
      console.error('Error resolving incident:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server and initialize services
async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    process.exit(1);
  }
  
  // Initialize simulation service
  simulationService = new SimulationService(io);
  const interval = parseInt(process.env.SIMULATION_INTERVAL) || 3000;
  simulationService.start(interval);
  
  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`⚡ Simulation interval: ${interval}ms\n`);
  });
}

startServer();