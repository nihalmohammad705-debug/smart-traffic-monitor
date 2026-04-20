// controllers/incidentController.js
const Incident = require('../models/Incident');

class IncidentController {
  async getAllIncidents(req, res) {
    try {
      const { active } = req.query;
      let incidents;
      
      if (active === 'true') {
        incidents = await Incident.findAllActive();
      } else {
        incidents = await Incident.findAll(100, 0);
      }
      
      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getIncidentById(req, res) {
    try {
      const incident = await Incident.findById(req.params.id);
      if (!incident) {
        return res.status(404).json({ success: false, error: 'Incident not found' });
      }
      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createIncident(req, res) {
    try {
      const incident = await Incident.create(req.body);
      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async resolveIncident(req, res) {
    try {
      const incident = await Incident.resolve(req.params.id);
      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getIncidentsBySeverity(req, res) {
    try {
      const { query } = require('../config/database');
      const incidents = await query(
        'SELECT * FROM incidents WHERE severity >= ? AND resolved = FALSE',
        [req.params.severity]
      );
      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new IncidentController();