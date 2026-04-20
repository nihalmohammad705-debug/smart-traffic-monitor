-- Drop and recreate the database completely
DROP DATABASE IF EXISTS smart_traffic;
CREATE DATABASE smart_traffic;
USE smart_traffic;

-- Create tables
CREATE TABLE road_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  coords JSON NOT NULL,
  speed_limit INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_tag VARCHAR(50) UNIQUE,
  segment_id INT,
  position_index INT DEFAULT 0,
  lat DOUBLE,
  lng DOUBLE,
  speed DOUBLE,
  heading DOUBLE,
  status ENUM('moving','stopped','incident') DEFAULT 'moving',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NULL,
  segment_id INT NULL,
  type VARCHAR(80),
  description TEXT,
  severity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE
);

-- Insert data with PROPER JSON format (NO SPACES between brackets)
INSERT INTO road_segments (name, coords, speed_limit) VALUES
('Main St - Block A', '[[28.6139,77.2090],[28.6145,77.2100],[28.6150,77.2110]]', 40),
('River Road', '[[28.6120,77.2080],[28.6110,77.2070],[28.6100,77.2060]]', 50);

-- Insert vehicles
INSERT INTO vehicles (vehicle_tag, segment_id, position_index, lat, lng, speed, heading) VALUES
('BUS-101', 1, 0, 28.6139, 77.2090, 30, 45),
('CAR-455', 1, 1, 28.6145, 77.2100, 25, 60),
('TAXI-11', 2, 0, 28.6120, 77.2080, 40, 120),
('TRUCK-77', 1, 0, 28.6139, 77.2090, 20, 45),
('SUV-202', 2, 1, 28.6110, 77.2070, 35, 120);

-- Verify the data
SELECT id, name, coords FROM road_segments;
SELECT id, vehicle_tag, segment_id FROM vehicles;