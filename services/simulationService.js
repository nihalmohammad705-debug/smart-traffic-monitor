// services/simulationService.js - COMPLETE FIXED WITH DUPLICATE CHECK
const Vehicle = require('../models/Vehicle');
const RoadSegment = require('../models/RoadSegment');
const Incident = require('../models/Incident');
const City = require('../models/City');
const TrafficApiService = require('./trafficApiService');
const { query } = require('../config/database');

class SimulationService {
  constructor(io) {
    this.io = io;
    this.isRunning = true;
    this.interval = null;
    this.simulationSpeed = 3000;
    this.trafficApi = new TrafficApiService();
    this.cityData = null;
    this.currentHour = new Date().getHours();
    this.isRushHour = false;
    this.weatherImpact = 1.0;
  }

  async initialize() {
    await this.loadCities();
    await this.createIndianCities();
    await this.createIndianRoadSegments();
    await this.createIndianVehicles();
    console.log('✅ Indian cities and roads initialized');
  }

  async loadCities() {
    try {
      this.cityData = await City.getActiveCities();
    } catch (error) {
      console.log('Cities table not yet ready, continuing...');
      this.cityData = [];
    }
  }

  async createIndianCities() {
    const cities = [
      { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, zoom: 12, rush_hours: ['09:00-11:00', '17:00-19:30'] },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, zoom: 11, rush_hours: ['09:30-11:30', '18:00-20:30'] },
      { name: 'Delhi', lat: 28.6139, lng: 77.2090, zoom: 11, rush_hours: ['08:30-10:30', '17:30-19:30'] },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, zoom: 12, rush_hours: ['09:00-11:00', '17:00-19:00'] },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707, zoom: 11, rush_hours: ['09:00-11:00', '17:30-19:30'] },
      { name: 'Pune', lat: 18.5204, lng: 73.8567, zoom: 12, rush_hours: ['09:00-11:00', '17:00-19:00'] },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639, zoom: 11, rush_hours: ['09:30-11:30', '17:30-19:30'] },
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, zoom: 12, rush_hours: ['09:00-11:00', '18:00-20:00'] }
    ];

    for (const city of cities) {
      try {
        const existing = await query(`SELECT id FROM cities WHERE name = ?`, [city.name]);
        if (existing.length === 0) {
          await query(`
            INSERT INTO cities (name, lat, lng, zoom_level, rush_hours, active) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [city.name, city.lat, city.lng, city.zoom, JSON.stringify(city.rush_hours), true]);
          console.log(`✅ Added city: ${city.name}`);
        }
      } catch (error) {
        console.log(`City ${city.name} may already exist`);
      }
    }
  }

  async createIndianRoadSegments() {
    // Check if segments already exist
    const existingSegments = await query(`SELECT COUNT(*) as count FROM road_segments`);
    if (existingSegments[0].count > 10) {
      console.log(`✅ Road segments already exist (${existingSegments[0].count} segments)`);
      return;
    }

    // Bengaluru Roads
    const bengaluruRoads = [
      { name: 'MG Road, Bengaluru', coords: [[12.9755,77.6065],[12.9760,77.6070],[12.9765,77.6075],[12.9770,77.6080]], speed_limit: 40 },
      { name: 'Brigade Road, Bengaluru', coords: [[12.9730,77.6050],[12.9735,77.6055],[12.9740,77.6060]], speed_limit: 35 },
      { name: 'Outer Ring Road, Bengaluru', coords: [[12.9400,77.6900],[12.9450,77.6950],[12.9500,77.7000],[12.9550,77.7050]], speed_limit: 60 },
      { name: 'Silk Board Junction, Bengaluru', coords: [[12.9200,77.6200],[12.9250,77.6250],[12.9300,77.6300]], speed_limit: 30 },
      { name: 'Electronic City Flyover, Bengaluru', coords: [[12.8400,77.6600],[12.8450,77.6650],[12.8500,77.6700]], speed_limit: 50 },
      { name: 'Church Street, Bengaluru', coords: [[12.9760,77.6080],[12.9770,77.6090],[12.9780,77.6100]], speed_limit: 30 },
      { name: 'Koramangala 80ft Road', coords: [[12.9340,77.6240],[12.9360,77.6260],[12.9380,77.6280]], speed_limit: 35 }
    ];

    // Mumbai Roads
    const mumbaiRoads = [
      { name: 'Marine Drive, Mumbai', coords: [[18.9450,72.8230],[18.9500,72.8240],[18.9550,72.8250],[18.9600,72.8260]], speed_limit: 40 },
      { name: 'Western Express Highway, Mumbai', coords: [[19.1000,72.8500],[19.1100,72.8550],[19.1200,72.8600]], speed_limit: 60 },
      { name: 'Eastern Express Highway, Mumbai', coords: [[19.0800,72.8900],[19.0900,72.8950],[19.1000,72.9000]], speed_limit: 60 },
      { name: 'Linking Road, Mumbai', coords: [[19.0800,72.8300],[19.0850,72.8320],[19.0900,72.8340]], speed_limit: 35 },
      { name: 'Juhu Beach Road', coords: [[19.0950,72.8250],[19.1000,72.8280],[19.1050,72.8300]], speed_limit: 30 }
    ];

    // Delhi Roads
    const delhiRoads = [
      { name: 'Rajpath, Delhi', coords: [[28.6140,77.2100],[28.6150,77.2120],[28.6160,77.2140]], speed_limit: 40 },
      { name: 'Outer Ring Road, Delhi', coords: [[28.6200,77.1800],[28.6300,77.1900],[28.6400,77.2000]], speed_limit: 60 },
      { name: 'NH-8, Delhi', coords: [[28.5600,77.1000],[28.5700,77.1100],[28.5800,77.1200]], speed_limit: 70 },
      { name: 'Chandni Chowk', coords: [[28.6550,77.2300],[28.6560,77.2320],[28.6570,77.2340]], speed_limit: 25 },
      { name: 'Connaught Place', coords: [[28.6300,77.2200],[28.6320,77.2220],[28.6340,77.2240]], speed_limit: 30 }
    ];

    // Hyderabad Roads
    const hyderabadRoads = [
      { name: 'Hitech City Road, Hyderabad', coords: [[17.4480,78.3820],[17.4500,78.3850],[17.4520,78.3880]], speed_limit: 45 },
      { name: 'Necklace Road, Hyderabad', coords: [[17.4150,78.4680],[17.4200,78.4700],[17.4250,78.4720]], speed_limit: 35 },
      { name: 'Gachibowli Road', coords: [[17.4400,78.3500],[17.4450,78.3550],[17.4500,78.3600]], speed_limit: 50 }
    ];

    // Chennai Roads
    const chennaiRoads = [
      { name: 'Marina Beach Road, Chennai', coords: [[13.0500,80.2820],[13.0550,80.2830],[13.0600,80.2840]], speed_limit: 35 },
      { name: 'Anna Salai, Chennai', coords: [[13.0800,80.2700],[13.0850,80.2750],[13.0900,80.2800]], speed_limit: 40 }
    ];

    // Pune Roads
    const puneRoads = [
      { name: 'MG Road, Pune', coords: [[18.5200,73.8800],[18.5250,73.8850],[18.5300,73.8900]], speed_limit: 35 },
      { name: 'FC Road, Pune', coords: [[18.5300,73.8300],[18.5350,73.8350],[18.5400,73.8400]], speed_limit: 30 }
    ];

    // Kolkata Roads
    const kolkataRoads = [
      { name: 'Park Street, Kolkata', coords: [[22.5500,88.3500],[22.5550,88.3550],[22.5600,88.3600]], speed_limit: 30 },
      { name: 'Howrah Bridge Road', coords: [[22.5850,88.3400],[22.5900,88.3450],[22.5950,88.3500]], speed_limit: 40 }
    ];

    // Ahmedabad Roads
    const ahmedabadRoads = [
      { name: 'SG Highway, Ahmedabad', coords: [[23.0200,72.5200],[23.0250,72.5250],[23.0300,72.5300]], speed_limit: 50 },
      { name: 'CG Road, Ahmedabad', coords: [[23.0300,72.5600],[23.0350,72.5650],[23.0400,72.5700]], speed_limit: 35 }
    ];

    const allRoads = [...bengaluruRoads, ...mumbaiRoads, ...delhiRoads, ...hyderabadRoads, ...chennaiRoads, ...puneRoads, ...kolkataRoads, ...ahmedabadRoads];
    
    for (const road of allRoads) {
      try {
        const existing = await query(`SELECT id FROM road_segments WHERE name = ?`, [road.name]);
        if (existing.length === 0) {
          await query(`INSERT INTO road_segments (name, coords, speed_limit) VALUES (?, ?, ?)`, 
            [road.name, JSON.stringify(road.coords), road.speed_limit]);
        }
      } catch (error) {
        // Segment might already exist
        console.log(`Road ${road.name} may already exist`);
      }
    }
    console.log(`✅ Created/verified ${allRoads.length} road segments across India`);
  }

  async createIndianVehicles() {
    // Check if vehicles already exist
    const existingVehicles = await query(`SELECT COUNT(*) as count FROM vehicles`);
    if (existingVehicles[0].count > 20) {
      console.log(`✅ Vehicles already exist (${existingVehicles[0].count} vehicles)`);
      return;
    }

    // Get all segments
    const segments = await query(`SELECT id, coords FROM road_segments`);
    if (segments.length === 0) {
      console.log('No road segments found, skipping vehicle creation');
      return;
    }

    const vehicleConfigs = [
      { prefix: 'KA', city: 'Bengaluru', types: ['BUS', 'TAXI', 'AUTO', 'CAR'], startNum: 1, count: 15 },
      { prefix: 'MH', city: 'Mumbai', types: ['BUS', 'TAXI', 'AUTO', 'CAR'], startNum: 1, count: 15 },
      { prefix: 'DL', city: 'Delhi', types: ['BUS', 'TAXI', 'CAR'], startNum: 1, count: 12 },
      { prefix: 'TS', city: 'Hyderabad', types: ['BUS', 'TAXI', 'CAR'], startNum: 1, count: 12 },
      { prefix: 'TN', city: 'Chennai', types: ['BUS', 'TAXI', 'CAR'], startNum: 1, count: 10 },
      { prefix: 'MH', city: 'Pune', types: ['BUS', 'TAXI', 'CAR'], startNum: 101, count: 8 },
      { prefix: 'WB', city: 'Kolkata', types: ['BUS', 'TAXI', 'CAR'], startNum: 101, count: 8 },
      { prefix: 'GJ', city: 'Ahmedabad', types: ['BUS', 'TAXI', 'CAR'], startNum: 101, count: 8 }
    ];

    let totalInserted = 0;

    for (const config of vehicleConfigs) {
      for (let i = 0; i < config.count; i++) {
        const type = config.types[i % config.types.length];
        const vehicleNumber = `${config.prefix}-${type}-${String(config.startNum + i).padStart(3, '0')}`;
        
        // Check if vehicle already exists
        const existing = await query(`SELECT id FROM vehicles WHERE vehicle_tag = ?`, [vehicleNumber]);
        if (existing.length > 0) {
          console.log(`Vehicle ${vehicleNumber} already exists, skipping`);
          continue;
        }
        
        // Assign to a random segment
        const randomSegment = segments[Math.floor(Math.random() * segments.length)];
        let coords = [];
        try {
          coords = JSON.parse(randomSegment.coords);
        } catch(e) {
          coords = [[28.6139, 77.2090]];
        }
        
        const startCoord = coords[0] || [28.6139, 77.2090];
        const startSpeed = Math.random() * 30 + 20;
        const startHeading = Math.random() * 360;
        
        try {
          await query(`
            INSERT INTO vehicles (vehicle_tag, segment_id, position_index, lat, lng, speed, heading, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [vehicleNumber, randomSegment.id, 0, startCoord[0], startCoord[1], startSpeed, startHeading, 'moving']);
          totalInserted++;
          console.log(`✅ Added vehicle: ${vehicleNumber}`);
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`Error adding vehicle ${vehicleNumber}:`, error.message);
          }
        }
      }
    }
    
    console.log(`✅ Created ${totalInserted} new vehicles across India`);
  }

  async updateVehicles() {
    try {
      await this.updateTimeContext();
      const vehicles = await Vehicle.findAll();
      
      for (const vehicle of vehicles) {
        if (vehicle.status === 'stopped') continue;
        
        const segment = await RoadSegment.findById(vehicle.segment_id);
        if (!segment || !segment.coords) continue;
        
        let coords = typeof segment.coords === 'string' ? JSON.parse(segment.coords) : segment.coords;
        if (!coords || !coords.length) continue;
        
        let speedMultiplier = this.calculateSpeedMultiplier(segment);
        let newSpeed = Math.max(10, Math.min(80, vehicle.speed * speedMultiplier + (Math.random() - 0.5) * 8));
        let newPositionIndex = (vehicle.position_index + 1) % coords.length;
        
        const newLat = coords[newPositionIndex][0];
        const newLng = coords[newPositionIndex][1];
        
        await Vehicle.updatePosition(vehicle.id, newPositionIndex, newLat, newLng, newSpeed);
        
        const updatedVehicle = await Vehicle.findById(vehicle.id);
        if (this.io) {
          this.io.emit('vehicle_update', updatedVehicle);
        }
        
        await this.generateRealisticIncidents(vehicle, segment, newSpeed);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
  }

  calculateSpeedMultiplier(segment) {
    let multiplier = 1.0;
    const hour = this.currentHour;
    
    if (this.isRushHour) multiplier *= 0.6;
    if (hour < 6 || hour > 22) multiplier *= 1.2;
    else if (hour >= 10 && hour <= 16) multiplier *= 0.9;
    multiplier *= this.weatherImpact;
    
    return Math.max(0.3, Math.min(1.5, multiplier));
  }

  updateTimeContext() {
    this.currentHour = new Date().getHours();
    this.isRushHour = (this.currentHour >= 8 && this.currentHour <= 10) || 
                      (this.currentHour >= 17 && this.currentHour <= 19);
  }

  async generateRealisticIncidents(vehicle, segment, currentSpeed) {
    let incidentChance = 0.01;
    if (this.isRushHour) incidentChance *= 2;
    if (this.weatherImpact < 0.7) incidentChance *= 1.5;
    if (currentSpeed < 15) incidentChance *= 2;
    
    if (Math.random() < incidentChance) {
      const incidentTypes = [
        { type: 'Accident', severity: 4, desc: 'Vehicle collision reported' },
        { type: 'Breakdown', severity: 2, desc: 'Vehicle stopped on road' },
        { type: 'Traffic Jam', severity: 3, desc: 'Slow moving traffic' },
        { type: 'Road Construction', severity: 1, desc: 'Ongoing road work' }
      ];
      
      const incident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
      
      await Incident.create({
        vehicle_id: vehicle.id,
        segment_id: segment.id,
        type: incident.type,
        description: `${incident.desc} on ${segment.name}`,
        severity: incident.severity,
        location_lat: vehicle.lat,
        location_lng: vehicle.lng
      });
      
      if (this.io) {
        this.io.emit('new_incident', {
          type: incident.type,
          description: incident.desc,
          severity: incident.severity,
          segment_name: segment.name
        });
      }
    }
  }

  async updateWeatherImpact() {
    try {
      const weather = await this.trafficApi.getWeather(12.9716, 77.5946);
      if (weather) {
        this.weatherImpact = weather.impact || 1.0;
        if (this.io) {
          this.io.emit('weather_update', { impact: this.weatherImpact, condition: weather.condition });
        }
      }
    } catch (error) {
      console.error('Weather update error:', error);
    }
  }

  async start(interval = 3000) {
    await this.initialize();
    this.simulationSpeed = interval;
    if (this.interval) clearInterval(this.interval);
    
    this.interval = setInterval(async () => {
      if (!this.isRunning) return;
      await this.updateVehicles();
      await this.updateWeatherImpact();
    }, this.simulationSpeed);
    
    console.log(`✅ Indian Traffic Simulation started with interval: ${this.simulationSpeed}ms`);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    console.log('⏸️ Simulation stopped');
  }

  setSpeed(ms) {
    this.simulationSpeed = ms;
    if (this.interval) { this.stop(); this.start(ms); }
  }
}

module.exports = SimulationService;