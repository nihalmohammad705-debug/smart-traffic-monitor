// public/dashboard.js - Advanced Dashboard Features
// This file adds charts, analytics, and enhanced UI to the main dashboard

let congestionChart = null;
let speedChart = null;
let incidentChart = null;
let updateInterval = null;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupDashboardEventListeners();
});

// Main dashboard initialization
function initializeDashboard() {
    createCharts();
    loadDashboardStats();
    startAutoRefresh();
    setupRealTimeListeners();
}

// Create all charts using Chart.js (if available)
function createCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, charts will not be displayed');
        return;
    }

    // Congestion Level Chart
    const congestionCtx = document.getElementById('congestionChart')?.getContext('2d');
    if (congestionCtx) {
        congestionChart = new Chart(congestionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Low', 'Moderate', 'Heavy', 'Severe'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Current Congestion Levels' }
                }
            }
        });
    }

    // Speed Trend Chart
    const speedCtx = document.getElementById('speedChart')?.getContext('2d');
    if (speedCtx) {
        speedChart = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Speed (km/h)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Speed Trends (Last Hour)' }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Speed (km/h)' } },
                    x: { title: { display: true, text: 'Time' } }
                }
            }
        });
    }

    // Incident Distribution Chart
    const incidentCtx = document.getElementById('incidentChart')?.getContext('2d');
    if (incidentCtx) {
        incidentChart = new Chart(incidentCtx, {
            type: 'bar',
            data: {
                labels: ['Accident', 'Breakdown', 'Traffic Jam', 'Construction', 'Other'],
                datasets: [{
                    label: 'Number of Incidents',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#ef4444',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Incidents by Type (Last 24 Hours)' }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Count' } }
                }
            }
        });
    }
}

// Load dashboard statistics from API
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/analytics/dashboard-stats');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardUI(result.data);
            updateCharts(result.data);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Update dashboard UI with real data
function updateDashboardUI(data) {
    // Update stat cards
    document.getElementById('statTotalVehicles').innerText = data.vehicles?.total_vehicles || 0;
    document.getElementById('statMovingVehicles').innerText = data.vehicles?.moving_vehicles || 0;
    document.getElementById('statAvgSpeed').innerText = Math.round(data.vehicles?.average_speed || 0);
    document.getElementById('statActiveIncidents').innerText = data.incidents?.total_incidents || 0;
    document.getElementById('statResolvedIncidents').innerText = data.incidents?.resolved_incidents || 0;
    document.getElementById('statCriticalIncidents').innerText = data.incidents?.critical_incidents || 0;
    document.getElementById('statActiveSegments').innerText = data.segments?.active_segments || 0;
    
    // Update timestamp
    document.getElementById('lastUpdateTime').innerText = new Date().toLocaleTimeString();
}

// Update charts with new data
function updateCharts(data) {
    if (!congestionChart && !speedChart && !incidentChart) return;
    
    // Update congestion chart with segment data
    if (congestionChart && data.congestionLevels) {
        congestionChart.data.datasets[0].data = [
            data.congestionLevels.low || 0,
            data.congestionLevels.moderate || 0,
            data.congestionLevels.heavy || 0,
            data.congestionLevels.severe || 0
        ];
        congestionChart.update();
    }
    
    // Add speed data point to trend chart
    if (speedChart && data.vehicles?.average_speed) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        speedChart.data.labels.push(timeLabel);
        speedChart.data.datasets[0].data.push(data.vehicles.average_speed);
        
        // Keep only last 12 data points
        if (speedChart.data.labels.length > 12) {
            speedChart.data.labels.shift();
            speedChart.data.datasets[0].data.shift();
        }
        speedChart.update();
    }
}

// Load congestion heatmap data
async function loadHeatmapData() {
    try {
        const response = await fetch('/api/analytics/congestion-report');
        const result = await response.json();
        
        if (result.success && window.updateHeatmap) {
            window.updateHeatmap(result.data);
        }
    } catch (error) {
        console.error('Error loading heatmap data:', error);
    }
}

// Load vehicle performance table
async function loadVehiclePerformance() {
    try {
        const response = await fetch('/api/analytics/vehicle-performance');
        const result = await response.json();
        
        if (result.success && result.data) {
            updateVehicleTable(result.data);
        }
    } catch (error) {
        console.error('Error loading vehicle performance:', error);
    }
}

// Update vehicle performance table
function updateVehicleTable(vehicles) {
    const tbody = document.getElementById('vehiclePerformanceBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    vehicles.slice(0, 10).forEach(vehicle => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${vehicle.vehicle_tag}</td>
            <td>${Math.round(vehicle.avg_speed)} km/h</td>
            <td>${Math.round(vehicle.max_speed)} km/h</td>
            <td><span class="status-badge status-${vehicle.status}">${vehicle.status}</span></td>
        `;
    });
}

// Load hourly patterns chart
async function loadHourlyPatterns() {
    try {
        const response = await fetch('/api/analytics/hourly-patterns');
        const result = await response.json();
        
        if (result.success && result.data && window.updateHourlyChart) {
            window.updateHourlyChart(result.data);
        }
    } catch (error) {
        console.error('Error loading hourly patterns:', error);
    }
}

// Export data as CSV
function exportData(format = 'csv') {
    fetch('/api/analytics/export?format=' + format)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `traffic_report_${new Date().toISOString().slice(0,19)}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Export error:', error));
}

// Start auto-refresh for dashboard data
function startAutoRefresh() {
    if (updateInterval) clearInterval(updateInterval);
    
    updateInterval = setInterval(() => {
        loadDashboardStats();
        loadHeatmapData();
        loadVehiclePerformance();
        loadHourlyPatterns();
    }, 30000); // Refresh every 30 seconds
}

// Setup real-time socket listeners for dashboard
function setupRealTimeListeners() {
    if (typeof socket === 'undefined') {
        console.warn('Socket not available for dashboard listeners');
        return;
    }
    
    socket.on('vehicle_update', () => {
        loadDashboardStats();
    });
    
    socket.on('new_incident', () => {
        loadDashboardStats();
        loadHourlyPatterns();
        showNotification('New incident reported!', 'warning');
    });
    
    socket.on('incident_resolved', () => {
        loadDashboardStats();
        showNotification('Incident resolved', 'success');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 5000);
}

// Setup dashboard event listeners
function setupDashboardEventListeners() {
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => exportData('csv'));
    
    // Refresh button
    document.getElementById('refreshDashboardBtn')?.addEventListener('click', () => {
        loadDashboardStats();
        loadHeatmapData();
        loadVehiclePerformance();
        loadHourlyPatterns();
        showNotification('Dashboard refreshed', 'success');
    });
    
    // Date range picker
    document.getElementById('dateRange')?.addEventListener('change', (e) => {
        loadHistoricalData(e.target.value);
    });
}

// Load historical data based on date range
async function loadHistoricalData(range) {
    try {
        const response = await fetch(`/api/analytics/historical?range=${range}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            updateHistoricalChart(result.data);
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

// Update historical chart
function updateHistoricalChart(data) {
    // Implementation for historical chart update
    console.log('Historical data updated:', data);
}

// Export dashboard functions for global use
window.loadDashboardStats = loadDashboardStats;
window.exportData = exportData;
window.showNotification = showNotification;