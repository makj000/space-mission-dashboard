/**
 * functions.js — Required analytical functions exposed on window for
 * programmatic testing. All functions read from DataStore.getData().
 *
 * Precision: floats use 5 significant decimal digits (e.g. 87.33333).
 *
 * Caching: results are memoised per data snapshot. The cache is automatically
 * invalidated whenever DataStore.getData() returns a new array reference
 * (i.e. after every file load or reload). Validation always runs before any
 * cache lookup, so invalid inputs still throw immediately.
 */
'use strict';

// ── Shared helpers ────────────────────────────────────────────────────────────

function _requireData() {
  if (!DataStore.isLoaded()) {
    throw new Error('No data loaded. Please load a CSV file first.');
  }
}

const _ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function _requireISODate(value, paramName, fnName) {
  _requireNonEmptyString(value, paramName, fnName);
  if (!_ISO_DATE_RE.test(value.trim())) {
    throw new Error(`${fnName}: "${paramName}" must be YYYY-MM-DD, got "${value}"`);
  }
}

function _requireNonEmptyString(value, paramName, fnName) {
  if (value === null || value === undefined) {
    throw new Error(`${fnName}: "${paramName}" is required but was ${value}`);
  }
  if (typeof value !== 'string') {
    throw new Error(
      `${fnName}: "${paramName}" must be a string, got ${typeof value}`
    );
  }
  if (value.trim() === '') {
    throw new Error(`${fnName}: "${paramName}" cannot be empty or whitespace`);
  }
}

function _requirePositiveInteger(value, paramName, fnName) {
  if (value === null || value === undefined) {
    throw new Error(`${fnName}: "${paramName}" is required`);
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fnName}: "${paramName}" must be a positive integer, got ${value}`);
  }
}

// ── Result cache ──────────────────────────────────────────────────────────────
// Keyed by a string composed of function id + arguments.
// Auto-clears whenever the underlying data array reference changes.

const _cache = (() => {
  let _ref   = null;  // last known DataStore.getData() reference
  let _store = {};    // key → cached value

  function _sync() {
    const rows = DataStore.getData();
    if (rows !== _ref) { _ref = rows; _store = {}; }
  }

  return {
    get(key)        { _sync(); return Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : undefined; },
    set(key, value) { _store[key] = value; return value; }
  };
})();

// ── Cached private helper ─────────────────────────────────────────────────────

function _getMissionsByCompany(companyName) {
  const needle = companyName.trim();
  const key    = `_c:${needle}`;
  const hit    = _cache.get(key);
  if (hit !== undefined) return hit;
  return _cache.set(key, DataStore.getData().filter(row => row.Company === needle));
}

// ── Function 1: getMissionCountByCompany ──────────────────────────────────────

/**
 * Returns the total number of missions for a given company.
 *
 * @param  {string} companyName  Exact company name (whitespace is trimmed).
 * @returns {number}             Non-negative integer.
 * @throws {Error}               If companyName is null, not a string, or blank.
 */
function getMissionCountByCompany(companyName) {
  _requireNonEmptyString(companyName, 'companyName', 'getMissionCountByCompany');
  _requireData();

  const key = `1:${companyName}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  return _cache.set(key, _getMissionsByCompany(companyName).length);
}

window.getMissionCountByCompany = getMissionCountByCompany;

// ── Function 2: getSuccessRate ────────────────────────────────────────────────

/**
 * Calculates the success rate for a given company as a percentage.
 * Only "Success" missions count as successful.
 *
 * @param  {string} companyName  Exact company name (whitespace is trimmed).
 * @returns {number}             Float 0–100 with 5 significant decimal digits,
 *                               or 0.0 if the company has no missions.
 * @throws {Error}               If companyName is null, not a string, or blank.
 */
function getSuccessRate(companyName) {
  _requireNonEmptyString(companyName, 'companyName', 'getSuccessRate');
  _requireData();

  const key = `2:${companyName}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const missions = _getMissionsByCompany(companyName);
  if (missions.length === 0) return _cache.set(key, 0.0);

  const successes = missions.filter(row => row.MissionStatus === 'Success').length;
  return _cache.set(key, parseFloat(((successes / missions.length) * 100).toFixed(5)));
}

window.getSuccessRate = getSuccessRate;

// ── Function 3: getMissionsByDateRange ────────────────────────────────────────

/**
 * Returns mission names launched between startDate and endDate (inclusive),
 * sorted chronologically.
 *
 * @param  {string} startDate  "YYYY-MM-DD"
 * @param  {string} endDate    "YYYY-MM-DD"
 * @returns {string[]}         Sorted list of mission names.
 * @throws {Error}             If either date is missing, not a string, blank,
 *                             or not in YYYY-MM-DD format, or if startDate > endDate.
 */
function getMissionsByDateRange(startDate, endDate) {
  _requireISODate(startDate, 'startDate', 'getMissionsByDateRange');
  _requireISODate(endDate,   'endDate',   'getMissionsByDateRange');
  if (startDate.trim() > endDate.trim()) {
    throw new Error(`getMissionsByDateRange: startDate (${startDate}) is after endDate (${endDate})`);
  }
  _requireData();

  const key = `3:${startDate}:${endDate}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const start = startDate.trim();
  const end   = endDate.trim();

  const result = DataStore.getData()
    .filter(row => { const d = (row.Date || '').trim(); return d >= start && d <= end; })
    .sort((a, b) => (a.Date || '').trim().localeCompare((b.Date || '').trim()))
    .map(row => row.Mission);

  return _cache.set(key, result);
}

window.getMissionsByDateRange = getMissionsByDateRange;

// ── Function 4: getTopCompaniesByMissionCount ─────────────────────────────────

/**
 * Returns the top N companies by total mission count.
 * Ties broken alphabetically by company name.
 *
 * @param  {number} n   Number of companies to return. Must be a positive integer.
 * @returns {Array}     Array of [companyName, missionCount] pairs, descending by count.
 * @throws {Error}      If n is not a positive integer.
 */
function getTopCompaniesByMissionCount(n) {
  _requirePositiveInteger(n, 'n', 'getTopCompaniesByMissionCount');
  _requireData();

  const key = `4:${n}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const counts = {};
  for (const row of DataStore.getData()) {
    const company = (row.Company || '').trim();
    if (company) counts[company] = (counts[company] || 0) + 1;
  }

  return _cache.set(key,
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
  );
}

window.getTopCompaniesByMissionCount = getTopCompaniesByMissionCount;

// ── Function 5: getMissionStatusCount ────────────────────────────────────────

/**
 * Returns the count of missions for each mission status.
 *
 * @returns {Object} Keys: "Success", "Failure", "Partial Failure", "Prelaunch Failure"
 */
function getMissionStatusCount() {
  _requireData();

  const key = '5';
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const result = { 'Success': 0, 'Failure': 0, 'Partial Failure': 0, 'Prelaunch Failure': 0 };
  for (const row of DataStore.getData()) {
    const status = (row.MissionStatus || '').trim();
    if (Object.prototype.hasOwnProperty.call(result, status)) result[status]++;
  }
  return _cache.set(key, result);
}

window.getMissionStatusCount = getMissionStatusCount;

// ── Function 6: getMissionsByYear ─────────────────────────────────────────────

/**
 * Returns the total number of missions launched in a specific year.
 *
 * @param  {number} year  Four-digit year (positive integer).
 * @returns {number}      Non-negative integer.
 * @throws {Error}        If year is not a positive integer.
 */
function getMissionsByYear(year) {
  _requirePositiveInteger(year, 'year', 'getMissionsByYear');
  _requireData();

  const key = `6:${year}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const needle = String(year);
  return _cache.set(key,
    DataStore.getData().filter(row => (row.Date || '').startsWith(needle + '-')).length
  );
}

window.getMissionsByYear = getMissionsByYear;

// ── Function 7: getMostUsedRocket ─────────────────────────────────────────────

/**
 * Returns the name of the rocket used the most times.
 * Ties broken alphabetically (first name ascending).
 *
 * @returns {string}  Rocket name, or empty string if no data.
 */
function getMostUsedRocket() {
  _requireData();

  const key = '7';
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  const counts = {};
  for (const row of DataStore.getData()) {
    const rocket = (row.Rocket || '').trim();
    if (rocket) counts[rocket] = (counts[rocket] || 0) + 1;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) return _cache.set(key, '');

  return _cache.set(key,
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  );
}

window.getMostUsedRocket = getMostUsedRocket;

// ── Function 8: getAverageMissionsPerYear ─────────────────────────────────────

/**
 * Calculates the average number of missions per year over a given range.
 * Each year's count is individually cached via getMissionsByYear.
 *
 * @param  {number} startYear  Start year (inclusive, positive integer).
 * @param  {number} endYear    End year (inclusive, positive integer).
 * @returns {number}           Float rounded to 5 decimal digits (e.g. 87.33333).
 * @throws {Error}             If either year is not a positive integer, or
 *                             startYear > endYear.
 */
function getAverageMissionsPerYear(startYear, endYear) {
  _requirePositiveInteger(startYear, 'startYear', 'getAverageMissionsPerYear');
  _requirePositiveInteger(endYear,   'endYear',   'getAverageMissionsPerYear');
  if (startYear > endYear) {
    throw new Error(
      `getAverageMissionsPerYear: startYear (${startYear}) must be ≤ endYear (${endYear})`
    );
  }
  _requireData();

  const key = `8:${startYear}:${endYear}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  let total = 0;
  for (let y = startYear; y <= endYear; y++) total += getMissionsByYear(y);

  return _cache.set(key, parseFloat((total / (endYear - startYear + 1)).toFixed(5)));
}

window.getAverageMissionsPerYear = getAverageMissionsPerYear;
