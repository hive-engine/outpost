<template>
  <div class="bg-[#0b0f19] text-slate-100 font-sans min-h-screen p-4 md:p-6 flex flex-col justify-between selection:bg-yellow-400 selection:text-black w-full rounded-xl">
    <div class="max-w-6xl mx-auto space-y-6 w-full flex-grow">
      
      <!-- Status & Node Info Banner -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-2">
        <div>
          <span class="text-yellow-400 font-semibold uppercase text-[10px] tracking-wider block mb-0.5">Active Data Stream</span>
          <p id="status-text" class="text-slate-300 text-xs">Connecting to Hive Engine live nodes...</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="bg-yellow-950/60 text-yellow-400 border border-yellow-800/40 text-[11px] px-2.5 py-1 rounded-md font-medium">Hive Engine (2019–Present)</span>
          <span id="api-badge" class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/50">Checking API...</span>
        </div>
      </div>

      <!-- Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow">
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Current Price</span>
          <div id="stat-price" class="text-2xl font-bold mt-2 text-yellow-400">Loading...</div>
          <span id="stat-price-change" class="text-xs text-slate-500">--</span>
        </div>
        <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow">
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">24H Volume</span>
          <div id="stat-volume" class="text-2xl font-bold mt-2 text-slate-100">Loading...</div>
          <span class="text-xs text-slate-500">Traded past 24 hours</span>
        </div>
      </div>

      <!-- Chart Section -->
      <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-100">Historical Price Trajectory</h2>
            <p id="chart-subtext" class="text-xs text-slate-400">Tracking daily close metrics from repository dataset.</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <label for="filter-year" class="text-xs text-slate-400 font-medium">Year:</label>
              <select id="filter-year" class="bg-slate-950 text-slate-200 text-xs focus:outline-none cursor-pointer">
                <option value="ALL">All Years</option>
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <button id="reset-filter" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg transition font-medium">Reset</button>
          </div>
        </div>

        <div class="relative h-[400px] w-full">
          <canvas id="priceChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PriceStatsPage',
  async mounted() {
    // Dynamically import Chart.js only on the client side to prevent SSR compilation errors
    const Chart = (await import('chart.js/auto')).default;
    
    let myChart = null;
    let globalDataPoints = [];

    try {
      const response = await fetch('https://api.hive-engine.com/rpc/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'find',
          params: {
            contract: 'market',
            table: 'metrics',
            query: { symbol: 'LASSECASH' }
          },
          id: 1
        })
      });
      const json = await response.json();
      const metrics = json.result && json.result[0] ? json.result[0] : null;

      if (metrics) {
        document.getElementById('stat-price').innerText = parseFloat(metrics.lastPrice).toFixed(4) + ' SWAP.HIVE';
        document.getElementById('stat-volume').innerText = parseFloat(metrics.volume).toLocaleString() + ' LASSECASH';
        document.getElementById('status-text').innerText = 'Connected live to Hive Engine Node (Symbol: LASSECASH)';
        let badge = document.getElementById('api-badge');
        badge.innerText = 'API Online';
        badge.className = 'px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/50';
      }
    } catch (e) {
      document.getElementById('status-text').innerText = 'API Offline - Displaying historical metrics mode.';
    }

    try {
      const historyRes = await fetch('https://raw.githubusercontent.com/lasseehlers/LasseCash-price-stats/main/data/daily_history.json');
      const historyJson = await historyRes.json();
      globalDataPoints = historyJson.data_points || [];
      renderChart(globalDataPoints, "Timeline: Day-to-Day (" + globalDataPoints.length + " Days)");
    } catch (err) {
      console.error("Failed to load history data:", err);
    }

    function renderChart(dataPoints, subtitleText) {
      const canvasEl = document.getElementById('priceChart');
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      
      const labels = dataPoints.map(d => d.date);
      const prices = dataPoints.map(d => d.price);

      const subtextEl = document.getElementById('chart-subtext');
      if (subtextEl) subtextEl.innerText = subtitleText;

      if (myChart) {
        myChart.destroy();
      }

      myChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Daily Close Price (SWAP.HIVE)',
            data: prices,
            borderColor: '#facc15',
            backgroundColor: 'rgba(250, 204, 21, 0.07)',
            borderWidth: 2,
            fill: true,
            pointRadius: dataPoints.length > 60 ? 0 : 3,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#94a3b8', maxTicksLimit: 8 }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }

    const filterEl = document.getElementById('filter-year');
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        const selectedYear = filterEl.value;
        const filtered = globalDataPoints.filter(d => {
          const year = d.date.split('-')[0];
          return (selectedYear === 'ALL' || year === selectedYear);
        });
        let subtext = `Filtered View: ${filtered.length} matching data points found for ${selectedYear}.`;
        if (selectedYear === 'ALL') {
          subtext = "Timeline: Day-to-Day (" + globalDataPoints.length + " Days)";
        }
        renderChart(filtered, subtext);
      });
    }

    const resetEl = document.getElementById('reset-filter');
    if (resetEl) {
      resetEl.addEventListener('click', () => {
        if (filterEl) filterEl.value = 'ALL';
        renderChart(globalDataPoints, "Timeline: Day-to-Day (" + globalDataPoints.length + " Days)");
      });
    }
  }
}
</script>
