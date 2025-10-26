/**
 * Unified Dashboard - Chart.js Wrapper
 *
 * Chart creation and management using Chart.js
 */

// ============================================
// Chart Defaults
// ============================================

const ChartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 15,
        usePointStyle: true,
        font: {
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 13,
        weight: '600'
      },
      bodyFont: {
        size: 12
      }
    }
  }
};

// Store chart instances for cleanup
const chartInstances = {};

// ============================================
// Chart Creation Functions
// ============================================

/**
 * Create or update a line chart
 */
function createLineChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas with id "${canvasId}" not found`);
    return null;
  }

  // Destroy existing chart if it exists
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const config = {
    type: 'line',
    data: {
      labels: data.labels || [],
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        borderColor: dataset.borderColor || CONFIG.CHARTS.COLORS.primary,
        backgroundColor: dataset.backgroundColor || `${CONFIG.CHARTS.COLORS.primary}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: dataset.fill !== undefined ? dataset.fill : true,
        pointRadius: 3,
        pointHoverRadius: 5,
        ...dataset
      }))
    },
    options: {
      ...ChartDefaults,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { size: 11 }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 11 }
          }
        }
      },
      ...options
    }
  };

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Create or update a bar chart
 */
function createBarChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas with id "${canvasId}" not found`);
    return null;
  }

  // Destroy existing chart if it exists
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const config = {
    type: 'bar',
    data: {
      labels: data.labels || [],
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        backgroundColor: dataset.backgroundColor || CONFIG.CHARTS.COLORS.primary,
        borderColor: dataset.borderColor || CONFIG.CHARTS.COLORS.primary,
        borderWidth: 0,
        borderRadius: 6,
        ...dataset
      }))
    },
    options: {
      ...ChartDefaults,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { size: 11 }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 11 }
          }
        }
      },
      ...options
    }
  };

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Create or update a doughnut chart
 */
function createDoughnutChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas with id "${canvasId}" not found`);
    return null;
  }

  // Destroy existing chart if it exists
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const colors = data.colors || getChartColors(data.labels?.length || 0);

  const config = {
    type: 'doughnut',
    data: {
      labels: data.labels || [],
      datasets: [{
        data: data.data || [],
        backgroundColor: colors,
        borderWidth: 0,
        ...data.dataset
      }]
    },
    options: {
      ...ChartDefaults,
      cutout: '70%',
      ...options
    }
  };

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Create or update a pie chart
 */
function createPieChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas with id "${canvasId}" not found`);
    return null;
  }

  // Destroy existing chart if it exists
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const colors = data.colors || getChartColors(data.labels?.length || 0);

  const config = {
    type: 'pie',
    data: {
      labels: data.labels || [],
      datasets: [{
        data: data.data || [],
        backgroundColor: colors,
        borderWidth: 0,
        ...data.dataset
      }]
    },
    options: {
      ...ChartDefaults,
      ...options
    }
  };

  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

/**
 * Update an existing chart's data
 */
function updateChart(canvasId, newData) {
  const chart = chartInstances[canvasId];
  if (!chart) {
    console.error(`No chart found with id "${canvasId}"`);
    return;
  }

  if (newData.labels) {
    chart.data.labels = newData.labels;
  }

  if (newData.datasets) {
    chart.data.datasets = newData.datasets;
  }

  chart.update();
}

/**
 * Destroy a chart instance
 */
function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

/**
 * Destroy all chart instances
 */
function destroyAllCharts() {
  Object.keys(chartInstances).forEach(id => {
    chartInstances[id].destroy();
  });
  chartInstances = {};
}

// ============================================
// Specialized Chart Builders
// ============================================

/**
 * Build ranking trend chart
 */
function buildRankingChart(canvasId, rankingData) {
  const chartData = {
    labels: rankingData.map(d => formatDate(d.date, 'short')),
    datasets: [{
      label: 'Average Ranking',
      data: rankingData.map(d => d.avgRank),
      borderColor: CONFIG.CHARTS.COLORS.primary,
      backgroundColor: `${CONFIG.CHARTS.COLORS.primary}20`,
      fill: true
    }]
  };

  return createLineChart(canvasId, chartData, {
    scales: {
      y: {
        reverse: true, // Lower ranking number is better
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return '#' + value;
          }
        }
      }
    }
  });
}

/**
 * Build traffic chart
 */
function buildTrafficChart(canvasId, trafficData) {
  const chartData = {
    labels: trafficData.map(d => formatDate(d.date, 'short')),
    datasets: [
      {
        label: 'Organic Traffic',
        data: trafficData.map(d => d.organic),
        borderColor: CONFIG.CHARTS.COLORS.success,
        backgroundColor: `${CONFIG.CHARTS.COLORS.success}20`
      },
      {
        label: 'Direct Traffic',
        data: trafficData.map(d => d.direct),
        borderColor: CONFIG.CHARTS.COLORS.info,
        backgroundColor: `${CONFIG.CHARTS.COLORS.info}20`
      }
    ]
  };

  return createLineChart(canvasId, chartData);
}

/**
 * Build client distribution chart
 */
function buildClientDistributionChart(canvasId, stats) {
  const chartData = {
    labels: ['Active', 'Pending Setup', 'Inactive'],
    data: [stats.active || 0, stats['pending-setup'] || 0, stats.inactive || 0],
    colors: [
      CONFIG.CHARTS.COLORS.success,
      CONFIG.CHARTS.COLORS.warning,
      CONFIG.CHARTS.COLORS.danger
    ]
  };

  return createDoughnutChart(canvasId, chartData);
}

/**
 * Build performance comparison chart
 */
function buildPerformanceChart(canvasId, performanceData) {
  const chartData = {
    labels: performanceData.map(d => d.clientName),
    datasets: [{
      label: 'Performance Score',
      data: performanceData.map(d => d.score),
      backgroundColor: performanceData.map(d => {
        if (d.score >= 80) return CONFIG.CHARTS.COLORS.success;
        if (d.score >= 60) return CONFIG.CHARTS.COLORS.warning;
        return CONFIG.CHARTS.COLORS.danger;
      })
    }]
  };

  return createBarChart(canvasId, chartData);
}

/**
 * Build automation activity chart
 */
function buildAutomationChart(canvasId, automationData) {
  const chartData = {
    labels: automationData.map(d => d.type),
    data: automationData.map(d => d.count),
    colors: getChartColors(automationData.length)
  };

  return createPieChart(canvasId, chartData);
}
