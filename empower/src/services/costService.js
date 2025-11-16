import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Parse a date string in various formats
 */
const parseDate = (dateStr) => {
  const dateFormats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
  ];
  
  if (dateFormats[0].test(dateStr)) {
    // YYYY-MM-DD
    return new Date(dateStr);
  } else if (dateFormats[1].test(dateStr) || dateFormats[3].test(dateStr)) {
    // MM/DD/YYYY or M/D/YYYY
    const [month, day, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (dateFormats[2].test(dateStr)) {
    // MM-DD-YYYY
    const [month, day, year] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return null;
};

/**
 * Generate all dates between start and end (inclusive)
 */
const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure we're working with dates at midnight
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Parse CSV file content into cost data
 * Expected format: dateRange,costPerKwh
 * Date range formats: "YYYY-MM-DD to YYYY-MM-DD" or single date "YYYY-MM-DD"
 * Date formats supported: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY
 */
export const parseCostCSV = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const costData = [];
  
  // Skip header row if present
  let startIndex = 0;
  if (lines.length > 0) {
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('date') && firstLine.includes('cost')) {
      startIndex = 1;
    }
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quotes and commas
    // Split by comma, but be careful with "to" in date ranges
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(currentPart.trim().replace(/^"|"$/g, ''));
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim().replace(/^"|"$/g, ''));
    
    if (parts.length < 2) continue;
    
    const dateRangeStr = parts[0];
    const costStr = parts[1];
    
    // Parse cost
    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost < 0) {
      console.warn(`Invalid cost value: ${costStr}`);
      continue;
    }
    
    // Check if it's a date range (contains "to") or single date
    let startDate, endDate;
    
    if (dateRangeStr.toLowerCase().includes(' to ')) {
      // Date range format: "startDate to endDate"
      const rangeParts = dateRangeStr.split(/ to /i).map(p => p.trim());
      if (rangeParts.length !== 2) {
        console.warn(`Invalid date range format: ${dateRangeStr}`);
        continue;
      }
      
      startDate = parseDate(rangeParts[0]);
      endDate = parseDate(rangeParts[1]);
      
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(`Invalid date in range: ${dateRangeStr}`);
        continue;
      }
      
      if (startDate > endDate) {
        console.warn(`Start date must be before end date: ${dateRangeStr}`);
        continue;
      }
    } else {
      // Single date format
      startDate = parseDate(dateRangeStr);
      if (!startDate || isNaN(startDate.getTime())) {
        console.warn(`Invalid date format: ${dateRangeStr}`);
        continue;
      }
      endDate = new Date(startDate);
    }
    
    // Generate all dates in the range and add to costData
    const datesInRange = generateDateRange(startDate, endDate);
    for (const date of datesInRange) {
      const dateKey = date.toISOString().split('T')[0];
      costData.push({
        date: dateKey,
        costPerKwh: cost,
        timestamp: date.getTime()
      });
    }
  }
  
  // Sort by date
  costData.sort((a, b) => a.timestamp - b.timestamp);
  
  return costData;
};

/**
 * Save cost data to Firebase, merging with existing data
 */
export const saveCostData = async (newCostData) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    
    // Load existing data
    const existingDoc = await getDoc(costDataRef);
    let existingData = [];
    
    if (existingDoc.exists()) {
      const existingDocData = existingDoc.data();
      if (existingDocData.data && Array.isArray(existingDocData.data)) {
        existingData = existingDocData.data;
      }
    }
    
    // Create a map of existing data by date for easy lookup
    const existingDataMap = new Map();
    existingData.forEach(entry => {
      existingDataMap.set(entry.date, entry);
    });
    
    // Merge new data with existing data (new data takes precedence for overlapping dates)
    newCostData.forEach(entry => {
      existingDataMap.set(entry.date, entry);
    });
    
    // Convert map back to array and sort
    const mergedData = Array.from(existingDataMap.values());
    mergedData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate overall date range
    const dateRange = mergedData.length > 0 ? {
      start: mergedData[0].date,
      end: mergedData[mergedData.length - 1].date
    } : null;
    
    await setDoc(costDataRef, {
      data: mergedData,
      updatedAt: new Date().toISOString(),
      dateRange: dateRange
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error saving cost data:', error);
    throw error;
  }
};

/**
 * Load cost data from Firebase
 */
export const loadCostData = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return null;
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    const costDataSnap = await getDoc(costDataRef);
    
    if (costDataSnap.exists()) {
      return costDataSnap.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error loading cost data:', error);
    return null;
  }
};

/**
 * Get cost per kWh for a specific date
 * Returns the cost for the exact date, or the closest earlier date, or a default
 */
export const getCostForDate = async (targetDate, defaultCost = 0.14) => {
  try {
    const costDataDoc = await loadCostData();
    if (!costDataDoc || !costDataDoc.data || costDataDoc.data.length === 0) {
      return defaultCost;
    }
    
    const costData = costDataDoc.data;
    const targetDateStr = targetDate instanceof Date 
      ? targetDate.toISOString().split('T')[0]
      : targetDate;
    
    // Find exact match first
    const exactMatch = costData.find(d => d.date === targetDateStr);
    if (exactMatch) {
      return exactMatch.costPerKwh;
    }
    
    // Find closest earlier date
    const targetTimestamp = new Date(targetDateStr).getTime();
    let closestCost = null;
    let closestDate = null;
    
    for (const entry of costData) {
      const entryTimestamp = new Date(entry.date).getTime();
      if (entryTimestamp <= targetTimestamp) {
        if (!closestDate || entryTimestamp > closestDate) {
          closestDate = entryTimestamp;
          closestCost = entry.costPerKwh;
        }
      }
    }
    
    return closestCost !== null ? closestCost : defaultCost;
  } catch (error) {
    console.error('Error getting cost for date:', error);
    return defaultCost;
  }
};

/**
 * Get cost per kWh for a date range (returns average or array of costs)
 */
export const getCostForDateRange = async (startDate, endDate, defaultCost = 0.14) => {
  try {
    const costDataDoc = await loadCostData();
    if (!costDataDoc || !costDataDoc.data || costDataDoc.data.length === 0) {
      return defaultCost;
    }
    
    const costData = costDataDoc.data;
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();
    
    // Filter cost data within date range
    const costsInRange = costData.filter(entry => {
      const entryTimestamp = new Date(entry.date).getTime();
      return entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
    });
    
    if (costsInRange.length === 0) {
      // No data in range, find closest earlier date
      let closestCost = null;
      let closestDate = null;
      
      for (const entry of costData) {
        const entryTimestamp = new Date(entry.date).getTime();
        if (entryTimestamp <= startTimestamp) {
          if (!closestDate || entryTimestamp > closestDate) {
            closestDate = entryTimestamp;
            closestCost = entry.costPerKwh;
          }
        }
      }
      
      return closestCost !== null ? closestCost : defaultCost;
    }
    
    // Return average cost for the range
    const totalCost = costsInRange.reduce((sum, entry) => sum + entry.costPerKwh, 0);
    return totalCost / costsInRange.length;
  } catch (error) {
    console.error('Error getting cost for date range:', error);
    return defaultCost;
  }
};

