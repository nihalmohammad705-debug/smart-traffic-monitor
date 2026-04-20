// models/RoadSegment.js
const { query } = require('../config/database');

class RoadSegment {
  // Get all segments with traffic metrics
  static async findAll() {
    const sql = `
      SELECT 
        rs.*,
        COUNT(v.id) as active_vehicles,
        COALESCE(AVG(v.speed), 0) as current_avg_speed
      FROM road_segments rs
      LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
      GROUP BY rs.id
    `;
    return await query(sql);
  }

  // Get segment by ID
  static async findById(id) {
    const sql = `
      SELECT rs.*, 
        (SELECT COUNT(*) FROM vehicles WHERE segment_id = rs.id AND status = 'moving') as vehicle_count,
        (SELECT COALESCE(AVG(speed), 0) FROM vehicles WHERE segment_id = rs.id) as average_speed
      FROM road_segments rs
      WHERE rs.id = ?
    `;
    const results = await query(sql, [id]);
    return results[0] || null;
  }

  // Update traffic metrics
  static async updateMetrics(id) {
    const sql = `
      UPDATE road_segments rs
      SET 
        traffic_density = (
          SELECT COUNT(*) FROM vehicles 
          WHERE segment_id = rs.id AND status = 'moving'
        ),
        average_speed = (
          SELECT COALESCE(AVG(speed), 0) FROM vehicles 
          WHERE segment_id = rs.id
        ),
        last_updated = CURRENT_TIMESTAMP
      WHERE rs.id = ?
    `;
    await query(sql, [id]);
    return await this.findById(id);
  }
}

module.exports = RoadSegment;