-- sql/procedures.sql - Stored procedures
USE smart_traffic_v2;

-- Procedure: Get traffic report for a segment
DELIMITER //
CREATE PROCEDURE sp_get_segment_report(IN p_segment_id INT)
BEGIN
  SELECT 
    rs.name,
    rs.speed_limit,
    COUNT(v.id) as vehicle_count,
    COALESCE(AVG(v.speed), 0) as avg_speed,
    MIN(v.speed) as min_speed,
    MAX(v.speed) as max_speed,
    (SELECT COUNT(*) FROM incidents WHERE segment_id = p_segment_id AND resolved = FALSE) as active_incidents
  FROM road_segments rs
  LEFT JOIN vehicles v ON rs.id = v.segment_id
  WHERE rs.id = p_segment_id;
END//
DELIMITER ;

-- Procedure: Clean up old data
DELIMITER //
CREATE PROCEDURE sp_cleanup_old_data(IN p_days INT)
BEGIN
  DECLARE v_cutoff_date DATETIME;
  SET v_cutoff_date = DATE_SUB(NOW(), INTERVAL p_days DAY);
  
  -- Archive old incidents (in real system, move to archive table)
  -- For now, just resolve very old incidents
  UPDATE incidents 
  SET resolved = TRUE, resolved_at = NOW()
  WHERE created_at < v_cutoff_date AND resolved = FALSE;
  
  SELECT ROW_COUNT() as incidents_cleaned;
END//
DELIMITER ;

-- Procedure: Get real-time traffic metrics
DELIMITER //
CREATE PROCEDURE sp_realtime_metrics()
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM vehicles WHERE status = 'moving') as active_vehicles,
    (SELECT COUNT(*) FROM vehicles WHERE status = 'stopped') as stopped_vehicles,
    (SELECT COALESCE(AVG(speed), 0) FROM vehicles WHERE status = 'moving') as avg_moving_speed,
    (SELECT COUNT(*) FROM incidents WHERE resolved = FALSE) as active_incidents,
    (SELECT COUNT(*) FROM incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as incidents_last_hour;
END//
DELIMITER ;

-- Procedure: Simulate vehicle movement (batch update)
DELIMITER //
CREATE PROCEDURE sp_batch_update_vehicles()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_id INT;
  DECLARE v_segment_id INT;
  DECLARE v_position INT;
  DECLARE v_speed FLOAT;
  DECLARE cur CURSOR FOR SELECT id, segment_id, position_index, speed FROM vehicles WHERE status = 'moving';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_id, v_segment_id, v_position, v_speed;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Update logic here (simplified)
    UPDATE vehicles 
    SET updated_at = NOW()
    WHERE id = v_id;
  END LOOP;
  
  CLOSE cur;
END//
DELIMITER ;