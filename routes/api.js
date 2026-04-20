// routes/api.js
const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const RoadSegment = require('../models/RoadSegment');
const Incident = require('../models/Incident');

// Get all vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll();
    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all segments
router.get('/segments', async (req, res) => {
  try {
    const segments = await RoadSegment.findAll();
    res.json({ success: true, data: segments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active incidents
router.get('/incidents/active', async (req, res) => {
  try {
    const incidents = await Incident.findAllActive();
    res.json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Report new incident
router.post('/incidents', async (req, res) => {
  try {
    const incident = await Incident.create(req.body);
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve incident
router.put('/incidents/:id/resolve', async (req, res) => {
  try {
    const incident = await Incident.resolve(req.params.id);
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;