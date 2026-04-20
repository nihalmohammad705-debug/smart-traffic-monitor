# ![Smart Traffic Monitor](/assets/images/Smart_Traffic_Monitor_Logo1.jpeg) Smart Traffic Monitor

[![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 Overview

**Smart Traffic Monitor** is a real-time traffic simulation and monitoring web application that provides an interactive dashboard to visualize vehicle movements, traffic incidents, and weather conditions across multiple Indian cities.

> **⚠️ Important Note:** This is a **TRAFFIC SIMULATION** application. Vehicle movements, incidents, and traffic patterns are simulated based on configurable parameters. It does not track real-world vehicles unless integrated with external APIs (TomTom, OpenWeatherMap).

---

## ✨ Features

### Core Features
|           Feature          |                         Description                                       |
|----------------------------|---------------------------------------------------------------------------|
| 🗺️ **Interactive Map**     | Real-time visualization of roads and vehicles using Leaflet/CartoDB       |
| 🚗 **Vehicle Tracking**    | Simulated vehicles moving along road networks with realistic patterns     |
| ⚠️ **Incident Management** | Real-time incident reporting with severity levels and location mapping    |
| 🌤️ **Weather Integration** | Live weather data from OpenWeatherMap API (optional)                      |
| 📊 **Analytics Dashboard** | Traffic charts, congestion levels, and vehicle performance metrics        |
| 🔍 **City Search**         | Search and navigate to any city worldwide using Nominatim                 |
| 📱 **Responsive Design**   | Works on desktop, tablet, and mobile devices                              |

### Simulation Features
- 🚦 **Rush Hour Logic** - Traffic slows during peak hours (8-10 AM, 5-7 PM)
- 🌧️ **Weather Impact** - Rain, fog, and storms reduce traffic speeds by 20-50%
- 🚨 **Dynamic Incidents** - Random accidents, breakdowns, and traffic jams
- 🏙️ **8 Indian Cities** - Pre-configured roads for Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad
- 🚗 **200+ Vehicles** - Realistic Indian number plates (KA, MH, DL, TS, TN, WB, GJ)

### Real-Time Features (with API Keys)
- 🌍 **Live Weather** - Current temperature, wind speed, humidity from OpenWeatherMap
- 🚧 **Real Incidents** - Live traffic incidents from TomTom API (free tier: 2,500 requests/day)

---

## 🏗️ Architecture
```text
┌─────────────────────────────────────────────────────────────┐
│ Client Browser                                              │
│       ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│       │ Leaflet │ │ Chart.js│ │Socket.IO│ │ HTML5   │       │
│       │ Map     │ │ Charts  │ │ Client  │ │ CSS     │       │
│       └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (Socket.IO)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Node.js Server                                              │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Express.js │ Socket.IO │ REST API │ WebSocket       │  │
│    └─────────────────────────────────────────────────────┘  │
│       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│       │ Simulation  │ │ Traffic     │ │ Weather     │       │
│       │ Service     │ │ API Service │ │ Service     │       │
│       └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ MySQL Database                                              │
│     ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐   │
│     │ vehicles  │ │ segments  │ │ incidents │ │ cities  │   │
│     └───────────┘ └───────────┘ └───────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────┘



## 🚀 Getting Started

### Prerequisites

| Requirement | Version |                             Installation Guide                          |
|-------------|---------|-------------------------------------------------------------------------|
| Node.js     | 18+     | [https://nodejs.org/](https://nodejs.org/)                              |
| MySQL       | 8.0+    | [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/)    |
| npm         | 9+      | Included with Node.js                                                   |
| Git         | Latest  | [https://git-scm.com/](https://git-scm.com/)                            |

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smart-traffic-monitor.git
cd smart-traffic-monitor
npm install


## Create a .env file in the root directory:

# Database Configuration (Required)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=smart_traffic_v2
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# API Keys (Optional - Without these, mock data is used)
TOMTOM_API_KEY=your_tomtom_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Simulation Settings
SIMULATION_INTERVAL=3000
MAX_VEHICLES=200
INCIDENT_PROBABILITY=0.02
RUSH_HOUR_MULTIPLIER=1.5
WEATHER_AFFECTS_TRAFFIC=true

# Cities to monitor
CITIES=Bengaluru,Mumbai,Delhi,Hyderabad,Chennai,Pune,Kolkata,Ahmedabad


## Setup Database

# Login to MySQL
mysql -u root -p

# Run these commands in MySQL
CREATE DATABASE smart_traffic_v2;
USE smart_traffic_v2;
SOURCE sql/schema.sql;
EXIT;



## Start Application

cd smart-traffic-monitor
node server.js

## Access the Application
Open your browser and navigate to: http://localhost:3000



## How to Use 
Dashboard Controls
Control	Action
Center Map	Resets map view to show all road segments
Speed Dropdown	Adjust simulation speed (Slow/Normal/Fast)
Refresh	Reloads all data from server
City Search	Type city name → Click Search to navigate
Vehicle Search	Filter vehicles by number plate
Map Click	Click anywhere on map to show traffic & weather

What You See
Section	Description
Map	Blue lines = roads, Colored dots = vehicles
Live Stats	Active vehicles count, average speed, active incidents
Weather Widget	Current conditions at clicked location
Vehicle List	All active vehicles with current speed
Incidents List	Active incidents with severity level
Analytics Charts	Congestion distribution and speed trends

Vehicle Color Coding
Vehicle Type	Color	Icon
BUS	Red	🚌
TAXI	Orange	🚕
TRUCK	Purple	🚚
CAR / AUTO	Blue	🚗


## 🔑 Optional API Keys Setup
The application works without API keys using mock data. To enable live data:

OpenWeatherMap API (Free)
Sign up at openweathermap.org
Navigate to API Keys section
Copy your key to .env as OPENWEATHER_API_KEY

TomTom API (Free - 2,500 requests/day)
Sign up at developer.tomtom.com
Go to API Keys section
Create new key for Traffic API
Copy to .env as TOMTOM_API_KEY

📁 Project Structure
smart-traffic-monitor/
├── server.js                 # Main Express server
├── package.json             # Dependencies
├── .env                     # Environment variables
├── config/
│   ├── database.js          # MySQL connection
│   └── apiConfig.js         # API configuration
├── models/
│   ├── Vehicle.js           # Vehicle model
│   ├── RoadSegment.js       # Road segment model
│   ├── Incident.js          # Incident model
│   └── City.js              # City model
├── services/
│   ├── simulationService.js # Vehicle simulation
│   ├── trafficApiService.js # API integration
│   └── alertService.js      # Alert system
├── routes/
│   └── api.js               # REST API routes
├── public/
│   ├── index.html           # Dashboard
│   ├── client.js            # Frontend logic
│   ├── style.css            # Styling
│   └── assets/              # Images
└── sql/
    └── schema.sql           # Database schema


🐛 Troubleshooting
Issue	Solution
MySQL connection error	Run net start MySQL80 (Windows) or sudo systemctl start mysql (Linux/Mac)
Port 3000 already in use	Change PORT in .env file
Map not loading	Check internet connection
Vehicles not moving	Check browser console for Socket.IO errors
Duplicate entry errors	Clear database and re-run schema
Database Reset
bash
mysql -u root -p -e "DROP DATABASE IF EXISTS smart_traffic_v2; CREATE DATABASE smart_traffic_v2;"
mysql -u root -p smart_traffic_v2 < sql/schema.sql


📝 License
This project is licensed under the MIT License.


🙏 Acknowledgments
Leaflet - Interactive maps

OpenStreetMap - Map tiles

Chart.js - Analytics charts

Socket.IO - Real-time communication

TomTom - Traffic API

OpenWeatherMap - Weather API
