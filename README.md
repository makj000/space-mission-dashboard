# Space Missions Dashboard

An interactive, fully offline browser dashboard for exploring and analysing historical space mission data from 1957 onwards.

**Version:** 1.7.0 · No internet required · No build step

---

## Overview

Load a CSV of space mission records and instantly get seven interactive charts, six filter controls, six summary stat cards, a searchable/sortable data table, and eight analytical functions — all running locally in your browser.

---

## Quick Start

1. Clone or download this repository.
2. Open `index.html` in any modern browser (Chrome, Safari, Firefox, or Edge).
3. Click **Load CSV** and select `data/space_missions.csv` (or any compatible CSV).
4. Explore — filter, click charts, export data.

> **Safari note:** Open `index.html` directly; do not open files from inside subdirectories, as Safari restricts `file://` parent-directory access.

---

## Dataset

The dashboard expects a CSV with these columns:

| Column | Description |
|---|---|
| `Company` | Organisation that conducted the mission |
| `Location` | Launch site |
| `Date` | Launch date (`YYYY-MM-DD`) |
| `Time` | Launch time (`HH:MM:SS`) |
| `Rocket` | Rocket model |
| `Mission` | Mission name |
| `RocketStatus` | `Active` or `Retired` |
| `Price` | Mission cost in M$ (may be empty) |
| `MissionStatus` | `Success`, `Failure`, `Partial Failure`, or `Prelaunch Failure` |

A sample dataset is included at `data/space_missions.csv`.

---

## Features

### Charts

Seven Chart.js visualisations render automatically when data is loaded. All charts update reactively when filters change.

| Chart | Type | What it shows |
|---|---|---|
| Top 15 Companies by Mission Count | Horizontal bar | Ranked launch totals per company |
| Success Rate by Company | Vertical bar | % successful missions, top 15 companies |
| Launches per Year | Bar | Annual launch volume |
| Success Rate per Year | Bar | % successful missions per year (fixed 0–100% axis) |
| Average Mission Cost per Year | Bar | Mean cost (M$) of missions with price data |
| Mission Status Breakdown | Doughnut | Part-to-whole view of all four outcome types |
| Top 10 Launch Locations | Horizontal bar | Busiest launch sites by mission count |

**Cross-highlighting:** Hovering a bar in any company chart dims non-matching bars in the other company chart. The same behaviour links all three year-based charts.

**Double-click to filter:** Double-clicking any bar or doughnut segment instantly applies that value as a filter.

**Outlier capping:** Bars that are statistical outliers are visually capped and rendered with a diagonal stripe. The tooltip always shows the actual value.

### Filters

| Control | Description |
|---|---|
| From / To | Date range (inclusive) |
| Company | Filter to one company |
| Mission | Filter by mission status |
| Rocket | Filter by rocket status |
| Location | Filter by launch site |
| Precision | Decimal places for float output (non-negative integer, default 5) |
| Reset | Clears all filters |
| Export CSV | Downloads filtered rows as a timestamped CSV file |

### Summary Cards

Total missions · Overall success rate · Number of companies · Top company by launches · Most-used rocket · Average missions per year

### Data Table

Searchable, sortable, and paginated (50 rows per page by default). A "Show All" option is available with a warning for large datasets.

### Loading

A progress bar tracks CSV parsing (0–50%) and chart rendering (50–100%). Charts are rendered one at a time with brief pauses so the browser stays responsive. File info (name, size, row count) appears after all rendering completes.

---

## Analytical Functions

Eight functions are exposed on `window` for programmatic use and automated testing:

```js
getMissionCountByCompany(companyName)
// → integer: total missions for the given company

getSuccessRate(companyName)
// → float: success rate 0–100, or 0.0 if no missions

getMissionsByDateRange(startDate, endDate)
// → string[]: mission names between dates (YYYY-MM-DD, inclusive), chronological order

getTopCompaniesByMissionCount(n)
// → [string, number][]: top N companies by launch count, ties broken alphabetically

getMissionStatusCount()
// → { "Success": n, "Failure": n, "Partial Failure": n, "Prelaunch Failure": n }

getMissionsByYear(year)
// → integer: total missions launched in that year

getMostUsedRocket()
// → string: most-used rocket name, ties broken alphabetically

getAverageMissionsPerYear(startYear, endYear)
// → float: average missions per year over the range (inclusive)
```

All functions validate their inputs and return safe defaults (`0`, `0.0`, `[]`, `""`) for missing or invalid data. Results are memoized and the cache is cleared on every file load.

---

## Running Tests

Open `tests.html` in any browser (no server required).

- **Sample tests** run against a built-in 10-row dataset automatically.
- **Full-dataset tests** (prefixed `full_`) activate when you load `data/space_missions.csv` via the **Load different CSV** button inside the test runner.
- Screenshots of failing tests are saved to `test_screenshots/` (named `test_<function>_<case>_<timestamp>.png`).

> `test_screenshots/` is listed in `.gitignore` and is never committed.

---

## Project Structure

```
├── index.html              Shell layout: nav, filter bar, stat cards, charts, table
├── tests.html              Standalone test runner
├── css/
│   └── styles.css          All custom styles and responsive breakpoints
├── js/
│   ├── version.js          APP_VERSION constant (X.Y.Z)
│   ├── data.js             CSV loading, parsing, validation, in-memory data store
│   ├── functions.js        8 analytical functions exposed on window
│   ├── charts.js           7 Chart.js visualisations, outlier logic, cross-highlighting
│   ├── table.js            Data table: rendering, sorting, pagination, search
│   ├── filters.js          Filter controls, event wiring, reactive orchestration
│   ├── ui.js               Summary stat cards, error banners, empty states
│   └── tests.js            Test logic and screenshot capture
├── libs/
│   ├── papaparse.min.js    CSV parsing (vendored, offline-safe)
│   ├── chart.umd.min.js    Chart.js 4.4.3 (vendored, offline-safe)
│   └── html2canvas.min.js  Viewport screenshots for test failures (vendored, offline-safe)
└── data/
    └── space_missions.csv  Sample dataset
```

---

## Versioning

The version is stored in `js/version.js` as `const APP_VERSION = 'X.Y.Z'` and shown in the nav bar.

| Segment | When it changes |
|---|---|
| **Patch** (Z) | Automatically after each coding session that edits `js/` or `css/` files |
| **Minor** (Y) | Automatically on `git push` via the pre-push hook; patch resets to 0 |
| **Major** (X) | Manually — edit `js/version.js` directly |

Click the version badge in the nav bar to force a full source reload (cache-bust).

---

## Technology Stack

| Library | Version | Purpose |
|---|---|---|
| Chart.js | 4.4.3 | All chart rendering |
| PapaParse | latest | CSV parsing (streaming) |
| html2canvas | latest | Test failure screenshots |

All libraries are vendored in `libs/` — no CDN calls, no internet required.

---

## Edge Cases Handled

- **File > 100 MB** — rejected with a user-friendly error banner
- **Missing or unexpected columns** — error surfaced in banner; dashboard does not crash
- **Corrupted CSV** — PapaParse warnings are surfaced in the banner
- **Empty filter result** — charts and table show "No data matches your criteria" instead of blank
- **Outlier values** — visually capped in charts; actual value always available in tooltip
- **Library load failure** — `onerror` handlers on script tags show a warning banner
- **Pagination overflow** — "Show All" available with a warning for datasets > 500 rows
