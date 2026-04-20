// models/Vehicle.js
const { query } = require('../config/database');

class Vehicle {
  // Get all vehicles with segment details
  static async findAll() {
    const sql = `
      SELECT v.*, rs.name as segment_name, rs.speed_limit
      FROM vehicles v
      LEFT JOIN road_segments rs ON v.segment_id = rs.id
      ORDER BY v.vehicle_tag
    `;
    return await query(sql);
  }

  // Get vehicle by ID
  static async findById(id) {
    const sql = `
      SELECT v.*, rs.name as segment_name, rs.coords
      FROM vehicles v
      LEFT JOIN road_segments rs ON v.segment_id = rs.id
      WHERE v.id = ?
    `;
    const results = await query(sql, [id]);
    return results[0] || null;
  }

  // Get vehicle by tag
  static async findByTag(tag) {
    const sql = `SELECT * FROM vehicles WHERE vehicle_tag = ?`;
    const results = await query(sql, [tag]);
    return results[0] || null;
  }

  // Update vehicle position
  static async updatePosition(id, positionIndex, lat, lng, speed) {
    const sql = `
      UPDATE vehicles 
      SET position_index = ?, lat = ?, lng = ?, speed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(sql, [positionIndex, lat, lng, speed, id]);
    return await this.findById(id);
  }

  // Get vehicles by segment
  static async findBySegment(segmentId) {
    const sql = `SELECT * FROM vehicles WHERE segment_id = ?`;
    return await query(sql, [segmentId]);
  }

  // Create new vehicle
  static async create(vehicleData) {
    const sql = `
      INSERT INTO vehicles (vehicle_tag, segment_id, position_index, lat, lng, speed, heading, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      vehicleData.vehicle_tag,
      vehicleData.segment_id,
      vehicleData.position_index || 0,
      vehicleData.lat,
      vehicleData.lng,
      vehicleData.speed || 0,
      vehicleData.heading || 0,
      vehicleData.status || 'moving'
    ]);
    return await this.findById(result.insertId);
  }

  // Update vehicle status
  static async updateStatus(id, status) {
    const sql = `UPDATE vehicles SET status = ? WHERE id = ?`;
    await query(sql, [status, id]);
    return await this.findById(id);
  }
}

module.exports = Vehicle;