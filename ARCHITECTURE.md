# Space Missions Dashboard — Architecture

## Technology Stack
- **Chart library**: Chart.js (offline, ~200KB, covers all needed chart types)
- **CSV parsing**: PapaParse (already in `libs/`)
- **Screenshots**: html2canvas (already in `libs/`, used by test runner)

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Shell layout, nav, filter bar, stat cards, boot script |
| `css/styles.css` | Custom styles + responsive breakpoints |
| `js/data.js` | CSV loading, parsing, validation, in-memory DataStore ✅ |
| `js/functions.js` | 8 analytical functions exposed on `window` (Function 1 ✅) |
| `js/ui.js` | Summary stat cards, error banners, empty states |
| `js/filters.js` | Filter controls, event wiring, reactive update orchestration |
| `js/charts.js` | 6 Chart.js visualizations + outlier capping |
| `js/table.js` | Data table rendering, sorting, pagination |
| `js/tests.js` | Test logic + screenshot capture |
| `tests.html` | Standalone test runner |
| `libs/papaparse.min.js` | CSV parser ✅ |
| `libs/html2canvas.min.js` | Viewport screenshot ✅ |
| `libs/chart.min.js` | Chart.js (to be added) |

## Data Flow

```
User loads CSV
  → DataStore.loadFromFile()
  → rows[]
  → Filters.init(rows)      ← populates dropdowns from data
  → UI.renderStats(rows)
  → Charts.init(rows)
  → Table.render(rows)

Filters.onChange()
  → filteredRows = Filters.apply()
  → UI.renderStats(filteredRows)
  → Charts.init(filteredRows)
  → Table.render(filteredRows)

reloadBtn.click()
  → DataStore.reload() → same onFileLoaded pipeline
```

## Module APIs

### `UI` (js/ui.js)
```js
UI.renderStats(rows)        // updates 4 stat cards
UI.showBanner(msg, type)    // error / warning / info banner
UI.showEmpty(el, msg)       // "No data matches your criteria"
```

### `Charts` (js/charts.js)
```js
Charts.init(rows)           // creates/updates all 6 charts
Charts.destroy()            // tears down instances (clean reload)
Charts._capOutliers(series) // caps outliers >3×IQR above Q3, annotates
```

### `Table` (js/table.js)
```js
Table.render(rows)          // initial render with headers
Table.sort(col, dir)        // re-sort in place
Table.setPage(n)            // pagination
Table.showAll(rows)         // render all rows with large-data warning
```

### `Filters` (js/filters.js)
```js
Filters.init()              // populates dropdowns, wires events
Filters.apply()             // reads controls → filtered rows
Filters.reset()             // clears controls + re-renders
```

## Charts (with rationale)

| # | Title | Chart Type | Rationale |
|---|-------|-----------|-----------|
| 1 | Launches per Year | Line | Continuous time-series — trend most readable as a line |
| 2 | Mission Status Breakdown | Doughnut | Part-to-whole (4 categories) — doughnut more readable than pie |
| 3 | Top Companies by Mission Count | Horizontal Bar | Ranking with long labels — horizontal avoids text rotation |
| 4 | Success Rate by Company (top 15) | Vertical Bar | Percentage comparison — vertical bars natural for 0–100% scale |
| 5 | Cost Trends over Time | Line + area fill | Sparse data (many nulls) — area fill shows data density |
| 6 | Launches by Location (top 10) | Vertical Bar | Categorical distribution — clearer than a map for offline use |

**Outlier capping**: bars/points >3× IQR above Q3 are capped visually with a dashed top and an annotation ("actual: X"), so they don't compress the rest of the chart.

## Edge Case Handling

- **File > 10MB**: rejected with user-friendly error
- **Missing columns**: DataStore throws, banner shown
- **Corrupted CSV**: PapaParse warnings surfaced in banner
- **Empty filter result**: UI.showEmpty() renders "No data matches your criteria"
- **Library load failure**: `onerror` on `<script>` tags shows banner
- **Pagination**: default 50 rows/page; "Show All" button adds warning for >500 rows
