/**
 * filters.js — Filter controls, event wiring, and reactive update orchestration.
 * Reads from DataStore and pushes filtered rows to UI, Charts, and Table.
 */
const Filters = (() => {
  'use strict';

  // ── Apply filters to raw rows ─────────────────────────────────────────────────

  function apply() {
    const rows = DataStore.getData();

    const dateStart     = document.getElementById('filter-date-start')?.value || '';
    const dateEnd       = document.getElementById('filter-date-end')?.value   || '';
    const company       = document.getElementById('filter-company')?.value    || '';
    const missionStatus = document.getElementById('filter-mission-status')?.value || '';
    const rocketStatus  = document.getElementById('filter-rocket-status')?.value  || '';

    const filtered = rows.filter(row => {
      const d = (row.Date || '').trim();
      if (dateStart && d < dateStart) return false;
      if (dateEnd   && d > dateEnd)   return false;
      if (company       && row.Company       !== company)       return false;
      if (missionStatus && row.MissionStatus !== missionStatus) return false;
      if (rocketStatus  && row.RocketStatus  !== rocketStatus)  return false;
      return true;
    });

    UI.renderStats(filtered);
    Charts.init(filtered);
    Table.render(filtered);

    return filtered;
  }

  // ── Populate dropdowns from loaded data ───────────────────────────────────────

  function _populateDropdowns() {
    const rows = DataStore.getData();

    _fillSelect('filter-company',
      [...new Set(rows.map(r => r.Company).filter(Boolean))].sort()
    );
    _fillSelect('filter-mission-status',
      [...new Set(rows.map(r => r.MissionStatus).filter(Boolean))].sort()
    );
    _fillSelect('filter-rocket-status',
      [...new Set(rows.map(r => r.RocketStatus).filter(Boolean))].sort()
    );
  }

  function _fillSelect(id, options) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">All</option>' +
      options.map(o => `<option value="${_esc(o)}">${_esc(o)}</option>`).join('');
    if (options.includes(current)) el.value = current;
  }

  function _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  let _eventsWired = false;

  function init() {
    _populateDropdowns();

    // Always reset date range to the full range of the newly loaded data
    const rows  = DataStore.getData();
    const dates = rows.map(r => (r.Date || '').trim()).filter(Boolean).sort();
    const startEl = document.getElementById('filter-date-start');
    const endEl   = document.getElementById('filter-date-end');
    if (dates.length > 0) {
      if (startEl) startEl.value = dates[0];
      if (endEl)   endEl.value   = dates[dates.length - 1];
    }

    // Reset dropdowns to "All" for a clean slate on every new file load
    ['filter-company', 'filter-mission-status', 'filter-rocket-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Wire events only once — they remain valid across file reloads
    if (!_eventsWired) {
      ['filter-date-start', 'filter-date-end',
       'filter-company', 'filter-mission-status', 'filter-rocket-status'
      ].forEach(id => {
        document.getElementById(id)?.addEventListener('change', apply);
      });

      document.getElementById('table-search')?.addEventListener('input', e => {
        Table.setSearch(e.target.value);
      });

      document.getElementById('btn-reset-filters')?.addEventListener('click', reset);
      _eventsWired = true;
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  function reset() {
    ['filter-company', 'filter-mission-status', 'filter-rocket-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Re-set date range to full data range
    const rows  = DataStore.getData();
    const dates = rows.map(r => (r.Date || '').trim()).filter(Boolean).sort();
    if (dates.length > 0) {
      const startEl = document.getElementById('filter-date-start');
      const endEl   = document.getElementById('filter-date-end');
      if (startEl) startEl.value = dates[0];
      if (endEl)   endEl.value   = dates[dates.length - 1];
    }

    const searchEl = document.getElementById('table-search');
    if (searchEl) searchEl.value = '';
    Table.setSearch('');

    apply();
  }

  return { init, apply, reset };
})();
