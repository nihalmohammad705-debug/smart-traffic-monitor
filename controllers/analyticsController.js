// controllers/analyticsController.js
const AnalyticsService = require('../services/analyticsService');

class AnalyticsController {
  async getDashboardStats(req, res) {
    try {
      const stats = await AnalyticsService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHourlyPatterns(req, res) {
    try {
      const patterns = await AnalyticsService.getHourlyPatterns(req.query.segmentId);
      res.json({ success: true, data: patterns });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getVehiclePerformance(req, res) {
    try {
      const performance = await AnalyticsService.getVehiclePerformance();
      res.json({ success: true, data: performance });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCongestionReport(req, res) {
    try {
      const report = await AnalyticsService.getCongestionReport();
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AnalyticsController();