/**
 * functions.js — Required analytical functions exposed on window for
 * programmatic testing. All functions read from DataStore.getData().
 *
 * Precision: floats use 5 significant decimal digits (e.g. 87.33333).
 */
'use strict';

// ── shared helpers ────────────────────────────────────────────────────────────

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

function _getMissionsByCompany(companyName) {
  const needle = companyName.trim();
  return DataStore.getData().filter(row => row.Company === needle);
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

  return _getMissionsByCompany(companyName).length;
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

  const missions = _getMissionsByCompany(companyName);

  if (missions.length === 0) return 0.0;

  const successes = missions.filter(row => row.MissionStatus === 'Success').length;
  const rate = (successes / missions.length) * 100;
  return parseFloat(rate.toFixed(5));
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
  _requireData();
  if (startDate.trim() > endDate.trim()) {
    throw new Error(`getMissionsByDateRange: startDate (${startDate}) is after endDate (${endDate})`);
  }

  const start = startDate.trim();
  const end   = endDate.trim();

  return DataStore.getData()
    .filter(row => {
      const d = (row.Date || '').trim();
      return d >= start && d <= end;
    })
    .sort((a, b) => (a.Date || '').trim().localeCompare((b.Date || '').trim()))
    .map(row => row.Mission);
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

  const counts = {};
  for (const row of DataStore.getData()) {
    const company = (row.Company || '').trim();
    if (company) counts[company] = (counts[company] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}

window.getTopCompaniesByMissionCount = getTopCompaniesByMissionCount;
