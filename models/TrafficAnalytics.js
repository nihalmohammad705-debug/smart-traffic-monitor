// models/TrafficAnalytics.js
// Complete Traffic Analytics Model with advanced data processing

const { query } = require('../config/database');

class TrafficAnalytics {
    
    // ==================== DATA RECORDING ====================
    
    // Record traffic snapshot for a segment
    static async recordSnapshot(segmentId, vehicleCount, avgSpeed, weatherCondition = null) {
        const congestionLevel = this.calculateCongestionLevel(avgSpeed, vehicleCount);
        const sql = `
            INSERT INTO traffic_analytics 
            (segment_id, vehicle_count, average_speed, congestion_level, weather_condition, timestamp)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            vehicle_count = VALUES(vehicle_count),
            average_speed = VALUES(average_speed),
            congestion_level = VALUES(congestion_level),
            timestamp = NOW()
        `;
        
        try {
            await query(sql, [segmentId, vehicleCount, avgSpeed, congestionLevel, weatherCondition]);
            return { success: true, segmentId, congestionLevel };
        } catch (error) {
            console.error('Error recording snapshot:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Calculate congestion level based on speed and count
    static calculateCongestionLevel(avgSpeed, vehicleCount) {
        if (avgSpeed >= 40) return 'low';
        if (avgSpeed >= 25) return 'moderate';
        if (avgSpeed >= 15) return 'heavy';
        return 'severe';
    }
    
    // ==================== ANALYTICS QUERIES ====================
    
    // Get analytics for specific segment (last N hours)
    static async getSegmentAnalytics(segmentId, hours = 24) {
        const sql = `
            SELECT 
                DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
                ROUND(AVG(vehicle_count), 2) as avg_vehicles,
                ROUND(AVG(average_speed), 2) as avg_speed,
                MAX(vehicle_count) as max_vehicles,
                MIN(vehicle_count) as min_vehicles,
                MAX(average_speed) as max_speed,
                MIN(average_speed) as min_speed,
                (SELECT congestion_level 
                 FROM traffic_analytics ta2 
                 WHERE ta2.segment_id = ? 
                 ORDER BY timestamp DESC LIMIT 1) as current_congestion
            FROM traffic_analytics
            WHERE segment_id = ? 
                AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
            ORDER BY hour ASC
        `;
        
        try {
            const results = await query(sql, [segmentId, segmentId, hours]);
            return this.processTimeSeriesData(results);
        } catch (error) {
            console.error('Error getting segment analytics:', error);
            return [];
        }
    }
    
    // Process time series data for charts
    static processTimeSeriesData(data) {
        return {
            labels: data.map(row => row.hour),
            vehicleCounts: data.map(row => parseFloat(row.avg_vehicles)),
            averageSpeeds: data.map(row => parseFloat(row.avg_speed)),
            maxSpeeds: data.map(row => parseFloat(row.max_speed)),
            minSpeeds: data.map(row => parseFloat(row.min_speed)),
            currentCongestion: data[data.length - 1]?.current_congestion || 'unknown'
        };
    }
    
    // Get overall city analytics
    static async getCityAnalytics() {
        const sql = `
            SELECT 
                COUNT(DISTINCT segment_id) as total_segments_monitored,
                ROUND(AVG(vehicle_count), 2) as city_avg_vehicles,
                ROUND(AVG(average_speed), 2) as city_avg_speed,
                SUM(vehicle_count) as total_vehicles_city,
                congestion_level,
                COUNT(*) as samples_count
            FROM traffic_analytics
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            GROUP BY congestion_level
        `;
        
        try {
            const results = await query(sql);
            return this.processCityAnalytics(results);
        } catch (error) {
            console.error('Error getting city analytics:', error);
            return null;
        }
    }
    
    // Process city analytics data
    static processCityAnalytics(results) {
        const summary = {
            totalSegments: 0,
            avgVehicles: 0,
            avgSpeed: 0,
            totalVehicles: 0,
            congestionLevels: {
                low: 0,
                moderate: 0,
                heavy: 0,
                severe: 0
            }
        };
        
        results.forEach(row => {
            summary.totalSegments = row.total_segments_monitored;
            summary.avgVehicles = parseFloat(row.city_avg_vehicles);
            summary.avgSpeed = parseFloat(row.city_avg_speed);
            summary.totalVehicles = row.total_vehicles_city;
            summary.congestionLevels[row.congestion_level] = row.samples_count;
        });
        
        return summary;
    }
    
    // Get peak congestion times
    static async getPeakCongestionTimes(days = 7) {
        const sql = `
            SELECT 
                DATE_FORMAT(timestamp, '%H:00') as hour_of_day,
                DAYNAME(timestamp) as day_of_week,
                ROUND(AVG(vehicle_count), 2) as avg_vehicles,
                ROUND(AVG(average_speed), 2) as avg_speed,
                COUNT(CASE WHEN congestion_level IN ('heavy', 'severe') THEN 1 END) as peak_hours_count
            FROM traffic_analytics
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE_FORMAT(timestamp, '%H:00'), DAYNAME(timestamp)
            ORDER BY avg_vehicles DESC
            LIMIT 10
        `;
        
        try {
            return await query(sql, [days]);
        } catch (error) {
            console.error('Error getting peak congestion times:', error);
            return [];
        }
    }
    
    // Get real-time congestion hotspots
    static async getCongestionHotspots(threshold = 5) {
        const sql = `
            SELECT 
                rs.id,
                rs.name,
                rs.coords,
                rs.speed_limit,
                COUNT(v.id) as vehicle_count,
                ROUND(COALESCE(AVG(v.speed), 0), 2) as avg_speed,
                ROUND(rs.speed_limit - COALESCE(AVG(v.speed), 0), 2) as speed_deficit,
                CASE 
                    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.8 THEN 'low'
                    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.5 THEN 'moderate'
                    WHEN COALESCE(AVG(v.speed), 0) >= rs.speed_limit * 0.3 THEN 'heavy'
                    ELSE 'severe'
                END as congestion_level,
                ROUND((COUNT(v.id) / NULLIF((SELECT AVG(vehicle_count) FROM traffic_analytics WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)), 0)) * 100, 2) as congestion_percentage
            FROM road_segments rs
            LEFT JOIN vehicles v ON rs.id = v.segment_id AND v.status = 'moving'
            GROUP BY rs.id, rs.name, rs.coords, rs.speed_limit
            HAVING vehicle_count >= ? OR avg_speed < rs.speed_limit * 0.5
            ORDER BY vehicle_count DESC, avg_speed ASC
            LIMIT 20
        `;
        
        try {
            const results = await query(sql, [threshold]);
            return results.map(this.formatHotspotData);
        } catch (error) {
            console.error('Error getting congestion hotspots:', error);
            return [];
        }
    }
    
    // Format hotspot data for map visualization
    static formatHotspotData(hotspot) {
        let coords = hotspot.coords;
        if (typeof coords === 'string') {
            try {
                coords = JSON.parse(coords);
            } catch (e) {
                coords = [];
            }
        }
        
        // Calculate center point of segment
        let centerLat = 0, centerLng = 0;
        if (coords.length > 0) {
            centerLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            centerLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        }
        
        return {
            id: hotspot.id,
            name: hotspot.name,
            center: { lat: centerLat, lng: centerLng },
            vehicleCount: parseInt(hotspot.vehicle_count),
            avgSpeed: parseFloat(hotspot.avg_speed),
            speedLimit: hotspot.speed_limit,
            speedDeficit: parseFloat(hotspot.speed_deficit),
            congestionLevel: hotspot.congestion_level,
            congestionPercentage: parseFloat(hotspot.congestion_percentage),
            severity: this.getSeverityLevel(hotspot.congestion_level)
        };
    }
    
    // Get severity level for alerting
    static getSeverityLevel(congestionLevel) {
        const levels = {
            'low': 1,
            'moderate': 2,
            'heavy': 3,
            'severe': 4
        };
        return levels[congestionLevel] || 1;
    }
    
    // ==================== PREDICTIVE ANALYTICS ====================
    
    // Predict traffic for next hour
    static async predictTraffic(segmentId) {
        // Get historical data for same day/time
        const sql = `
            SELECT 
                AVG(vehicle_count) as predicted_vehicles,
                AVG(average_speed) as predicted_speed,
                MODE() WITHIN GROUP (ORDER BY congestion_level) as predicted_congestion
            FROM traffic_analytics
            WHERE segment_id = ?
                AND DAYOFWEEK(timestamp) = DAYOFWEEK(NOW())
                AND HOUR(timestamp) = HOUR(DATE_ADD(NOW(), INTERVAL 1 HOUR))
                AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;
        
        try {
            const results = await query(sql, [segmentId]);
            if (results.length > 0 && results[0].predicted_vehicles) {
                return {
                    segmentId,
                    predictedVehicles: Math.round(results[0].predicted_vehicles),
                    predictedSpeed: Math.round(results[0].predicted_speed),
                    predictedCongestion: results[0].predicted_congestion,
                    confidence: this.calculateConfidence(results[0])
                };
            }
            return null;
        } catch (error) {
            console.error('Error predicting traffic:', error);
            return null;
        }
    }
    
    // Calculate confidence level of prediction
    static calculateConfidence(prediction) {
        // Simple confidence calculation based on data availability
        let confidence = 0.7; // Base confidence
        
        if (prediction.predicted_vehicles && prediction.predicted_vehicles > 0) {
            confidence += 0.1;
        }
        if (prediction.predicted_speed && prediction.predicted_speed > 0) {
            confidence += 0.1;
        }
        if (prediction.predicted_congestion) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 0.95);
    }
    
    // ==================== REPORTING ====================
    
    // Generate comprehensive traffic report
    static async generateReport(startDate, endDate) {
        const report = {
            generatedAt: new Date(),
            period: { startDate, endDate },
            summary: {},
            detailed: {},
            recommendations: []
        };
        
        try {
            // Get summary statistics
            const summarySql = `
                SELECT 
                    COUNT(DISTINCT segment_id) as segments_analyzed,
                    SUM(vehicle_count) as total_vehicle_observations,
                    ROUND(AVG(vehicle_count), 2) as avg_vehicles_per_segment,
                    ROUND(AVG(average_speed), 2) as overall_avg_speed,
                    COUNT(CASE WHEN congestion_level IN ('heavy', 'severe') THEN 1 END) as congested_periods
                FROM traffic_analytics
                WHERE timestamp BETWEEN ? AND ?
            `;
            const summaryResults = await query(summarySql, [startDate, endDate]);
            report.summary = summaryResults[0] || {};
            
            // Get detailed segment analysis
            const detailedSql = `
                SELECT 
                    rs.name as segment_name,
                    ROUND(AVG(ta.vehicle_count), 2) as avg_vehicles,
                    ROUND(AVG(ta.average_speed), 2) as avg_speed,
                    MAX(ta.vehicle_count) as peak_vehicles,
                    MIN(ta.average_speed) as min_speed,
                    MODE() WITHIN GROUP (ORDER BY ta.congestion_level) as typical_congestion
                FROM traffic_analytics ta
                JOIN road_segments rs ON ta.segment_id = rs.id
                WHERE ta.timestamp BETWEEN ? AND ?
                GROUP BY ta.segment_id, rs.name
                ORDER BY avg_vehicles DESC
            `;
            report.detailed.segments = await query(detailedSql, [startDate, endDate]);
            
            // Generate recommendations
            report.recommendations = this.generateRecommendations(report);
            
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }
    
    // Generate intelligent recommendations based on data
    static generateRecommendations(report) {
        const recommendations = [];
        
        if (report.summary.congested_periods > 10) {
            recommendations.push({
                type: 'infrastructure',
                priority: 'high',
                message: 'High congestion detected. Consider expanding capacity or optimizing traffic signals.'
            });
        }
        
        if (report.summary.overall_avg_speed < 30) {
            recommendations.push({
                type: 'traffic_management',
                priority: 'medium',
                message: 'Average speeds are low. Consider implementing dynamic speed limits.'
            });
        }
        
        return recommendations;
    }
    
    // ==================== EXPORT FUNCTIONS ====================
    
    // Export analytics data to JSON
    static async exportAnalytics(startDate, endDate, format = 'json') {
        const sql = `
            SELECT 
                ta.*,
                rs.name as segment_name,
                rs.speed_limit
            FROM traffic_analytics ta
            JOIN road_segments rs ON ta.segment_id = rs.id
            WHERE ta.timestamp BETWEEN ? AND ?
            ORDER BY ta.timestamp DESC
        `;
        
        try {
            const data = await query(sql, [startDate, endDate]);
            
            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(data);
            }
            
            return data;
        } catch (error) {
            console.error('Error exporting analytics:', error);
            return null;
        }
    }
    
    // Convert data to CSV format
    static convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value).replace(/,/g, ';');
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    // ==================== CLEANUP ====================
    
    // Clean up old analytics data
    static async cleanupOldData(daysToKeep = 30) {
        const sql = `
            DELETE FROM traffic_analytics 
            WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        try {
            const result = await query(sql, [daysToKeep]);
            console.log(`Cleaned up ${result.affectedRows} old analytics records`);
            return { success: true, deletedCount: result.affectedRows };
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TrafficAnalytics;