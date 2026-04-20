// services/analyticsService.js
const { query } = require('../config/database');

class AnalyticsService {
  static async getDashboardStats() {
    const stats = {};
    
    const vehicleStats = await query(`
      SELECT 
        COUNT(*) as total_vehicles,
        SUM(CASE WHEN status = 'moving' THEN 1 ELSE 0 END) as moving_vehicles,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped_vehicles,
        COALESCE(AVG(speed), 0) as average_speed,
        COALESCE(MAX(speed), 0) as max_speed
      FROM vehicles
    `);
    stats.vehicles = vehicleStats[0];
    
    const incidentStats = await query(`
      SELECT 
        COUNT(*) as total_incidents,
        SUM(CASE WHEN resolved = TRUE THEN 1 ELSE 0 END) as resolved_incidents,
        COALESCE(AVG(severity), 0) as avg_severity,
        COUNT(CASE WHEN severity >= 4 THEN 1 END) as critical_incidents
      FROM incidents
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    stats.incidents = incidentStats[0];
    
    const segmentStats = await query(`
      SELECT 
        COUNT(DISTINCT segment_id) as active_segments,
        COALESCE(AVG(traffic_density), 0) as avg_density
      FROM road_segments
    `);
    stats.segments = segmentStats[0];
    
    return stats;
  }

  static async getHourlyPatterns(segmentId = null) {
    let sql = `
      SELECT 
        DATE_FORMAT(created_at, '%H:00') as hour,
        COUNT(*) as incident_count,
        AVG(severity) as avg_severity
      FROM incidents
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    
    if (segmentId) {
      sql += ` AND segment_id = ${segmentId}`;
    }
    
    sql += `
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
      ORDER BY hour ASC
    `;
    
    return await query(sql);
  }

  static async getVehiclePerformance() {
    return await query(`
      SELECT 
        vehicle_tag,
        COUNT(*) as trip_count,
        AVG(speed) as avg_speed,
        MAX(speed) as max_speed,
        status
      FROM vehicles
      GROUP BY vehicle_tag, status
      ORDER BY avg_speed DESC
      LIMIT 20
    `);
  }

  static async getCongestionReport() {
    return await query(`
      SELECT 
        rs.name,
        rs.speed_limit,
        COUNT(v.id) as current_vehicles,
        COALESCE(AVG(v.speed), 0) as current_speed,
        CASE 
          WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.8 THEN 'Low'
          WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.5 THEN 'Moderate'
          WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.3 THEN 'Heavy'
          ELSE 'Severe'
        END as congestion_level
      FROM road_segments rs
      LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
      GROUP BY rs.id, rs.name, rs.speed_limit
      HAVING current_vehicles > 0
      ORDER BY current_vehicles DESC
    `);
  }
}

module.exports = AnalyticsService;