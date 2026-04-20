-- sql/views.sql - Database views for reporting
USE smart_traffic_v2;

-- View: Active vehicles with segment info
CREATE OR REPLACE VIEW v_active_vehicles AS
SELECT 
  v.id,
  v.vehicle_tag,
  v.lat,
  v.lng,
  v.speed,
  v.heading,
  v.status,
  v.updated_at,
  rs.name as segment_name,
  rs.speed_limit as segment_speed_limit,
  TIMESTAMPDIFF(SECOND, v.updated_at, NOW()) as seconds_since_update
FROM vehicles v
LEFT JOIN road_segments rs ON v.segment_id = rs.id
WHERE v.status = 'moving';

-- View: Congestion hotspots
CREATE OR REPLACE VIEW v_congestion_hotspots AS
SELECT 
  rs.id,
  rs.name,
  rs.coords,
  COUNT(v.id) as vehicle_count,
  COALESCE(AVG(v.speed), 0) as avg_speed,
  rs.speed_limit,
  ROUND((COUNT(v.id) / (SELECT COUNT(*) FROM vehicles)) * 100, 2) as percentage_of_traffic,
  CASE 
    WHEN COALESCE(AVG(v.speed), 0) < rs.speed_limit * 0.3 THEN 'CRITICAL'
    WHEN COALESCE(AVG(v.speed), 0) < rs.speed_limit * 0.5 THEN 'WARNING'
    ELSE 'NORMAL'
  END as alert_level
FROM road_segments rs
LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
GROUP BY rs.id, rs.name, rs.coords, rs.speed_limit
HAVING vehicle_count > 3 OR avg_speed < rs.speed_limit * 0.5;

-- View: Daily incident summary
CREATE OR REPLACE VIEW v_daily_incidents AS
SELECT 
  DATE(created_at) as incident_date,
  COUNT(*) as total_incidents,
  SUM(CASE WHEN resolved THEN 1 ELSE 0 END) as resolved_incidents,
  SUM(CASE WHEN NOT resolved THEN 1 ELSE 0 END) as active_incidents,
  ROUND(AVG(severity), 1) as average_severity,
  MAX(severity) as max_severity
FROM incidents
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY incident_date DESC;