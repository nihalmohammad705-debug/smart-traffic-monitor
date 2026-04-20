// controllers/vehicleController.js
const Vehicle = require('../models/Vehicle');
const RoadSegment = require('../models/RoadSegment');

class VehicleController {
  async getAllVehicles(req, res) {
    try {
      const vehicles = await Vehicle.findAll();
      res.json({ success: true, data: vehicles });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getVehicleById(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      res.json({ success: true, data: vehicle });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createVehicle(req, res) {
    try {
      const { vehicle_tag, segment_id, lat, lng, speed } = req.body;
      
      const existing = await Vehicle.findByTag(vehicle_tag);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Vehicle tag already exists' });
      }
      
      const segment = await RoadSegment.findById(segment_id);
      if (!segment) {
        return res.status(400).json({ success: false, error: 'Invalid segment ID' });
      }
      
      const vehicle = await Vehicle.create({
        vehicle_tag,
        segment_id,
        lat,
        lng,
        speed: speed || 30,
        heading: req.body.heading || 0,
        status: req.body.status || 'moving'
      });
      
      res.json({ success: true, data: vehicle });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateVehiclePosition(req, res) {
    try {
      const { position_index, lat, lng, speed } = req.body;
      const vehicle = await Vehicle.updatePosition(
        req.params.id,
        position_index,
        lat,
        lng,
        speed
      );
      res.json({ success: true, data: vehicle });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteVehicle(req, res) {
    try {
      const { query } = require('../config/database');
      await query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Vehicle deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new VehicleController();