// config/apiConfig.js
require('dotenv').config();

module.exports = {
  tomtom: {
    apiKey: process.env.TOMTOM_API_KEY,
    baseUrl: 'https://api.tomtom.com',
    trafficUrl: '/traffic/services/4/flowSegmentData/relative0/10/json',
    geocodingUrl: '/search/2/geocode',
    routingUrl: '/routing/1/calculateRoute',
    cacheTTL: 300 // 5 minutes
  },
  openweather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    weatherUrl: '/weather',
    forecastUrl: '/forecast',
    cacheTTL: 600 // 10 minutes
  }
};