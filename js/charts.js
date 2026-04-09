/**
 * charts.js — Chart creation using Chart.js.
 *
 * Charts available now (Functions 1–4):
 *   1. Top Companies by Mission Count  (horizontal bar)  — Function 4
 *   2. Success Rate by Company         (vertical bar)    — Functions 2 + 4
 *
 * Outlier capping: bars >3× IQR above Q3 are visually capped; the real
 * value is shown in the tooltip and an asterisk note is shown below the chart.
 *
 * Rationale:
 *   Horizontal bar — long company names fit naturally on the Y axis without
 *   rotation, and ranked data reads top-to-bottom intuitively.
 *   Vertical bar for success rates — a 0–100% scale is naturally vertical,
 *   matching common mental models (higher = better).
 */
const Charts = (() => {
  'use strict';

  const _instances = {};        // keyed by canvas id
  const _originalBgColors = {}; // saved bg colors per chart before highlight
  let _highlightedLabel = null; // currently highlighted entity label
  let _hlBusy = false;          // re-entrancy guard for highlight updates

  // Charts that show company-level data and participate in cross-highlight
  const _COMPANY_CHARTS = ['chart-top-companies', 'chart-success-rate'];

  // Charts that show year-level data and participate in year cross-highlight
  const _YEAR_CHARTS = ['chart-launches-year', 'chart-cost-trends'];
  let _highlightedYear = null;
  let _yearHlBusy = false;

  // ── Outlier capping ──────────────────────────────────────────────────────────

  /**
   * Given an array of numbers, returns { capped, capValue, hasOutliers }.
   * Values above Q3 + 3×IQR are capped at capValue.
   */
  function _capOutliers(values) {
    if (values.length < 4) return { capped: [...values], capValue: null, hasOutliers: false };

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const fence = q3 + 3 * iqr;

    const hasOutliers = values.some(v => v > fence);
    if (!hasOutliers) return { capped: [...values], capValue: null, hasOutliers: false };

    const capValue = fence * 1.1;   // cap display at 10% above fence
    const capped   = values.map(v => (v > fence ? capValue : v));
    return { capped, capValue, hasOutliers };
  }

  // ── Shared chart defaults ────────────────────────────────────────────────────

  function _destroy(id) {
    if (_instances[id]) {
      _instances[id].destroy();
      delete _instances[id];
    }
    delete _originalBgColors[id];
  }

  // ── Cross-chart highlight ────────────────────────────────────────────────────

  function _dimColor(rgba) {
    return rgba.replace(/rgba?\(([^,]+),([^,]+),([^,]+)(?:,[^)]+)?\)/,
      (_, r, g, b) => `rgba(${r},${g},${b},0.12)`);
  }

  function _fullColor(rgba) {
    return rgba.replace(/rgba?\(([^,]+),([^,]+),([^,]+)(?:,[^)]+)?\)/,
      (_, r, g, b) => `rgba(${r},${g},${b},1)`);
  }

  function _applyHighlightToChart(chartId, label) {
    const chart = _instances[chartId];
    if (!chart) return;
    const labels  = chart.data.labels;
    const dataset = chart.data.datasets[0];

    if (!_originalBgColors[chartId]) {
      const orig = dataset.backgroundColor;
      _originalBgColors[chartId] = Array.isArray(orig)
        ? [...orig]
        : Array(labels.length).fill(orig);
    }

    const idx = labels.indexOf(label);
    dataset.backgroundColor = _originalBgColors[chartId].map((c, i) =>
      i === idx ? _fullColor(c) : _dimColor(c)
    );

    if (idx !== -1) {
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
    } else {
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    }
    chart.update('none');
  }

  function _removeHighlightFromChart(chartId) {
    const chart = _instances[chartId];
    if (!chart || !_originalBgColors[chartId]) return;
    chart.data.datasets[0].backgroundColor = _originalBgColors[chartId];
    delete _originalBgColors[chartId];
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update('none');
  }

  // Public: highlight an entity (company name) in all applicable charts
  function highlight(entity) {
    if (!entity || _hlBusy) return;
    _hlBusy = true;
    _highlightedLabel = entity;
    _COMPANY_CHARTS.forEach(id => _applyHighlightToChart(id, entity));
    _hlBusy = false;
  }

  // Public: clear all active highlights
  function clearHighlight() {
    if (_hlBusy) return;
    _hlBusy = true;
    _highlightedLabel = null;
    _COMPANY_CHARTS.forEach(id => _removeHighlightFromChart(id));
    _hlBusy = false;
  }

  // ── Year cross-highlight (line charts — tooltip sync) ────────────────────────

  function _applyYearHighlightToChart(chartId, yearLabel) {
    const chart = _instances[chartId];
    if (!chart) return;
    const idx = chart.data.labels.indexOf(yearLabel);
    if (idx === -1) {
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    } else {
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
    }
    chart.update('none');
  }

  function _removeYearHighlightFromChart(chartId) {
    const chart = _instances[chartId];
    if (!chart) return;
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update('none');
  }

  // Public: highlight a year in both year charts
  function highlightYear(yearLabel) {
    if (!yearLabel || _yearHlBusy) return;
    _yearHlBusy = true;
    _highlightedYear = yearLabel;
    _YEAR_CHARTS.forEach(id => _applyYearHighlightToChart(id, yearLabel));
    _yearHlBusy = false;
  }

  // Public: clear year highlights
  function clearYearHighlight() {
    if (_yearHlBusy) return;
    _yearHlBusy = true;
    _highlightedYear = null;
    _YEAR_CHARTS.forEach(id => _removeYearHighlightFromChart(id));
    _yearHlBusy = false;
  }

  const _font = { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };

  // ── Chart 1: Top Companies by Mission Count (horizontal bar) ─────────────────

  function _renderTopCompanies(rows) {
    const id = 'chart-top-companies';
    _destroy(id);

    const noteEl = document.getElementById('chart-top-companies-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-top-companies-wrap'));
      return;
    }

    // Build counts from filtered rows
    const counts = {};
    for (const r of rows) {
      const c = (r.Company || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 15);

    const labels = sorted.map(([name]) => name);
    const raw    = sorted.map(([, n]) => n);
    const { capped, capValue, hasOutliers } = _capOutliers(raw);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Missions',
          data: capped,
          backgroundColor: 'rgba(67,97,238,0.75)',
          borderColor:     'rgba(67,97,238,1)',
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onHover(event, activeElements, chart) {
          if (activeElements.length === 0) {
            if (_highlightedLabel !== null) clearHighlight();
            return;
          }
          const label = chart.data.labels[activeElements[0].index];
          if (label !== _highlightedLabel) highlight(label);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const real = raw[ctx.dataIndex];
                const disp = capped[ctx.dataIndex];
                const suffix = real !== disp ? ` (actual: ${real.toLocaleString()})` : '';
                return ` ${real.toLocaleString()} missions${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: _font },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          },
          y: { ticks: { font: _font }, grid: { display: false } }
        }
      }
    });

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Some values are capped for scale; hover for actual counts.';
    }
  }

  // ── Chart 2: Success Rate by Company (vertical bar) ──────────────────────────

  function _renderSuccessRate(rows) {
    const id = 'chart-success-rate';
    _destroy(id);

    const noteEl = document.getElementById('chart-success-rate-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-success-rate-wrap'));
      return;
    }

    // Get top 15 companies by count within filtered rows
    const counts = {};
    for (const r of rows) {
      const c = (r.Company || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
    const topCompanies = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name]) => name);

    // Compute success rate per company from filtered rows
    const rates = topCompanies.map(company => {
      const missions  = rows.filter(r => r.Company === company);
      const successes = missions.filter(r => r.MissionStatus === 'Success').length;
      return missions.length > 0
        ? parseFloat((successes / missions.length * 100).toFixed(2))
        : 0;
    });

    const colors = rates.map(r =>
      r >= 80 ? 'rgba(6,214,160,0.75)' :
      r >= 50 ? 'rgba(255,209,102,0.75)' :
                'rgba(239,35,60,0.75)'
    );
    const borders = rates.map(r =>
      r >= 80 ? 'rgb(6,214,160)' :
      r >= 50 ? 'rgb(255,209,102)' :
                'rgb(239,35,60)'
    );

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topCompanies,
        datasets: [{
          label: 'Success Rate (%)',
          data: rates,
          backgroundColor: colors,
          borderColor:     borders,
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover(event, activeElements, chart) {
          if (activeElements.length === 0) {
            if (_highlightedLabel !== null) clearHighlight();
            return;
          }
          const label = chart.data.labels[activeElements[0].index];
          if (label !== _highlightedLabel) highlight(label);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: _font,
              maxRotation: 35,
              minRotation: 25
            },
            grid: { display: false }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              font: _font,
              callback: v => v + '%'
            },
            grid: { color: '#e2e8f0' }
          }
        }
      }
    });
  }

  // ── Chart 3: Mission Status Breakdown (doughnut) ─────────────────────────────

  function _renderMissionStatus(rows) {
    const id = 'chart-mission-status';
    _destroy(id);

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-mission-status-wrap'));
      return;
    }

    // Compute counts from filtered rows via Function 5 logic on filtered subset
    const counts = { 'Success': 0, 'Failure': 0, 'Partial Failure': 0, 'Prelaunch Failure': 0 };
    for (const r of rows) {
      const s = (r.MissionStatus || '').trim();
      if (Object.prototype.hasOwnProperty.call(counts, s)) counts[s]++;
    }

    const labels = Object.keys(counts);
    const data   = Object.values(counts);
    const colors = ['rgba(6,214,160,.8)', 'rgba(239,35,60,.8)', 'rgba(255,209,102,.8)', 'rgba(114,9,183,.8)'];
    const borders= ['rgb(6,214,160)',     'rgb(239,35,60)',     'rgb(255,209,102)',     'rgb(114,9,183)'];

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderColor: borders, borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: _font, padding: 16 } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? (ctx.parsed / total * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ── Chart 4: Launches per Year (line) ────────────────────────────────────────

  function _renderLaunchesPerYear(rows) {
    const id = 'chart-launches-year';
    _destroy(id);

    const noteEl = document.getElementById('chart-launches-year-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-launches-year-wrap'));
      return;
    }

    // Count missions per year from filtered rows
    const yearCounts = {};
    for (const r of rows) {
      const d = (r.Date || '').trim();
      if (!d) continue;
      const y = d.slice(0, 4);
      if (/^\d{4}$/.test(y)) yearCounts[y] = (yearCounts[y] || 0) + 1;
    }

    const years  = Object.keys(yearCounts).sort();
    const counts = years.map(y => yearCounts[y]);

    const { capped, capValue, hasOutliers } = _capOutliers(counts);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'Launches',
          data: capped,
          borderColor:     'rgba(67,97,238,1)',
          backgroundColor: 'rgba(67,97,238,0.12)',
          borderWidth: 2,
          pointRadius: years.length > 40 ? 2 : 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover(event, activeElements, chart) {
          if (activeElements.length === 0) {
            if (_highlightedYear !== null) clearYearHighlight();
            return;
          }
          const label = chart.data.labels[activeElements[0].index];
          if (label !== _highlightedYear) highlightYear(label);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const real = counts[ctx.dataIndex];
                const disp = capped[ctx.dataIndex];
                const suffix = real !== disp ? ` (actual: ${real})` : '';
                return ` ${real} launches${suffix}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { font: _font, maxRotation: 45, autoSkip: true, maxTicksLimit: 20 }, grid: { color: '#e2e8f0' } },
          y: {
            ticks: { font: _font },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          }
        }
      }
    });

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Some values are capped for scale; hover for actual counts.';
    }
  }

  // ── Chart 5: Cost Trends over Time (line) ────────────────────────────────────

  function _renderCostTrends(rows) {
    const id = 'chart-cost-trends';
    _destroy(id);

    const noteEl = document.getElementById('chart-cost-trends-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-cost-trends-wrap'));
      return;
    }

    // Average cost per year (skip rows with empty/invalid Price)
    const yearTotals = {};
    const yearCounts = {};
    for (const r of rows) {
      const price = parseFloat(r.Price);
      if (!isFinite(price) || price <= 0) continue;
      const y = (r.Date || '').slice(0, 4);
      if (!/^\d{4}$/.test(y)) continue;
      yearTotals[y] = (yearTotals[y] || 0) + price;
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }

    const years = Object.keys(yearTotals).sort();
    if (years.length === 0) {
      UI.showEmpty(document.getElementById('chart-cost-trends-wrap'),
        'No cost data available for the selected filters.');
      return;
    }

    const avgs = years.map(y => parseFloat((yearTotals[y] / yearCounts[y]).toFixed(2)));
    const { capped, capValue, hasOutliers } = _capOutliers(avgs);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'Avg Cost (M$)',
          data: capped,
          borderColor:     'rgba(247,37,133,1)',
          backgroundColor: 'rgba(247,37,133,0.1)',
          borderWidth: 2,
          pointRadius: years.length > 30 ? 2 : 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover(event, activeElements, chart) {
          if (activeElements.length === 0) {
            if (_highlightedYear !== null) clearYearHighlight();
            return;
          }
          const label = chart.data.labels[activeElements[0].index];
          if (label !== _highlightedYear) highlightYear(label);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const real = avgs[ctx.dataIndex];
                const disp = capped[ctx.dataIndex];
                const suffix = real !== disp ? ` (actual: $${real.toLocaleString()}M)` : '';
                return ` Avg $${real.toLocaleString()}M${suffix}`;
              },
              afterLabel(ctx) {
                const y = years[ctx.dataIndex];
                return `${yearCounts[y]} missions with cost data`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { font: _font, maxRotation: 45, autoSkip: true, maxTicksLimit: 20 }, grid: { color: '#e2e8f0' } },
          y: {
            ticks: { font: _font, callback: v => `$${v}M` },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          }
        }
      }
    });

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Some values are capped for scale; hover for actual averages.';
    }
  }

  // ── Chart 6: Launches by Location (horizontal bar) ───────────────────────────
  // Rationale: location names are long; horizontal bars avoid rotation and rank
  // sites naturally top-to-bottom. Top 10 keeps the chart readable.

  function _renderLaunchesByLocation(rows) {
    const id = 'chart-launches-location';
    _destroy(id);

    const noteEl = document.getElementById('chart-launches-location-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-launches-location-wrap'));
      return;
    }

    const counts = {};
    for (const r of rows) {
      const loc = (r.Location || '').trim();
      if (loc) counts[loc] = (counts[loc] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);

    const labels = sorted.map(([loc]) => {
      // Shorten to first two comma-separated parts for readability
      const parts = loc.split(',');
      return parts.length > 2 ? parts.slice(0, 2).join(',').trim() : loc;
    });
    const fullLabels = sorted.map(([loc]) => loc);
    const raw = sorted.map(([, n]) => n);
    const { capped, capValue, hasOutliers } = _capOutliers(raw);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Launches',
          data: capped,
          backgroundColor: 'rgba(114,9,183,0.7)',
          borderColor:     'rgba(114,9,183,1)',
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => fullLabels[ctx[0].dataIndex],
              label(ctx) {
                const real = raw[ctx.dataIndex];
                const disp = capped[ctx.dataIndex];
                const suffix = real !== disp ? ` (actual: ${real.toLocaleString()})` : '';
                return ` ${real.toLocaleString()} launches${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: _font },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          },
          y: { ticks: { font: _font }, grid: { display: false } }
        }
      }
    });

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Some values are capped for scale; hover for actual counts.';
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function init(rows) {
    _renderTopCompanies(rows);
    _renderSuccessRate(rows);
    _renderMissionStatus(rows);
    _renderLaunchesPerYear(rows);
    _renderCostTrends(rows);
    _renderLaunchesByLocation(rows);
  }

  function destroy() {
    Object.keys(_instances).forEach(_destroy);
  }

  return { init, destroy, highlight, clearHighlight, highlightYear, clearYearHighlight };
})();
