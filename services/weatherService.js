// services/weatherService.js
const TrafficApiService = require('./trafficApiService');

const apiService = new TrafficApiService();

class WeatherService {
  
  // Get weather for a specific location
  static async getWeatherForLocation(lat, lng) {
    try {
      const weather = await apiService.getWeather(lat, lng);
      return weather;
    } catch (error) {
      console.error('Weather service error:', error);
      return null;
    }
  }

  // Get weather impact factor for traffic
  static async getWeatherImpactFactor(lat, lng) {
    try {
      const weather = await apiService.getWeather(lat, lng);
      return weather ? weather.impact : 1.0;
    } catch (error) {
      return 1.0;
    }
  }

  // Format weather for display
  static formatWeatherForUI(weather) {
    if (!weather) return null;
    
    const conditionIcons = {
      Clear: '☀️',
      Clouds: '☁️',
      Rain: '🌧️',
      Snow: '❄️',
      Fog: '🌫️',
      Thunderstorm: '⛈️'
    };
    
    return {
      icon: conditionIcons[weather.condition] || '🌡️',
      condition: weather.condition,
      description: weather.description,
      temperature: `${Math.round(weather.temperature)}°C`,
      feelsLike: `${Math.round(weather.feelsLike)}°C`,
      humidity: `${Math.round(weather.humidity)}%`,
      windSpeed: `${Math.round(weather.windSpeed)} km/h`,
      trafficImpact: weather.impact < 0.6 ? '⚠️ Poor' : weather.impact < 0.8 ? '📉 Reduced' : '✅ Normal'
    };
  }
}

module.exports = WeatherService;