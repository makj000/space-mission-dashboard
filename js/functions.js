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

  const needle = companyName.trim();
  const count  = DataStore.getData().filter(row => row.Company === needle).length;
  return count;
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

  const needle = companyName.trim();
  const missions = DataStore.getData().filter(row => row.Company === needle);

  if (missions.length === 0) return 0.0;

  const successes = missions.filter(row => row.MissionStatus === 'Success').length;
  const rate = (successes / missions.length) * 100;
  return parseFloat(rate.toFixed(5));
}

window.getSuccessRate = getSuccessRate;
