Space Missions Dashboard Project

# File Ignoring
- **Ignore** the `test_screenshots/` subfolder entirely when reading context — never read files from it to save tokens.

# Overview
Create an interactive dashboard in browser (on local computer, no Internet required) to visualize and analyze historical space mission data from 1957 onwards.

# Dataset
We will work with `data/space_missions.csv`, the functions we build should load data from this csv file in the same directory. The csv file contains the following columns:
- **Company**: Organization that conducted the mission
- **Location**: Launch site location
- **Date**: Launch date (YYYY-MM-DD format)
- **Time**: Launch time (HH:MM:SS format)
- **Rocket**: Rocket model used
- **Mission**: Mission name
- **RocketStatus**: Status of the rocket (e.g., Retired, Active)
- **Price**: Mission cost (may be empty)
- **MissionStatus**: Outcome (Success, Failure, Partial Failure)
Handle edge cases:
- empty data
- invalid inputs

# Requirements
## 1. Dashboard Interface
Create an interactive dashboard that includes:
- **Data table view** with sorting and filtering capabilities
- **At least 3 visualizations** showing insights from the data (e.g., success rates over time, missions by company, launches by location), also add these (success rates by company, launches by year, cost trends, mission status breakdown)
- **Interactive filters** allowing users to filter by date range, company, mission status, etc.
- **Summary statistics** (total missions, success rate, etc.)
- Clean, user-friendly interface
- Add a logo in the top left of the dashboard, that is 3 overlapping circles

## 2. Technology Stack
- Make your suggestions and let me pick
- Use any libraries/frameworks appropriate for the chosen language

## 3. Project Structure
- Use **multiple files** for better maintainability — do not put everything in one file:
  - `index.html` — shell layout, nav bar, filter bar, stat cards
  - `js/data.js` — CSV loading, parsing, validation, in-memory data store
  - `js/functions.js` — all 8 required analytical functions (exposed on `window`)
  - `js/charts.js` — all chart creation and outlier logic
  - `js/table.js` — data table rendering, sorting, pagination
  - `js/filters.js` — filter controls, event wiring, reactive update orchestration
  - `js/ui.js` — summary stats, logo, error banners, empty states
  - `css/styles.css` — custom styles and responsive breakpoints
  - `libs/` — embedded offline copies of third-party libraries
  - `tests.html` — standalone test runner
  - `js/tests.js` — test logic and screenshot capture
- Add a **Reload CSV** control in the navigation bar (in addition to the initial Load CSV file picker) that re-reads the currently loaded file, clears all state, and re-renders charts and table from scratch

## 4. Test Screenshots
- The test runner (`tests.html`) must automatically save a screenshot of the browser viewport for each failing test case into the `test_screenshots/` subfolder
- Screenshot filenames must follow the pattern: `test_<functionName>_<caseName>_<timestamp>.png`
- Example: `test_getSuccessRate_unknownCompany_20260408.png`
- The `test_screenshots/` folder is listed in `.gitignore` and must **never** be read by Claude when loading context (to save tokens)

## 5. Required Functions
Code must include the following functions with **exact** function signatures and return types. These will be tested programmatically:

### Function 1: `getMissionCountByCompany(companyName: str) -> int`
- **Description**: Returns the total number of missions for a given company.
- **Input**:
  - `companyName` (string): Name of the company (e.g., "SpaceX", "NASA", "RVSN USSR")
- **Output**:
  - Integer representing the total number of missions
- **Example**:
  ```python
  def getMissionCountByCompany("NASA")  # Returns: 394
  ```

### Function 2: `getSuccessRate(companyName: str) -> float`
- **Description**: Calculates the success rate for a given company as a percentage.
- **Input**:
  - `companyName` (string): Name of the company
- **Output**:
  - Float representing success rate as a percentage (0-100), rounded to 2 decimal places
  - Only "Success" missions count as successful
  - Return `0.0` if company has no missions
- **Example**:
  ```python
  def getSuccessRate("NASA")  # Returns: 87.34
  ```

### Function 3: `getMissionsByDateRange(startDate: str, endDate: str) -> list`
- **Description**: Returns a list of all mission names launched between startDate and endDate (inclusive).
- **Input**:
  - `startDate` (string): Start date in "YYYY-MM-DD" format
  - `endDate` (string): End date in "YYYY-MM-DD" format
- **Output**:
  - List of strings containing mission names, sorted chronologically
- **Example**:
  ```python
  def getMissionsByDateRange("1957-10-01", "1957-12-31")
  # Returns: ["Sputnik-1", "Sputnik-2", "Vanguard TV3"]
  ```

### Function 4: `getTopCompaniesByMissionCount(n: int) -> list`
- **Description**: Returns the top N companies ranked by total number of missions.
- **Input**:
  - `n` (integer): Number of top companies to return
- **Output**:
  - List of tuples: `[(companyName, missionCount), ...]`
  - Sorted by mission count in descending order
  - If companies have the same count, sort alphabetically by company name
- **Example**:
  ```python
  def getTopCompaniesByMissionCount(3)
  # Returns: [("RVSN USSR", 1777), ("Arianespace", 279), ("NASA", 199)]
  ```

### Function 5: `getMissionStatusCount() -> dict`
- **Description**: Returns the count of missions for each mission status.
- **Input**: None
- **Output**:
  - Dictionary with status as key and count as value
  - Keys: "Success", "Failure", "Partial Failure", "Prelaunch Failure"
- **Example**:
  ```python
  def getMissionStatusCount()
  # Returns: {"Success": 3879, "Failure": 485, "Partial Failure": 68, "Prelaunch Failure": 7}
  ```

### Function 6: `getMissionsByYear(year: int) -> int`
- **Description**: Returns the total number of missions launched in a specific year.
- **Input**:
  - `year` (integer): Year (e.g., 2020)
- **Output**:
  - Integer representing the total number of missions in that year
- **Example**:
  ```python
  def getMissionsByYear(2020)  # Returns: 114
  ```

### Function 7: `getMostUsedRocket() -> str`
- **Description**: Returns the name of the rocket that has been used the most times.
- **Input**: None
- **Output**:
  - String containing the rocket name
  - If multiple rockets have the same count, return the first one alphabetically
- **Example**:
  ```python
  def getMostUsedRocket()  # Returns: "Cosmos-3M (11K65M)"
  ```

### Function 8: `getAverageMissionsPerYear(startYear: int, endYear: int) -> float`
- **Description**: Calculates the average number of missions per year over a given range.
- **Input**:
  - `startYear` (integer): Starting year (inclusive)
  - `endYear` (integer): Ending year (inclusive)
- **Output**:
  - Float representing average missions per year, rounded to 2 decimal places
- **Example**:
  ```python
  def getAverageMissionsPerYear(2010, 2020)  # Returns: 87.45
  ```

## 6. Precision
Use 5 digits of precision for each float, 5 specifically, so if the output is an average, such as in function 8 in this instruction file
output something like 87.33333

## 7. Validation
- Add input validation to your functions: missing value, invalid format 

## 8. Testing
- Build test cases as part of the project
- Test should cover all major browser types: Chrome, Safari, Firefox, Edge
- Test all functions for each code change

## 9. Responsiveness
The page should be responsive to small screen sizes

## 10. Error Handling and Edge Case Handling
- Include error handling for edge cases: unexpected column name, corrupted file, too-large file (over 10MB)
- empty result: UI should show a user-friendly message eg. "No data match your critiera" instead of just showing a blank table
- outliers: If very few data points in a visualization are outliers (much larger compared to the rest), don't show the outliers up to scale and distort the whole visualization. Instead, show that they're scaled down so user knows they're not up to scale
- pagination: for very large dataset, use pagination, but also support showing all in one page with warning
- if libraries fail to load, show a user-friendly message

## 11. Reasoning
Give some information why you chose a visualization and a visualization method 

