// services/alertService.js
const { query } = require('../config/database');

class AlertService {
  constructor(io) {
    this.io = io;
    this.alerts = [];
    this.thresholds = {
      speedDrop: 0.5,
      vehicleDensity: 10,
      incidentSeverity: 3
    };
  }

  async checkTrafficConditions() {
    const alerts = [];
    
    const sql = `
      SELECT 
        rs.id,
        rs.name,
        rs.speed_limit,
        COUNT(v.id) as vehicle_count,
        COALESCE(AVG(v.speed), 0) as avg_speed
      FROM road_segments rs
      LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
      GROUP BY rs.id
      HAVING vehicle_count > ? OR avg_speed < speed_limit * ?
    `;
    
    const congestedSegments = await query(sql, [
      this.thresholds.vehicleDensity,
      this.thresholds.speedDrop
    ]);
    
    for (const segment of congestedSegments) {
      let severity = 2;
      if (segment.avg_speed < segment.speed_limit * 0.3) {
        severity = 4;
      } else if (segment.avg_speed < segment.speed_limit * 0.5) {
        severity = 3;
      }
      
      const alert = {
        id: Date.now() + segment.id,
        type: 'congestion',
        severity: severity,
        message: `Heavy congestion on ${segment.name}`,
        details: {
          segment_id: segment.id,
          vehicle_count: Math.round(segment.vehicle_count),
          average_speed: Math.round(segment.avg_speed)
        },
        timestamp: new Date(),
        acknowledged: false
      };
      
      alerts.push(alert);
    }
    
    const incidents = await query(`
      SELECT * FROM incidents 
      WHERE severity >= ? AND resolved = FALSE 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `, [this.thresholds.incidentSeverity]);
    
    for (const incident of incidents) {
      const alert = {
        id: Date.now() + incident.id,
        type: 'incident',
        severity: incident.severity,
        message: `${incident.type} - ${incident.description}`,
        details: incident,
        timestamp: incident.created_at,
        acknowledged: false
      };
      alerts.push(alert);
    }
    
    for (const alert of alerts) {
      if (!this.alerts.find(a => a.id === alert.id)) {
        this.alerts.unshift(alert);
        if (this.io) {
          this.io.emit('new_alert', alert);
        }
        console.log(`🔔 ALERT: ${alert.message}`);
      }
    }
    
    this.alerts = this.alerts.slice(0, 100);
    return alerts;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      if (this.io) {
        this.io.emit('alert_acknowledged', { alertId });
      }
    }
    return alert;
  }

  getActiveAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }

  startMonitoring(interval = 10000) {
    setInterval(async () => {
      await this.checkTrafficConditions();
    }, interval);
    console.log(`✅ Alert monitoring started (interval: ${interval}ms)`);
  }
}

module.exports = AlertService;