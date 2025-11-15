import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Parse CSV file content into cost data
 * Expected format: date,costPerKwh
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
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    
    if (parts.length < 2) continue;
    
    const dateStr = parts[0];
    const costStr = parts[1];
    
    // Parse date - try multiple formats
    let date = null;
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    ];
    
    if (dateFormats[0].test(dateStr)) {
      // YYYY-MM-DD
      date = new Date(dateStr);
    } else if (dateFormats[1].test(dateStr) || dateFormats[3].test(dateStr)) {
      // MM/DD/YYYY or M/D/YYYY
      const [month, day, year] = dateStr.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateFormats[2].test(dateStr)) {
      // MM-DD-YYYY
      const [month, day, year] = dateStr.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    if (!date || isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}`);
      continue;
    }
    
    // Parse cost
    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost < 0) {
      console.warn(`Invalid cost value: ${costStr}`);
      continue;
    }
    
    // Store as YYYY-MM-DD for easy lookup
    const dateKey = date.toISOString().split('T')[0];
    costData.push({
      date: dateKey,
      costPerKwh: cost,
      timestamp: date.getTime()
    });
  }
  
  // Sort by date
  costData.sort((a, b) => a.timestamp - b.timestamp);
  
  return costData;
};

/**
 * Save cost data to Firebase
 */
export const saveCostData = async (costData) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    await setDoc(costDataRef, {
      data: costData,
      updatedAt: new Date().toISOString(),
      dateRange: {
        start: costData.length > 0 ? costData[0].date : null,
        end: costData.length > 0 ? costData[costData.length - 1].date : null
      }
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

