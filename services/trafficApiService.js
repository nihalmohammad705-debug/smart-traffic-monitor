// services/trafficApiService.js - WITH REAL INCIDENTS
const axios = require('axios');
const NodeCache = require('node-cache');
const apiConfig = require('../config/apiConfig');

class TrafficApiService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 });
  }

  async getTrafficIncidents(bbox) {
    if (!apiConfig.tomtom.apiKey || apiConfig.tomtom.apiKey === 'your_tomtom_api_key_here') {
      return this.getMockIncidents();
    }
    
    try {
      const response = await axios.get(`https://api.tomtom.com/traffic/services/4/incidentDetails`, {
        params: {
          key: apiConfig.tomtom.apiKey,
          bbox: bbox,
          fields: '{incidents{type,geometry{coordinates},properties{iconCategory,description,startTime,delay,severity}}}',
          language: 'en-IN'
        },
        timeout: 5000
      });
      
      const incidents = response.data.incidents || [];
      return incidents.map(incident => ({
        type: incident.type || 'Incident',
        description: incident.properties?.description || 'Traffic incident reported',
        severity: this.getSeverityFromCategory(incident.properties?.iconCategory),
        lat: incident.geometry?.coordinates[1],
        lng: incident.geometry?.coordinates[0],
        delay: incident.properties?.delay || 0,
        startTime: incident.properties?.startTime
      }));
    } catch (error) {
      console.error('TomTom Incidents API error:', error.message);
      return this.getMockIncidents();
    }
  }

  getSeverityFromCategory(category) {
    const severityMap = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 };
    return severityMap[category] || 3;
  }

  getMockIncidents() {
    const mockIncidents = [
      { type: 'Accident', description: 'Minor accident reported', severity: 3 },
      { type: 'Road Work', description: 'Construction ahead', severity: 2 },
      { type: 'Traffic Jam', description: 'Heavy congestion', severity: 3 }
    ];
    return [mockIncidents[Math.floor(Math.random() * mockIncidents.length)]];
  }

  async getWeather(lat, lng) {
    const cacheKey = `weather_${lat}_${lng}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    if (!apiConfig.openweather.apiKey || apiConfig.openweather.apiKey === 'your_openweather_api_key_here') {
      return this.getMockWeather();
    }
    
    try {
      const response = await axios.get(apiConfig.openweather.baseUrl + apiConfig.openweather.weatherUrl, {
        params: { lat, lon: lng, appid: apiConfig.openweather.apiKey, units: 'metric' },
        timeout: 5000
      });
      
      const weatherData = {
        condition: response.data.weather[0].main,
        temperature: `${Math.round(response.data.main.temp)}°C`,
        windSpeed: `${Math.round(response.data.wind.speed)} km/h`,
        impact: this.calculateWeatherImpact(response.data),
        icon: this.getWeatherIcon(response.data.weather[0].main)
      };
      
      this.cache.set(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      return this.getMockWeather();
    }
  }

  calculateWeatherImpact(weatherData) {
    const condition = weatherData.weather[0].main.toLowerCase();
    if (condition.includes('rain')) return 0.7;
    if (condition.includes('fog')) return 0.6;
    if (condition.includes('thunderstorm')) return 0.5;
    return 1.0;
  }

  getWeatherIcon(condition) {
    const icons = { Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Fog: '🌫️', Thunderstorm: '⛈️' };
    return icons[condition] || '🌡️';
  }

  getMockWeather() {
    return { condition: 'Clear', temperature: '28°C', windSpeed: '5 km/h', impact: 1.0, icon: '☀️' };
  }
}

module.exports = TrafficApiService;