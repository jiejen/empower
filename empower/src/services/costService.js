import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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


const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

export const parseCostCSV = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const costData = [];
  
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
    
    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost < 0) {
      console.warn(`Invalid cost value: ${costStr}`);
      continue;
    }
    
    let startDate, endDate;
    
    if (dateRangeStr.toLowerCase().includes(' to ')) {
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
      startDate = parseDate(dateRangeStr);
      if (!startDate || isNaN(startDate.getTime())) {
        console.warn(`Invalid date format: ${dateRangeStr}`);
        continue;
      }
      endDate = new Date(startDate);
    }
    
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
  
  costData.sort((a, b) => a.timestamp - b.timestamp);
  
  return costData;
};

export const saveCostData = async (newCostData) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    
    const existingDoc = await getDoc(costDataRef);
    let existingData = [];
    
    if (existingDoc.exists()) {
      const existingDocData = existingDoc.data();
      if (existingDocData.data && Array.isArray(existingDocData.data)) {
        existingData = existingDocData.data;
      }
    }
    
    const existingDataMap = new Map();
    existingData.forEach(entry => {
      existingDataMap.set(entry.date, entry);
    });
    
    newCostData.forEach(entry => {
      existingDataMap.set(entry.date, entry);
    });
    
    const mergedData = Array.from(existingDataMap.values());
    mergedData.sort((a, b) => a.timestamp - b.timestamp);
    
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

export const deleteCostDataByDateRange = async (startDate, endDate) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    const existingDoc = await getDoc(costDataRef);
    
    if (!existingDoc.exists()) {
      return true;
    }
    
    const existingDocData = existingDoc.data();
    if (!existingDocData.data || !Array.isArray(existingDocData.data)) {
      return true;
    }
    
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    
    const filteredData = existingDocData.data.filter(entry => {
      const entryTimestamp = new Date(entry.date).getTime();
      return entryTimestamp < startTimestamp || entryTimestamp > endTimestamp;
    });
    
    filteredData.sort((a, b) => a.timestamp - b.timestamp);
    
    const dateRange = filteredData.length > 0 ? {
      start: filteredData[0].date,
      end: filteredData[filteredData.length - 1].date
    } : null;
    
    await setDoc(costDataRef, {
      data: filteredData,
      updatedAt: new Date().toISOString(),
      dateRange: dateRange
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error deleting cost data:', error);
    throw error;
  }
};

export const deleteAllCostData = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    const costDataRef = doc(db, 'users', uid, 'settings', 'costData');
    
    await setDoc(costDataRef, {
      data: [],
      updatedAt: new Date().toISOString(),
      dateRange: null
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error deleting all cost data:', error);
    throw error;
  }
};

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
    
    const exactMatch = costData.find(d => d.date === targetDateStr);
    if (exactMatch) {
      return exactMatch.costPerKwh;
    }
    
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
    
    const costsInRange = costData.filter(entry => {
      const entryTimestamp = new Date(entry.date).getTime();
      return entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
    });
    
    if (costsInRange.length === 0) {
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
    
    const totalCost = costsInRange.reduce((sum, entry) => sum + entry.costPerKwh, 0);
    return totalCost / costsInRange.length;
  } catch (error) {
    console.error('Error getting cost for date range:', error);
    return defaultCost;
  }
};