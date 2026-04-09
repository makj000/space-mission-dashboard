/**
 * table.js — Data table rendering, sorting, and pagination.
 */
const Table = (() => {
  'use strict';

  const PAGE_SIZES  = [25, 50, 100];
  const WARN_LIMIT  = 500;
  const COLS = [
    { key: 'Company',       label: 'Company' },
    { key: 'Location',      label: 'Location' },
    { key: 'Date',          label: 'Date' },
    { key: 'Time',          label: 'Time' },
    { key: 'Rocket',        label: 'Rocket' },
    { key: 'Mission',       label: 'Mission' },
    { key: 'RocketStatus',  label: 'Rocket Status' },
    { key: 'Price',         label: 'Price (M$)' },
    { key: 'MissionStatus', label: 'Mission Status' },
  ];

  let _rows      = [];
  let _sorted    = [];
  let _sortCol   = 'Date';
  let _sortDir   = 'asc';
  let _page      = 1;
  let _pageSize  = 50;
  let _showAll   = false;
  let _search    = '';

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function _badge(value, type) {
    const map = {
      'Success':           'badge-success',
      'Failure':           'badge-failure',
      'Partial Failure':   'badge-partial',
      'Prelaunch Failure': 'badge-prelaunch',
      'Active':            'badge-active',
      'Retired':           'badge-retired',
    };
    const cls = map[value] || '';
    return cls ? `<span class="badge ${cls}">${_esc(value)}</span>` : _esc(value || '—');
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _cellValue(row, key) {
    const v = row[key];
    if (key === 'MissionStatus') return _badge(v, 'mission');
    if (key === 'RocketStatus')  return _badge(v, 'rocket');
    if (key === 'Price')         return v ? `$${parseFloat(v).toLocaleString()}M` : '—';
    if (key === 'Location')      return `<span title="${_esc(v || '')}">${_esc((v || '').split(',')[0])}</span>`;
    return _esc(v || '—');
  }

  function _applySearch(rows) {
    if (!_search) return rows;
    const q = _search.toLowerCase();
    return rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }

  function _applySort(rows) {
    return [...rows].sort((a, b) => {
      const av = (a[_sortCol] || '').toString();
      const bv = (b[_sortCol] || '').toString();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return _sortDir === 'asc' ? cmp : -cmp;
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function render(rows) {
    _rows    = rows || [];
    _page    = 1;
    _showAll = false;
    _refresh();
  }

  function _refresh() {
    const container = document.getElementById('table-container');
    if (!container) return;

    const searched = _applySearch(_rows);
    _sorted = _applySort(searched);

    if (_sorted.length === 0) {
      UI.showEmpty(container, 'No missions match your current filters or search.');
      _renderPagination(0, 0);
      return;
    }

    const total = _sorted.length;
    let pageRows;

    if (_showAll) {
      pageRows = _sorted;
    } else {
      const start = (_page - 1) * _pageSize;
      pageRows = _sorted.slice(start, start + _pageSize);
    }

    // Build table
    const thead = COLS.map(col => {
      const isActive = _sortCol === col.key;
      const icon = isActive ? (_sortDir === 'asc' ? '↑' : '↓') : '↕';
      const cls  = isActive ? `sort-${_sortDir}` : '';
      return `<th class="${cls}" data-col="${col.key}">
        ${col.label} <span class="sort-icon">${icon}</span>
      </th>`;
    }).join('');

    const tbody = pageRows.map(row =>
      `<tr>${COLS.map(col => `<td>${_cellValue(row, col.key)}</td>`).join('')}</tr>`
    ).join('');

    container.innerHTML = `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;

    // Wire sort clicks
    container.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sortCol === col) {
          _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _sortCol = col;
          _sortDir = 'asc';
        }
        _page = 1;
        _refresh();
      });
    });

    _renderPagination(total, pageRows.length);
  }

  function _renderPagination(total, shown) {
    const el = document.getElementById('table-pagination');
    if (!el) return;

    if (total === 0) { el.innerHTML = ''; return; }

    const totalPages = Math.ceil(total / _pageSize);
    const start = _showAll ? 1 : (_page - 1) * _pageSize + 1;
    const end   = _showAll ? total : Math.min(_page * _pageSize, total);

    const warnHtml = _showAll && total > WARN_LIMIT
      ? `<span class="show-all-warn">⚠ Showing all ${total.toLocaleString()} rows may affect performance</span>`
      : '';

    const pageSizeOpts = PAGE_SIZES.map(s =>
      `<option value="${s}" ${s === _pageSize ? 'selected' : ''}>${s} / page</option>`
    ).join('');

    const pageButtons = _showAll ? '' : _buildPageButtons(totalPages);

    el.innerHTML = `
      <div class="pagination-info">
        Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}
        ${warnHtml}
      </div>
      <div class="pagination-controls">
        ${_showAll ? '' : `
          <select class="page-size-select" id="page-size-sel">${pageSizeOpts}</select>
          ${pageButtons}
        `}
        <button class="btn btn-secondary" id="btn-show-all" style="font-size:12px;padding:4px 10px">
          ${_showAll ? 'Paginate' : 'Show all'}
        </button>
      </div>`;

    el.querySelector('#btn-show-all')?.addEventListener('click', () => {
      _showAll = !_showAll;
      _page = 1;
      _refresh();
    });

    el.querySelector('#page-size-sel')?.addEventListener('change', e => {
      _pageSize = parseInt(e.target.value);
      _page = 1;
      _refresh();
    });

    el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        _page = parseInt(btn.dataset.page);
        _refresh();
      });
    });
  }

  function _buildPageButtons(totalPages) {
    if (totalPages <= 1) return '';
    const pages = [];
    // Always show first, last, current ±1
    const show = new Set([1, totalPages, _page, _page - 1, _page + 1].filter(p => p >= 1 && p <= totalPages));
    const sorted = [...show].sort((a, b) => a - b);

    let prev = null;
    for (const p of sorted) {
      if (prev !== null && p - prev > 1) pages.push('<span style="padding:0 4px;color:#718096">…</span>');
      const active = p === _page ? 'active' : '';
      pages.push(`<button class="page-btn ${active}" data-page="${p}">${p}</button>`);
      prev = p;
    }
    return `
      <button class="page-btn" data-page="${Math.max(1, _page - 1)}" ${_page === 1 ? 'disabled' : ''}>‹</button>
      ${pages.join('')}
      <button class="page-btn" data-page="${Math.min(totalPages, _page + 1)}" ${_page === totalPages ? 'disabled' : ''}>›</button>`;
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  function setSearch(query) {
    _search = (query || '').trim();
    _page   = 1;
    _refresh();
  }

  // ── Sort ─────────────────────────────────────────────────────────────────────

  function sort(col, dir) {
    _sortCol = col;
    _sortDir = dir;
    _page    = 1;
    _refresh();
  }

  function setPage(n) {
    _page = n;
    _refresh();
  }

  return { render, sort, setPage, setSearch };
})();
