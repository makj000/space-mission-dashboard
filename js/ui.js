/**
 * ui.js — Summary stat cards, banners, and empty states.
 */
const UI = (() => {
  'use strict';

  // ── Summary stats ────────────────────────────────────────────────────────────

  function renderStats(rows) {
    const total = rows.length;

    const successCount = rows.filter(r => r.MissionStatus === 'Success').length;
    const successRate  = total > 0
      ? (successCount / total * 100).toFixed(1) + '%'
      : '—';

    const companies = new Set(rows.map(r => r.Company).filter(Boolean));

    let topCompany = '—';
    if (total > 0) {
      try {
        const top = getTopCompaniesByMissionCount(1);
        if (top.length > 0) {
          // top is from full dataset; find top within filtered rows
          const counts = {};
          for (const r of rows) {
            const c = (r.Company || '').trim();
            if (c) counts[c] = (counts[c] || 0) + 1;
          }
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) topCompany = `${sorted[0][0]} (${sorted[0][1]})`;
        }
      } catch (_) { /* data not loaded yet */ }
    }

    _setCard('stat-total',   total.toLocaleString(),  'missions');
    _setCard('stat-success', successRate,             `${successCount.toLocaleString()} successful`);
    _setCard('stat-companies', companies.size.toLocaleString(), 'companies');
    _setCard('stat-top',     topCompany,              'top company by launches');
  }

  function _setCard(id, value, sub) {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.stat-value').textContent = value;
    el.querySelector('.stat-sub').textContent   = sub;
  }

  // ── Banners ──────────────────────────────────────────────────────────────────

  function showBanner(msg, type = 'error') {
    const el = document.getElementById('app-banner');
    if (!el) return;
    el.textContent = msg;
    el.className   = `banner-${type}`;
  }

  function hideBanner() {
    const el = document.getElementById('app-banner');
    if (!el) return;
    el.className   = '';
    el.style.display = 'none';
  }

  // ── Empty states ─────────────────────────────────────────────────────────────

  function showEmpty(containerEl, msg = 'No data matches your criteria.') {
    containerEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔭</div>
        <h3>No results</h3>
        <p>${msg}</p>
      </div>`;
  }

  // ── Landing (no file loaded) ──────────────────────────────────────────────────

  function showLanding() {
    const dash    = document.getElementById('dashboard');
    const landing = document.getElementById('landing');
    if (dash)    dash.style.display    = 'none';
    if (landing) landing.style.display = 'flex';
  }

  function showDashboard() {
    const dash    = document.getElementById('dashboard');
    const landing = document.getElementById('landing');
    if (dash)    dash.style.display    = 'flex';
    if (landing) landing.style.display = 'none';
  }

  return { renderStats, showBanner, hideBanner, showEmpty, showLanding, showDashboard };
})();
