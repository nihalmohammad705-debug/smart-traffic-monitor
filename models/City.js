// models/City.js
const { query } = require('../config/database');

class City {
  static async getAll() {
    const sql = `SELECT * FROM cities ORDER BY name`;
    return await query(sql);
  }

  static async getById(id) {
    const sql = `SELECT * FROM cities WHERE id = ?`;
    const results = await query(sql, [id]);
    return results[0] || null;
  }

  static async getActiveCities() {
    const sql = `SELECT * FROM cities WHERE active = TRUE`;
    return await query(sql);
  }

  static async create(cityData) {
    const sql = `
      INSERT INTO cities (name, lat, lng, zoom_level, timezone, rush_hours, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      cityData.name, cityData.lat, cityData.lng, cityData.zoom_level || 12,
      cityData.timezone || 'Asia/Kolkata', 
      JSON.stringify(cityData.rush_hours || ['08:00-10:00', '17:00-19:00']),
      cityData.active !== false
    ]);
    return await this.getById(result.insertId);
  }
}

module.exports = City;