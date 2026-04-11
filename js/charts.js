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

  // ── Shared colour palette ────────────────────────────────────────────────────
  // Each chart group shares a colour so related charts are visually linked.
  //   company  → blue  (#4361ee) : top-companies, success-rate (base/highlight)
  //   time     → pink  (#f72585) : launches-year, cost-trends
  //   location → purple(#7209b7) : launches-location
  const _COLOR = {
    company:  { bg: 'rgba(67,97,238,0.75)',   border: 'rgba(67,97,238,1)',   fill: 'rgba(67,97,238,0.12)'  },
    time:     { bg: 'rgba(247,37,133,0.70)',   border: 'rgba(247,37,133,1)',  fill: 'rgba(247,37,133,0.10)' },
    location: { bg: 'rgba(114,9,183,0.70)',    border: 'rgba(114,9,183,1)',   fill: 'rgba(114,9,183,0.12)'  },
  };

  const _instances = {};        // keyed by canvas id
  const _originalBgColors = {}; // saved bg colors per chart before highlight
  let _highlightedLabel = null; // currently highlighted entity label
  let _hlBusy = false;          // re-entrancy guard for highlight updates

  // Charts that show company-level data and participate in cross-highlight
  const _COMPANY_CHARTS = ['chart-top-companies', 'chart-success-rate'];

  // Charts that show year-level data and participate in year cross-highlight
  const _YEAR_CHARTS = ['chart-launches-year', 'chart-cost-trends', 'chart-success-year'];
  let _highlightedYear = null;
  let _yearHlBusy = false;

  // ── Outlier capping ──────────────────────────────────────────────────────────

  /**
   * Given an array of numbers, returns { capped, capValue, hasOutliers }.
   * Values above Q3 + 3×IQR are capped at capValue.
   */
  function _capOutliers(values) {
    if (values.length < 2) return { capped: [...values], capValue: null, hasOutliers: false };

    const sorted = [...values].sort((a, b) => a - b);
    const max    = sorted[sorted.length - 1];

    // Method 1 — IQR fence (statistically robust for larger datasets).
    // Q3 + 3×IQR is the standard "far outlier" boundary.
    let outlierFence = null;
    if (sorted.length >= 4) {
      const q1    = sorted[Math.floor(sorted.length * 0.25)];
      const q3    = sorted[Math.floor(sorted.length * 0.75)];
      const fence = q3 + 3 * (q3 - q1);
      if (max > fence) outlierFence = fence;
    }

    // Method 2 — Ratio fallback: if max > 5× median, it's an outlier.
    // This catches cases where a small dataset causes Q3 to absorb the outlier
    // value, pushing the IQR fence above the outlier and missing it entirely.
    // Uses the second-largest value as the fence so only the maximum is capped.
    if (outlierFence === null) {
      const median = sorted[Math.floor((sorted.length - 1) / 2)];
      if (median > 0 && max > 5 * median) {
        outlierFence = sorted[sorted.length - 2]; // everything below the outlier
      }
    }

    if (outlierFence === null) return { capped: [...values], capValue: null, hasOutliers: false };

    // Cap at 30% above the highest normal value so the axis stays tight
    // around the real data range while the outlier bar is visually distinct.
    const maxNormal = sorted.filter(v => v <= outlierFence).pop() ?? sorted[sorted.length - 2];
    const capValue  = maxNormal * 1.3;
    const capped    = values.map(v => (v > outlierFence ? capValue : v));
    return { capped, capValue, hasOutliers: true };
  }

  // ── Stripe pattern for capped bars ──────────────────────────────────────────

  /**
   * Returns a repeating 45° diagonal-stripe CanvasPattern built from the
   * chart's border colour.  Cached per colour so each render call is cheap.
   * A capped bar gets this pattern instead of the solid fill, making it
   * immediately obvious the bar is not drawn to its true scale.
   */
  const _stripeCache = {};
  function _stripePattern(borderColor) {
    if (_stripeCache[borderColor]) return _stripeCache[borderColor];
    const SIZE = 10;
    const c    = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const ctx  = c.getContext('2d');
    // Faint base fill keeps the bar in the chart's colour family
    ctx.fillStyle = borderColor.replace(/[\d.]+\)$/, '0.18)');
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Single diagonal line – tiles seamlessly at 45° in 'repeat' mode
    ctx.strokeStyle = borderColor.replace(/[\d.]+\)$/, '0.72)');
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, SIZE); ctx.lineTo(SIZE, 0);
    ctx.stroke();
    _stripeCache[borderColor] = ctx.createPattern(c, 'repeat');
    return _stripeCache[borderColor];
  }

  /**
   * Build a per-bar backgroundColor array where bars whose raw value was
   * capped (raw[i] !== capped[i]) receive a stripe pattern.
   */
  function _bgColors(raw, capped, solidColor, borderColor) {
    return raw.map((v, i) =>
      v !== capped[i] ? _stripePattern(borderColor) : solidColor
    );
  }

  // ── Shared chart defaults ────────────────────────────────────────────────────

  function _destroy(id) {
    if (_instances[id]) {
      _instances[id].destroy();
      delete _instances[id];
    }
    delete _originalBgColors[id];
    // Restore the canvas (showEmpty hides it) and remove any empty-state overlay
    // so the next render finds a visible canvas ready for a new Chart instance.
    const canvas = document.getElementById(id);
    if (canvas) {
      canvas.style.display = '';
      const emptyEl = canvas.parentElement?.querySelector('.empty-state');
      if (emptyEl) emptyEl.remove();
    }
  }

  // ── Cross-chart highlight ────────────────────────────────────────────────────

  function _dimColor(c) {
    // CanvasPattern (stripe) — collapse to a barely-visible fill when dimmed
    if (typeof c !== 'string') return 'rgba(160,160,160,0.10)';
    return c.replace(/rgba?\(([^,]+),([^,]+),([^,]+)(?:,[^)]+)?\)/,
      (_, r, g, b) => `rgba(${r},${g},${b},0.12)`);
  }

  function _fullColor(c) {
    // CanvasPattern (stripe) — return it unchanged; the stripe IS the full style
    if (typeof c !== 'string') return c;
    return c.replace(/rgba?\(([^,]+),([^,]+),([^,]+)(?:,[^)]+)?\)/,
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

  // ── Year cross-highlight (bar charts — same dim/brighten as company charts) ───

  // Public: highlight a year in both year charts
  function highlightYear(yearLabel) {
    if (!yearLabel || _yearHlBusy) return;
    _yearHlBusy = true;
    _highlightedYear = yearLabel;
    _YEAR_CHARTS.forEach(id => _applyHighlightToChart(id, yearLabel));
    _yearHlBusy = false;
  }

  // Public: clear year highlights
  function clearYearHighlight() {
    if (_yearHlBusy) return;
    _yearHlBusy = true;
    _highlightedYear = null;
    _YEAR_CHARTS.forEach(id => _removeHighlightFromChart(id));
    _yearHlBusy = false;
  }

  // ── Double-click to filter ───────────────────────────────────────────────────

  /**
   * Attaches a dblclick listener to the chart canvas that calls
   * Filters.applyFilter(type, label) for the element the user double-clicks.
   * Safe to call on every render — removes any previously attached handler first.
   *
   * @param {string}   id             Canvas element id
   * @param {string}   type           Filter type: 'company', 'year', 'missionStatus', 'location'
   * @param {string[]} [labelsOverride] Full-value labels when chart displays shortened text
   *                                    (e.g. location chart truncates long names)
   */
  function _addDblClickFilter(id, type, labelsOverride) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (canvas._dblClickHandler) {
      canvas.removeEventListener('dblclick', canvas._dblClickHandler);
    }
    canvas._dblClickHandler = e => {
      const chart = _instances[id];
      if (!chart) return;
      const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
      if (!points.length) return;
      const idx   = points[0].index;
      const label = labelsOverride ? labelsOverride[idx] : chart.data.labels[idx];
      if (typeof Filters !== 'undefined') Filters.applyFilter(type, label);
    };
    canvas.addEventListener('dblclick', canvas._dblClickHandler);
  }

  const _font = { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };

  /**
   * Returns an x-axis scale config for year-based charts.
   * Uses a custom tick callback that always shows the first and last label
   * (ensuring the most recent year is always visible) while skipping
   * intermediate labels when there are too many to fit.
   * @param {number} maxVisible  Max number of ticks to show (default 20)
   */
  function _yearXAxis(maxVisible) {
    const max = maxVisible || 20;
    return {
      ticks: {
        font: _font,
        maxRotation: 45,
        autoSkip: false,
        callback: function(value, index) {
          const labels = this.chart.data.labels;
          const total  = labels.length;
          if (total <= max) return labels[index];          // show all if few
          const step = Math.ceil(total / max);
          // Always show first and last; show every step-th in between
          if (index === 0 || index === total - 1 || index % step === 0) {
            return labels[index];
          }
          return null;
        }
      },
      grid: { color: '#e2e8f0' }
    };
  }

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
    const colors = _bgColors(raw, capped, _COLOR.company.bg, _COLOR.company.border);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Missions',
          data: capped,
          backgroundColor: colors,
          borderColor:     _COLOR.company.border,
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

    _addDblClickFilter(id, 'company');

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Striped bar is scaled down — actual value shown in tooltip.';
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
      const prec = (typeof Filters !== 'undefined') ? Filters.getPrecision() : 2;
      return missions.length > 0
        ? parseFloat((successes / missions.length * 100).toFixed(prec))
        : 0;
    });

    const colors  = rates.map(() => _COLOR.company.bg);
    const borders = rates.map(() => _COLOR.company.border);

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
              label: ctx => ` ${ctx.parsed.y.toFixed((typeof Filters !== 'undefined') ? Filters.getPrecision() : 2)}%`
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

    _addDblClickFilter(id, 'company');
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

    _addDblClickFilter(id, 'missionStatus');
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
    const colors = _bgColors(counts, capped, _COLOR.time.bg, _COLOR.time.border);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Launches',
          data: capped,
          backgroundColor: colors,
          borderColor:     _COLOR.time.border,
          borderWidth: 1,
          borderRadius: 3
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
          x: _yearXAxis(),
          y: {
            ticks: { font: _font },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          }
        }
      }
    });

    _addDblClickFilter(id, 'year');

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Striped bar is scaled down — actual value shown in tooltip.';
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

    const _prec = (typeof Filters !== 'undefined') ? Filters.getPrecision() : 2;
    const avgs = years.map(y => parseFloat((yearTotals[y] / yearCounts[y]).toFixed(_prec)));
    const { capped, capValue, hasOutliers } = _capOutliers(avgs);
    const colors = _bgColors(avgs, capped, _COLOR.time.bg, _COLOR.time.border);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Avg Cost (M$)',
          data: capped,
          backgroundColor: colors,
          borderColor:     _COLOR.time.border,
          borderWidth: 1,
          borderRadius: 3
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
          x: _yearXAxis(),
          y: {
            ticks: { font: _font, callback: v => `$${parseFloat(v.toFixed(2))}M` },
            grid:  { color: '#e2e8f0' },
            ...(capValue ? { max: capValue * 1.05 } : {})
          }
        }
      }
    });

    _addDblClickFilter(id, 'year');

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Striped bar is scaled down — actual value shown in tooltip.';
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
    const colors = _bgColors(raw, capped, _COLOR.location.bg, _COLOR.location.border);

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Launches',
          data: capped,
          backgroundColor: colors,
          borderColor:     _COLOR.location.border,
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

    _addDblClickFilter(id, 'location', fullLabels);

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Striped bar is scaled down — actual value shown in tooltip.';
    }
  }

  // ── Chart 7: Success Rate per Year (line) ────────────────────────────────────
  // Rationale: a line chart shows the trend in reliability over time more
  // clearly than bars. A fixed 0–100 % Y-axis gives immediate intuition about
  // how good (or bad) any given year was relative to perfection.

  function _renderSuccessPerYear(rows) {
    const id = 'chart-success-year';
    _destroy(id);

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-success-year-wrap'));
      return;
    }

    // Tally success / total per year
    const yearData = {};
    for (const r of rows) {
      const d = (r.Date || '').trim();
      if (!d) continue;
      const y = d.slice(0, 4);
      if (!/^\d{4}$/.test(y)) continue;
      if (!yearData[y]) yearData[y] = { success: 0, total: 0 };
      yearData[y].total++;
      if (r.MissionStatus === 'Success') yearData[y].success++;
    }

    const years = Object.keys(yearData).sort();
    if (years.length === 0) {
      UI.showEmpty(document.getElementById('chart-success-year-wrap'),
        'No year data available for the selected filters.');
      return;
    }

    const prec  = (typeof Filters !== 'undefined') ? Filters.getPrecision() : 5;
    const rates = years.map(y =>
      parseFloat((yearData[y].success / yearData[y].total * 100).toFixed(prec))
    );

    const ctx = document.getElementById(id);
    if (!ctx) return;

    _instances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Success Rate (%)',
          data: rates,
          backgroundColor: _COLOR.time.bg,
          borderColor:     _COLOR.time.border,
          borderWidth: 1,
          borderRadius: 3
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
                const y = years[ctx.dataIndex];
                const d = yearData[y];
                const r = rates[ctx.dataIndex];
                return ` ${r.toFixed(prec)}%  (${d.success}/${d.total} missions)`;
              }
            }
          }
        },
        scales: {
          x: _yearXAxis(),
          y: {
            min: 0,
            max: 100,
            ticks: {
              font: _font,
              callback: v => `${parseFloat(v.toFixed(2))}%`
            },
            grid: { color: '#e2e8f0' }
          }
        }
      }
    });

    _addDblClickFilter(id, 'year');
  }

  // ── Dynamic Chart Builder ────────────────────────────────────────────────
  //
  // Renders a single configurable chart from any combination of:
  //   groupBy  : year | company | location | rocket | rocketStatus | missionStatus
  //   metric   : count | successRate | failureCount | avgCost | totalCost
  //   chartType: bar | barH | line | pie
  //   topN     : integer (only applied for non-temporal groupings)

  function _renderDynamic(rows, config) {
    const id = 'chart-dynamic';
    _destroy(id);

    const noteEl = document.getElementById('chart-dynamic-note');
    if (noteEl) noteEl.textContent = '';

    if (!rows || rows.length === 0) {
      UI.showEmpty(document.getElementById('chart-dynamic-wrap'));
      return;
    }

    const { groupBy = 'year', metric = 'count', chartType = 'bar', topN = 15 } = config || {};
    const prec = (typeof Filters !== 'undefined') ? Filters.getPrecision() : 2;

    // ── aggregate ────────────────────────────────────────────────────────────
    const groups = {};
    for (const r of rows) {
      let key = null;
      if      (groupBy === 'year')          { const d = (r.Date||'').trim(); if (d) { const y = d.slice(0,4); if (/^\d{4}$/.test(y)) key = y; } }
      else if (groupBy === 'company')       { key = (r.Company      ||'').trim() || null; }
      else if (groupBy === 'location')      { key = (r.Location     ||'').trim() || null; }
      else if (groupBy === 'rocket')        { key = (r.Rocket       ||'').trim() || null; }
      else if (groupBy === 'rocketStatus')  { key = (r.RocketStatus ||'').trim() || null; }
      else if (groupBy === 'missionStatus') { key = (r.MissionStatus||'').trim() || null; }
      if (!key) continue;
      if (!groups[key]) groups[key] = { count:0, success:0, failure:0, costSum:0, costCount:0 };
      groups[key].count++;
      if ((r.MissionStatus||'').trim() === 'Success') groups[key].success++;
      else groups[key].failure++;
      const p = parseFloat(r.Price);
      if (isFinite(p) && p > 0) { groups[key].costSum += p; groups[key].costCount++; }
    }

    if (Object.keys(groups).length === 0) {
      UI.showEmpty(document.getElementById('chart-dynamic-wrap'), 'No data for the selected grouping.');
      return;
    }

    // ── compute metric value per group ───────────────────────────────────────
    function _val(g) {
      switch (metric) {
        case 'count':       return g.count;
        case 'successRate': return g.count > 0 ? parseFloat((g.success / g.count * 100).toFixed(prec)) : 0;
        case 'failureCount':return g.failure;
        case 'avgCost':     return g.costCount > 0 ? parseFloat((g.costSum / g.costCount).toFixed(prec)) : null;
        case 'totalCost':   return g.costCount > 0 ? parseFloat(g.costSum.toFixed(prec)) : null;
        default:            return g.count;
      }
    }

    // ── sort / slice ─────────────────────────────────────────────────────────
    const isTemporal = (groupBy === 'year');
    let entries = Object.entries(groups)
      .map(([k, g]) => ({ key: k, value: _val(g), group: g }))
      .filter(e => e.value !== null);

    if (isTemporal) {
      entries.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      entries.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
      const n = Math.max(1, parseInt(topN) || 15);
      entries = entries.slice(0, n);
    }

    if (entries.length === 0) {
      UI.showEmpty(document.getElementById('chart-dynamic-wrap'), 'No data for the selected metric.');
      return;
    }

    // ── labels ───────────────────────────────────────────────────────────────
    const fullLabels = entries.map(e => e.key);
    const labels = fullLabels.map(k => {
      if (groupBy === 'location') {
        const parts = k.split(',');
        return parts.length > 2 ? parts.slice(0, 2).join(',').trim() : k;
      }
      return k;
    });
    const rawValues = entries.map(e => e.value);

    // ── color ────────────────────────────────────────────────────────────────
    const colorKey = groupBy === 'year' ? 'time' : groupBy === 'location' ? 'location' : 'company';
    const color = _COLOR[colorKey];

    // ── outlier capping ──────────────────────────────────────────────────────
    let displayValues = rawValues;
    let capValue = null;
    let hasOutliers = false;
    if (chartType !== 'pie' && metric !== 'successRate') {
      const capped = _capOutliers(rawValues);
      displayValues = capped.capped;
      capValue      = capped.capValue;
      hasOutliers   = capped.hasOutliers;
    }

    // ── background colors ────────────────────────────────────────────────────
    const PIE_COLORS = [
      'rgba(67,97,238,.8)',  'rgba(247,37,133,.8)', 'rgba(114,9,183,.8)',
      'rgba(6,214,160,.8)',  'rgba(255,209,102,.8)','rgba(239,35,60,.8)',
      'rgba(76,201,240,.8)', 'rgba(3,4,94,.8)',     'rgba(255,128,0,.8)',
      'rgba(0,180,100,.8)'
    ];
    const bgColors = chartType === 'pie'
      ? entries.map((_, i) => PIE_COLORS[i % PIE_COLORS.length])
      : _bgColors(rawValues, displayValues, color.bg, color.border);

    // ── value formatter ──────────────────────────────────────────────────────
    const _fmt = v =>
      metric === 'successRate'                         ? `${v}%`
      : (metric === 'avgCost' || metric === 'totalCost') ? `$${v.toLocaleString()}M`
      : v.toLocaleString();

    const _yTickFmt = v =>
      metric === 'successRate'                         ? `${v}%`
      : (metric === 'avgCost' || metric === 'totalCost') ? `$${v}M`
      : v;

    const ctx = document.getElementById(id);
    if (!ctx) return;

    // ── render ───────────────────────────────────────────────────────────────
    if (chartType === 'pie') {
      _instances[id] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: displayValues, backgroundColor: bgColors, borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: _font, padding: 12 } },
            tooltip: { callbacks: {
              title:  ctx => [fullLabels[ctx[0].dataIndex]],
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? (ctx.parsed / total * 100).toFixed(1) : 0;
                return ` ${_fmt(rawValues[ctx.dataIndex])} (${pct}%)`;
              }
            }}
          }
        }
      });
    } else {
      const isLine  = chartType === 'line';
      const isHoriz = chartType === 'barH';
      const isSuccessRate = metric === 'successRate';

      _instances[id] = new Chart(ctx, {
        type: isLine ? 'line' : 'bar',
        data: {
          labels,
          datasets: [{
            label: ({count:'Mission Count',successRate:'Success Rate (%)',failureCount:'Failure Count',avgCost:'Avg Cost (M$)',totalCost:'Total Cost (M$)'})[metric],
            data:            displayValues,
            backgroundColor: isLine ? color.fill : bgColors,
            borderColor:     color.border,
            borderWidth:     isLine ? 2 : 1,
            borderRadius:    isLine ? 0 : 3,
            fill:            isLine,
            tension:         isLine ? 0.3 : 0,
            pointRadius:     isLine ? (entries.length > 60 ? 0 : 3) : 0,
            pointHoverRadius:isLine ? 5 : 0
          }]
        },
        options: {
          indexAxis: isHoriz ? 'y' : 'x',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: {
              title: ctx => [fullLabels[ctx[0].dataIndex]],
              label(ctx) {
                const real = rawValues[ctx.dataIndex];
                const disp = displayValues[ctx.dataIndex];
                const suffix = real !== disp ? ` (actual: ${_fmt(real)})` : '';
                return ` ${_fmt(real)}${suffix}`;
              },
              afterLabel: isSuccessRate
                ? ctx => { const g = entries[ctx.dataIndex].group; return `${g.success} / ${g.count} missions`; }
                : undefined
            }}
          },
          scales: {
            // For horizontal bars (indexAxis:'y'), the VALUE axis is X and the CATEGORY axis is Y.
            // For vertical bars / line (indexAxis:'x'), the VALUE axis is Y and CATEGORY is X.
            x: {
              ticks: {
                font: _font,
                maxRotation: isHoriz ? 0 : 45,
                autoSkip: true,
                maxTicksLimit: isTemporal ? 20 : 15,
                ...(isHoriz ? { callback: _yTickFmt } : {})
              },
              grid: { color: '#e2e8f0' },
              ...(isSuccessRate &&  isHoriz ? { min: 0, max: 100 } : {}),
              ...(capValue       &&  isHoriz ? { max: capValue * 1.05 } : {})
            },
            y: {
              ticks: {
                font: _font,
                ...(!isHoriz ? { callback: _yTickFmt } : {})
              },
              grid:  { color: isHoriz ? 'transparent' : '#e2e8f0' },
              ...(isSuccessRate && !isHoriz ? { min: 0, max: 100 } : {}),
              ...(capValue      && !isHoriz ? { max: capValue * 1.05 } : {})
            }
          }
        }
      });
    }

    if (hasOutliers && noteEl) {
      noteEl.textContent = '* Striped bar is scaled down — actual value shown in tooltip.';
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
    _renderSuccessPerYear(rows);
  }

  /**
   * Renders charts one at a time, yielding a animation frame between each so
   * the browser can paint incremental progress. Used by the boot loader to
   * drive the 50–100% segment of the progress bar.
   *
   * @param {Object[]} rows      Filtered rows to render.
   * @param {Function} onStep    Called as onStep(doneCount, totalCount) after
   *                             each chart is rendered and before the next frame.
   */
  async function initProgressive(rows, onStep) {
    const renders = [
      () => _renderTopCompanies(rows),
      () => _renderSuccessRate(rows),
      () => _renderMissionStatus(rows),
      () => _renderLaunchesPerYear(rows),
      () => _renderCostTrends(rows),
      () => _renderLaunchesByLocation(rows),
      () => _renderSuccessPerYear(rows),
    ];
    for (let i = 0; i < renders.length; i++) {
      renders[i]();
      if (onStep) onStep(i + 1, renders.length);
      // Yield a frame so the browser paints the updated progress bar,
      // then hold briefly so the user can perceive the step before the
      // next chart render blocks the main thread again.
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 80));
    }
  }

  function destroy() {
    Object.keys(_instances).forEach(_destroy);
  }

  function renderDynamic(rows, config) { _renderDynamic(rows, config); }

  return { init, initProgressive, destroy, highlight, clearHighlight, highlightYear, clearYearHighlight, renderDynamic };
})();
