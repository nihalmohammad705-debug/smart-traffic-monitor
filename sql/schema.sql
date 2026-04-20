-- Drop and recreate database
DROP DATABASE IF EXISTS smart_traffic_v2;
CREATE DATABASE smart_traffic_v2;
USE smart_traffic_v2;

-- Road segments table
CREATE TABLE road_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  coords JSON NOT NULL,
  speed_limit INT DEFAULT 50,
  traffic_density INT DEFAULT 0,
  average_speed FLOAT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_tag VARCHAR(50) UNIQUE NOT NULL,
  segment_id INT,
  position_index INT DEFAULT 0,
  lat DOUBLE,
  lng DOUBLE,
  speed DOUBLE DEFAULT 0,
  heading DOUBLE DEFAULT 0,
  status ENUM('moving', 'stopped', 'incident') DEFAULT 'moving',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES road_segments(id) ON DELETE SET NULL,
  INDEX idx_segment (segment_id),
  INDEX idx_status (status)
);

-- Incidents table
CREATE TABLE incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NULL,
  segment_id INT NULL,
  type VARCHAR(80) NOT NULL,
  description TEXT,
  severity INT DEFAULT 1,
  location_lat DOUBLE,
  location_lng DOUBLE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  resolved BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (segment_id) REFERENCES road_segments(id) ON DELETE SET NULL,
  INDEX idx_resolved (resolved),
  INDEX idx_created (created_at)
);

-- Insert sample road segments
INSERT INTO road_segments (name, coords, speed_limit) VALUES
('Main St - Block A', '[[28.6139,77.2090],[28.6145,77.2100],[28.6150,77.2110],[28.6155,77.2120]]', 40),
('Main St - Block B', '[[28.6155,77.2120],[28.6160,77.2130],[28.6165,77.2140]]', 40),
('River Road', '[[28.6120,77.2080],[28.6110,77.2070],[28.6100,77.2060],[28.6090,77.2050]]', 50),
('Market Street', '[[28.6140,77.2105],[28.6135,77.2115],[28.6130,77.2125]]', 30),
('Highway North', '[[28.6160,77.2080],[28.6170,77.2070],[28.6180,77.2060],[28.6190,77.2050]]', 70);

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_tag, segment_id, position_index, lat, lng, speed, heading) VALUES
('BUS-101', 1, 0, 28.6139, 77.2090, 35, 45),
('CAR-455', 1, 1, 28.6145, 77.2100, 42, 60),
('TAXI-11', 3, 0, 28.6120, 77.2080, 38, 120),
('TRUCK-77', 2, 0, 28.6155, 77.2120, 28, 45),
('SUV-202', 3, 1, 28.6110, 77.2070, 45, 120),
('CAR-888', 4, 0, 28.6140, 77.2105, 25, 90),
('MOTOR-1', 5, 0, 28.6160, 77.2080, 55, 0),
('BUS-202', 2, 1, 28.6160, 77.2130, 32, 45),
('TAXI-22', 1, 2, 28.6150, 77.2110, 40, 60),
('CAR-999', 4, 1, 28.6135, 77.2115, 28, 90);

-- Insert sample incidents
INSERT INTO incidents (vehicle_id, segment_id, type, description, severity, location_lat, location_lng) VALUES
(1, 1, 'Heavy Traffic', 'Slow moving traffic on Main St', 2, 28.6142, 77.2095),
(3, 3, 'Road Work', 'Construction ahead, lane closed', 1, 28.6115, 77.2075),
(NULL, 4, 'Accident', 'Minor accident near market', 3, 28.6138, 77.2110);

-- Create indexes for performance
CREATE INDEX idx_vehicle_tag ON vehicles(vehicle_tag);
CREATE INDEX idx_incident_severity ON incidents(severity);
CREATE INDEX idx_segment_updated ON road_segments(last_updated);

INSERT INTO road_segments (name, coords, speed_limit) VALUES
('Airport Road', '[[28.6200,77.2000],[28.6220,77.1980],[28.6250,77.1950],[28.6300,77.1900]]', 60),
('Downtown Loop', '[[28.6100,77.2150],[28.6080,77.2180],[28.6050,77.2200],[28.6080,77.2220],[28.6120,77.2200]]', 35),
('Industrial Area', '[[28.6000,77.2000],[28.5980,77.1950],[28.5950,77.1900],[28.6000,77.1850]]', 45);

-- Insert more vehicles
INSERT INTO vehicles (vehicle_tag, segment_id, position_index, lat, lng, speed, heading, status) VALUES
('AMB-001', 6, 0, 28.6200, 77.2000, 45, 90, 'moving'),
('POL-999', 7, 1, 28.6080, 77.2180, 30, 180, 'moving'),
('FIRE-88', 8, 2, 28.5950, 77.1900, 50, 270, 'moving'),
('BUS-303', 6, 2, 28.6250, 77.1950, 38, 90, 'moving'),
('CAR-777', 7, 3, 28.6050, 77.2200, 25, 0, 'stopped');

-- Insert more incidents
INSERT INTO incidents (vehicle_id, segment_id, type, description, severity, location_lat, location_lng) VALUES
(5, 7, 'Accident', 'Multi-vehicle collision at intersection', 5, 28.6075, 77.2190),
(NULL, 6, 'Road Construction', 'Night construction work ongoing', 2, 28.6230, 77.1970),
(11, 8, 'Breakdown', 'Vehicle breakdown on shoulder', 2, 28.5970, 77.1880);

-- Create view for traffic summary
CREATE OR REPLACE VIEW traffic_summary AS
SELECT 
  rs.id as segment_id,
  rs.name as segment_name,
  rs.speed_limit,
  COUNT(v.id) as vehicle_count,
  COALESCE(AVG(v.speed), 0) as avg_speed,
  CASE 
    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.8 THEN 'Green'
    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.5 THEN 'Yellow'
    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.3 THEN 'Orange'
    ELSE 'Red'
  END as traffic_status
FROM road_segments rs
LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
GROUP BY rs.id, rs.name, rs.speed_limit;

-- Create view for incident dashboard
CREATE OR REPLACE VIEW incident_dashboard AS
SELECT 
  DATE(created_at) as date,
  type,
  severity,
  COUNT(*) as count,
  AVG(severity) as avg_severity
FROM incidents
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at), type, severity
ORDER BY date DESC, severity DESC;

-- Add cities table
CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  zoom_level INT DEFAULT 12,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  rush_hours JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);