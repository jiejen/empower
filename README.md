# Empower Energy Management UI

## Overview
This UI is a prototype for managing home appliances, tracking energy usage, and generating reports. It is designed for desktop browsers and provides a consistent experience for users to add appliances, upload energy data, and visualize usage and cost.

---

## Features

### Add Appliance
- Create a new appliance entry
- Specify appliance name, category, and location
- Upload energy usage data via CSV (kWh vs timestamp) for appliance

### View Appliances
- See list of all appliances and their details
- View usage statistics generated from uploaded data
- Delete appliances

### Create Report
- Select one or more appliances
- Select date ranges
- Choose chart type (Line, Bar, Pie)
- Generate visual analytics reports

### View Reports
- Browse previously generated reports
- Delete old reports

### Dashboard
- View summary statistics
- Filter appliance rankings
- View past reports

### Add Cost Data (Optional)*
- Upload cost data via CSV (cost per kWh vs time range)

\*If no cost data is uploaded, a default value of **$0.14 per kWh** is used.

---

## Setup & Requirements
- **Browser:** Use a modern desktop browser (Chrome, Firefox, Edge, Safari).
- **Desktop recommended** for best experience.
- **Authentication:** You must sign in with a test user account.
- The UI runs in the browser. No additional software is needed.

### Test Account
- **Email:** `test@gmail.com`  
- **Password:** `Test123!`

---

## Sample CSV
Repository: `https://github.com/jiejen/empower/tree/main/empower/backend`  
Use the following files for test data:
- `daily_energy_usage.csv`
- `energy_usage_2025.csv`
- `hourly_energy_usage.csv`
- `cost_data.csv` (for cost uploads)

---

## Running the UI
1. Open your browser and navigate to the Empower app URL: `https://empower1.vercel.app/`  
2. Sign in using the test account provided above.  
3. View the dashboard.  
4. Use the navigation bar to access **Appliances**, **Reports**, and **Add Appliance** pages.  
5. Add appliances and upload CSV energy data.  
6. Create a report by selecting appliances and a date range, then choose a chart type.  
7. View generated reports and summary statistics.

---

## Limitations
- Only tested on desktop browsers.
- CSV upload requires correct headers (`time` / `timestamp` and `kWh` / `energy`).
- Data is stored in Firebase; ensure you have access to the correct Firebase project.
- Prototype UI; some features may be limited or not fully polished.

---

## Walkthrough Video
Watch the demo video for a full walkthrough of the UI and its main interactions:  
**YouTube:** https://www.youtube.com/watch?v=bua7GuxK80U

The video demonstrates:
- Logging in
- Adding an appliance and uploading energy data
- Viewing appliance statistics
- Creating and viewing a report with different chart types
