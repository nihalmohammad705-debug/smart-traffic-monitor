// routes/webhooks.js
const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');

// Webhook for external incident reporting
router.post('/incident', async (req, res) => {
  try {
    const { type, description, severity, location_lat, location_lng } = req.body;
    
    const incident = await Incident.create({
      type,
      description,
      severity: severity || 2,
      location_lat,
      location_lng
    });
    
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook for vehicle updates from external GPS
router.post('/vehicle-update', async (req, res) => {
  try {
    const { vehicle_tag, lat, lng, speed, heading } = req.body;
    const Vehicle = require('../models/Vehicle');
    
    const vehicle = await Vehicle.findByTag(vehicle_tag);
    if (vehicle) {
      await Vehicle.updatePosition(vehicle.id, vehicle.position_index, lat, lng, speed);
    }
    
    res.json({ success: true, message: 'Vehicle updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check webhook
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;