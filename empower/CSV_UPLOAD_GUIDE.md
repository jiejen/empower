# CSV Upload Guide

## Overview
You can now upload energy consumption data (kWh over time) for your appliances. This data will be used to create customizable graphs for reports.

## CSV File Format

Your CSV file should have the following format:

```csv
timestamp,kwh
2024-01-01T00:00:00,2.5
2024-01-01T01:00:00,2.3
2024-01-01T02:00:00,2.1
...
```

### Required Columns:
- `timestamp`: ISO 8601 datetime format (e.g., 2024-01-01T00:00:00)
- `kwh`: Energy consumption in kilowatt-hours

### Example Data
See `sample_energy_data.csv` for a working example with 24 hours of data.

## How to Upload

1. **Go to "Add Appliance" page**
2. **Scroll down to see existing appliances**
3. **Each appliance card has a file input**
4. **Click "Choose File" and select your CSV file**
5. **The data will be automatically uploaded and attached to that appliance**

## Using the Data for Reports

Once uploaded, the energy data is stored with each appliance and can be:
- Filtered by time frame (daily, weekly, monthly, custom range)
- Graphed as kWh vs time
- Used to calculate total energy consumption
- Compared across multiple appliances

## Data Storage

The CSV data is parsed and stored in `backend/data/appliances.json` with the structure:

```json
{
  "id": "123456",
  "name": "Kitchen Fridge",
  "applianceType": "Refrigerator",
  "location": "Kitchen",
  "energyData": [
    { "timestamp": "2024-01-01T00:00:00", "kwh": "2.5" },
    { "timestamp": "2024-01-01T01:00:00", "kwh": "2.3" }
  ],
  "dataLastUploaded": "2024-01-02T12:00:00.000Z"
}
```

## Notes

- You can upload multiple CSV files to the same appliance (it will replace the previous data)
- The data persists across server restarts
- CSV files must follow the exact column names: `timestamp` and `kwh`

