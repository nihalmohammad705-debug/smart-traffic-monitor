// models/Incident.js
const { query } = require('../config/database');

class Incident {
  // Get all active incidents
  static async findAllActive() {
    const sql = `
      SELECT i.*, v.vehicle_tag, rs.name as segment_name
      FROM incidents i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN road_segments rs ON i.segment_id = rs.id
      WHERE i.resolved = FALSE
      ORDER BY i.created_at DESC
    `;
    return await query(sql);
  }

  // Get incident by ID
  static async findById(id) {
    const sql = `
      SELECT i.*, v.vehicle_tag, rs.name as segment_name
      FROM incidents i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN road_segments rs ON i.segment_id = rs.id
      WHERE i.id = ?
    `;
    const results = await query(sql, [id]);
    return results[0] || null;
  }

  // Create new incident
  static async create(incidentData) {
    const sql = `
      INSERT INTO incidents (vehicle_id, segment_id, type, description, severity, location_lat, location_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      incidentData.vehicle_id || null,
      incidentData.segment_id || null,
      incidentData.type,
      incidentData.description,
      incidentData.severity || 1,
      incidentData.location_lat || null,
      incidentData.location_lng || null
    ]);
    return await this.findById(result.insertId);
  }

  // Resolve incident
  static async resolve(id) {
    const sql = `
      UPDATE incidents 
      SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(sql, [id]);
    return await this.findById(id);
  }
}

module.exports = Incident;