import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { doc, deleteDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { Info } from 'lucide-react';
import { getCostForDate, getCostForDateRange } from '../../services/costService';
import '../components/Layout.css';
import './Dashboard.css';

function Dashboard() {
  const { user, loading: authLoading, logout } = useUser();
  const navigate = useNavigate();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalEnergy: 0,
    monthlyChange: null,
    estimatedBill: 0,
    billDataSource: null
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showTooltipEnergy, setShowTooltipEnergy] = useState(false);
  const [showTooltipChange, setShowTooltipChange] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [tooltipPositionEnergy, setTooltipPositionEnergy] = useState({ top: 0, left: 0 });
  const [tooltipPositionChange, setTooltipPositionChange] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const tooltipRefEnergy = useRef(null);
  const tooltipRefChange = useRef(null);
  const iconRef = useRef(null);
  const iconRefEnergy = useRef(null);
  const iconRefChange = useRef(null);
  const [rankBy, setRankBy] = useState('kwh');
  const [filterBy, setFilterBy] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [rankedAppliances, setRankedAppliances] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRankOpen, setIsRankOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [filterTab, setFilterTab] = useState('active');

  const toggleFilter = (filterValue) => {
    setFilterBy(prev =>
      prev.includes(filterValue)
        ? prev.filter(f => f !== filterValue)
        : [...prev, filterValue]
    );
  };

  const loadSavedFilters = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const filtersRef = collection(db, 'users', uid, 'filterPresets');
      const snapshot = await getDocs(filtersRef);
      const allFilters = [];
      snapshot.forEach((doc) => {
        allFilters.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by savedAt descending (most recent first)
      allFilters.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setSavedFilters(allFilters);
    } catch (err) {
      console.error('Error loading saved filters:', err);
    }
  };

  const handleSaveNamedFilter = async () => {
    if (!filterName.trim()) return;

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Check if a filter with the same configuration already exists (regardless of name)
      const existingConfigFilter = savedFilters.find(f => {
        if (f.deleted) return false;
        
        // Compare rankBy and timeFilter
        if (f.rankBy !== rankBy || f.timeFilter !== timeFilter) return false;
        
        // Compare filterBy arrays
        const savedFilterBy = f.filterBy || [];
        const currentFilterBy = filterBy || [];
        
        if (savedFilterBy.length !== currentFilterBy.length) return false;
        
        // Check if all elements match (order-independent comparison)
        const sortedSaved = [...savedFilterBy].sort();
        const sortedCurrent = [...currentFilterBy].sort();
        
        return sortedSaved.every((val, idx) => val === sortedCurrent[idx]);
      });

      if (existingConfigFilter) {
        alert(`These filter settings already match the existing filter "${existingConfigFilter.name}". Please change your filter settings or use the existing filter.`);
        return;
      }

      // Check if a filter with the same name already exists (case sensitive)
      const existingNameFilter = savedFilters.find(
        f => f.name === filterName.trim() && !f.deleted
      );
      
      if (existingNameFilter) {
        alert(`The name "${filterName.trim()}" is already used by another filter. Please choose a different name.`);
        return;
      }

      const filterData = {
        name: filterName.trim(),
        rankBy,
        filterBy,
        timeFilter,
        savedAt: new Date().toISOString()
      };

      const filtersRef = collection(db, 'users', uid, 'filterPresets');
      await addDoc(filtersRef, filterData);
      
      setFilterName('');
      setShowSaveDialog(false);
      await loadSavedFilters();
    } catch (err) {
      console.error('Error saving named filter:', err);
    }
  };

  const handleApplyFilter = (filter) => {
    setRankBy(filter.rankBy);
    setFilterBy(filter.filterBy);
    setTimeFilter(filter.timeFilter);
    setShowSavedFilters(false);
  };

  const handleDeleteFilterClick = async (filterId) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const filterRef = doc(db, 'users', uid, 'filterPresets', filterId);
      await updateDoc(filterRef, {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      await loadSavedFilters();
    } catch (err) {
      console.error('Error deleting filter:', err);
    }
  };

  const handleRestoreFilter = async (filterId) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const filterRef = doc(db, 'users', uid, 'filterPresets', filterId);
      await updateDoc(filterRef, {
        deleted: false,
        deletedAt: null
      });
      await loadSavedFilters();
    } catch (err) {
      console.error('Error restoring filter:', err);
    }
  };

  const handlePermanentDeleteFilter = async (filterId) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const filterRef = doc(db, 'users', uid, 'filterPresets', filterId);
      await deleteDoc(filterRef);
      await loadSavedFilters();
    } catch (err) {
      console.error('Error permanently deleting filter:', err);
    }
  };

  // so that tooltip stays within viewport
  const updateTooltipPosition = () => {
    if (iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // start with centered position above icon
      let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
      let top = iconRect.top - tooltipRect.height - 8;

      // adjust if tooltip goes off left edge
      if (left < 16) {
        left = 16;
      }

      // adjust if tooltip goes off right edge
      if (left + tooltipRect.width > window.innerWidth - 16) {
        left = window.innerWidth - tooltipRect.width - 16;
      }

      // if tooltip goes off top, show below icon instead
      if (top < 16) {
        top = iconRect.bottom + 8;
      }

      setTooltipPosition({ top, left });
    }
    if (iconRefEnergy.current && tooltipRefEnergy.current) {
      const iconRect = iconRefEnergy.current.getBoundingClientRect();
      const tooltipRect = tooltipRefEnergy.current.getBoundingClientRect();

      let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
      let top = iconRect.top - tooltipRect.height - 8;

      if (left < 16) left = 16;
      if (left + tooltipRect.width > window.innerWidth - 16) {
        left = window.innerWidth - tooltipRect.width - 16;
      }
      if (top < 16) top = iconRect.bottom + 8;

      setTooltipPositionEnergy({ top, left });
    }
    if (iconRefChange.current && tooltipRefChange.current) {
      const iconRect = iconRefChange.current.getBoundingClientRect();
      const tooltipRect = tooltipRefChange.current.getBoundingClientRect();

      let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
      let top = iconRect.top - tooltipRect.height - 8;

      if (left < 16) left = 16;
      if (left + tooltipRect.width > window.innerWidth - 16) {
        left = window.innerWidth - tooltipRect.width - 16;
      }
      if (top < 16) top = iconRect.bottom + 8;

      setTooltipPositionChange({ top, left });
    }
  };

  useEffect(() => {
    if (showTooltip || showTooltipEnergy || showTooltipChange) {
      updateTooltipPosition();
      window.addEventListener('resize', updateTooltipPosition);
      window.addEventListener('scroll', updateTooltipPosition);

      return () => {
        window.removeEventListener('resize', updateTooltipPosition);
        window.removeEventListener('scroll', updateTooltipPosition);
      };
    }
  }, [showTooltip, showTooltipEnergy, showTooltipChange]);

  // calculate all the dashboard stats from appliance data
  const calculateStats = useCallback(async (applianceData) => {
    let totalKwh = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const monthlyData = {};

    // go through each appliance and organize data by month
    applianceData.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const kwh = parseFloat(dataPoint.kwh) || 0;
          totalKwh += kwh;

          const pointDate = new Date(dataPoint.time);
          const monthKey = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { kwh: 0, dataPoints: 0 };
          }
          monthlyData[monthKey].kwh += kwh;
          monthlyData[monthKey].dataPoints++;
        });
      }
    });

    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const lastMonthKey = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`;

    const currentMonthKwh = monthlyData[currentMonthKey]?.kwh || 0;
    const lastMonthKwh = monthlyData[lastMonthKey]?.kwh || 0;

    console.log('Monthly data:', monthlyData);
    console.log('Current month kWh:', currentMonthKwh);
    console.log('Last month kWh:', lastMonthKwh);

    // calculate percentage change from last month
    let monthlyChange = null;
    if (lastMonthKwh > 0 && currentMonthKwh > 0) {
      monthlyChange = ((currentMonthKwh - lastMonthKwh) / lastMonthKwh) * 100;
    }

    // calculate estimated bill with fallback logic
    let estimatedBill = 0;
    let billDataSource = null;

    if (currentMonthKwh > 0) {
      // we have current month data, project it to full month
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const projectedMonthlyKwh = (currentMonthKwh / dayOfMonth) * daysInMonth;

      // get cost for current month
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      const rate = await getCostForDateRange(monthStart, monthEnd);
      estimatedBill = projectedMonthlyKwh * rate;
      billDataSource = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (current month)`;
    } else {
      // no current month data, look for historical data
      // try to find the most recent complete month
      const sortedMonths = Object.keys(monthlyData).sort().reverse();

      for (const monthKey of sortedMonths) {
        const [year, month] = monthKey.split('-').map(Number);
        // skip current month (we already know it's empty)
        if (year === currentYear && month === currentMonth + 1) continue;

        // get cost for that month
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const rate = await getCostForDateRange(monthStart, monthEnd);

        // use this month's data as estimate
        estimatedBill = monthlyData[monthKey].kwh * rate;
        const date = new Date(year, month - 1);
        billDataSource = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      }
    }

    setStats({
      totalEnergy: totalKwh,
      monthlyChange: monthlyChange,
      estimatedBill: estimatedBill,
      billDataSource: billDataSource
    });
  }, []);

  // rank appliances based on selected criteria
  const rankAppliances = useCallback(async (applianceData, rankCriteria, filter, time) => {
    // use current date from system
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    const currentDay = now.getDay();

    let startDate, endDate = new Date(now);

    // determine time range based on current date
    switch (time) {
      case 'today':
        // start of today to end of today
        startDate = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
        endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
        break;
      case 'this-week':
        // start of week (sunday) to end of today
        const daysFromSunday = currentDay;
        startDate = new Date(currentYear, currentMonth, currentDate - daysFromSunday, 0, 0, 0);
        endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
        break;
      case 'this-month':
        // start of current month to end of today
        startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
        endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
        break;
      case 'last-month':
        // entire previous month
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        startDate = new Date(lastMonthYear, lastMonth, 1, 0, 0, 0);
        endDate = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59);
        break;
      case 'this-year':
        // start of current year to end of today
        startDate = new Date(currentYear, 0, 1, 0, 0, 0);
        endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
        break;
      case 'all-time':
      default:
        startDate = new Date(0);
        endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
    }

    console.log(`Filtering for ${time}:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // get average cost for the time range
    const avgRate = await getCostForDateRange(startDate, endDate);

    // process appliances with async cost calculations
    const rankedPromises = applianceData.map(async (appliance) => {
      let totalKwh = 0;
      let dataPointCount = 0;
      const costPromises = [];

      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach((dataPoint) => {
          const pointDate = new Date(dataPoint.time);

          // only include data points within the selected time range
          if (pointDate >= startDate && pointDate <= endDate) {
            const kwh = parseFloat(dataPoint.kwh) || 0;
            totalKwh += kwh;
            dataPointCount++;

            // get cost for this specific date (async)
            costPromises.push(
              getCostForDate(pointDate).then(rate => ({ kwh, rate }))
            );
          }
        });
      }

      // wait for all cost calculations
      const costData = await Promise.all(costPromises);
      let totalCost = costData.reduce((sum, { kwh, rate }) => sum + (kwh * rate), 0);

      if (totalCost === 0 && totalKwh > 0) {
        totalCost = totalKwh * avgRate;
      }

      return {
        ...appliance,
        totalKwh,
        totalCost,
        dataPointCount
      };
    });

    const ranked = await Promise.all(rankedPromises);

    // apply filters, when no filters selected, show all with data
    let filtered = ranked.filter(a => a.totalKwh > 0);

    if (filter.length > 0) {
      filtered = ranked.filter(appliance => {
        // an appliance passes only if it matches ALL selected filters
        return filter.every(f => {
          const typeMap = {
            'refrigerator': 'Refrigerator',
            'washer': 'Washer',
            'dryer': 'Dryer',
            'oven': 'Oven',
            'dishwasher': 'Dishwasher',
            'microwave': 'Microwave',
            'other': 'Other'
          };

          if (typeMap[f]) {
            return appliance.applianceType === typeMap[f];
          }
          // energy usage filters
          else if (f === 'high-energy') {
            return appliance.totalKwh > 50;
          } else if (f === 'medium-energy') {
            return appliance.totalKwh >= 20 && appliance.totalKwh <= 50;
          } else if (f === 'low-energy') {
            return appliance.totalKwh < 20 && appliance.totalKwh > 0;
          }
          // cost filters
          else if (f === 'high-cost') {
            return appliance.totalCost > 10;
          } else if (f === 'medium-cost') {
            return appliance.totalCost >= 5 && appliance.totalCost <= 10;
          } else if (f === 'low-cost') {
            return appliance.totalCost < 5 && appliance.totalCost > 0;
          }

          return false;
        });
      });
    }

    // sort by criteria
    filtered.sort((a, b) => {
      if (rankCriteria === 'kwh') {
        return b.totalKwh - a.totalKwh;
      } else {
        return b.totalCost - a.totalCost;
      }
    });

    // calculate total kWh for percentage calculation
    const totalKwhSum = filtered.reduce((sum, a) => sum + a.totalKwh, 0);

    // add percentage to each appliance
    const withPercentage = filtered.map(appliance => ({
      ...appliance,
      percentage: totalKwhSum > 0 ? (appliance.totalKwh / totalKwhSum) * 100 : 0
    }));

    setRankedAppliances(withPercentage);
  }, []);

  // handle clicking on an appliance to navigate to appliances page
  const handleApplianceClick = (applianceId) => {
    navigate('/appliances', { state: { highlightId: applianceId } });
  };

  // fetch appliances from Firestore
  const fetchAppliances = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const appliancesRef = collection(db, 'users', uid, 'appliances');
      const snapshot = await getDocs(appliancesRef);
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      setAppliances(data);
      setError(null);

      console.log('Loaded appliances:', data);
      if (data.length > 0) {
        console.log('First appliance structure:', data[0]);
        console.log('First appliance energyData:', data[0].energyData);
      }

      // calculate stats if we have appliances with energy data
      if (data.length > 0) {
        calculateStats(data);
        rankAppliances(data, rankBy, filterBy, timeFilter).catch(err => {
          console.error('Error ranking appliances:', err);
        });
      }
    } catch (err) {
      console.error('Error fetching appliances:', err);
      setError('An error occurred while loading appliances');
    } finally {
      setLoading(false);
    }
  };

  // fetch reports from Firestore
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoadingReports(false);
        return;
      }

      const reportsRef = collection(db, 'users', uid, 'reports');
      const snapshot = await getDocs(reportsRef);
      const reportsData = [];

      snapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() });
      });

      // sort by creation date, newest first
      reportsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setReports(reportsData);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // load appliances on mount and when user changes
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchAppliances();
      fetchReports();
      loadSavedFilters();
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, authLoading]);

  // re-rank appliances when filters change
  useEffect(() => {
    if (appliances.length > 0) {
      rankAppliances(appliances, rankBy, filterBy, timeFilter);
    }
  }, [rankBy, filterBy, timeFilter, appliances, rankAppliances]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <Layout activePage="Dashboard" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          <h2 style={{
            margin: '0 0 32px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Dashboard
          </h2>

          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              Loading...
            </div>
          ) : appliances.length === 0 ? (
            <div className="welcome-container">
              <p style={{ fontSize: '16px', marginBottom: '16px' }}>
                No appliances found.
              </p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                {/* total energy used card */}
                <div className="stat-card">
                  <div className="stat-header">
                    <h3 className="stat-title">Total Energy Used</h3>
                    <div
                      ref={iconRefEnergy}
                      className="tooltip-container"
                      onMouseEnter={() => setShowTooltipEnergy(true)}
                      onMouseLeave={() => setShowTooltipEnergy(false)}
                    >
                      <Info size={16} color="#6b7280" className="info-icon" />
                      {showTooltipEnergy && (
                        <div
                          ref={tooltipRefEnergy}
                          className="tooltip"
                          style={{
                            top: `${tooltipPositionEnergy.top}px`,
                            left: `${tooltipPositionEnergy.left}px`
                          }}
                        >
                          Total sum of all energy usage (kWh) across all your appliances based on the data you've provided.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stat-divider"></div>
                  <p className="stat-value">
                    {stats.totalEnergy.toFixed(2)}
                    <span className="stat-unit">kWh</span>
                  </p>
                </div>

                {/* monthly change card */}
                <div className="stat-card">
                  <div className="stat-header">
                    <h3 className="stat-title">Energy Usage Change vs. Last Month</h3>
                    <div
                      ref={iconRefChange}
                      className="tooltip-container"
                      onMouseEnter={() => setShowTooltipChange(true)}
                      onMouseLeave={() => setShowTooltipChange(false)}
                    >
                      <Info size={16} color="#6b7280" className="info-icon" />
                      {showTooltipChange && (
                        <div
                          ref={tooltipRefChange}
                          className="tooltip"
                          style={{
                            top: `${tooltipPositionChange.top}px`,
                            left: `${tooltipPositionChange.left}px`
                          }}
                        >
                          Compares current month's energy usage to last month's. Negative % (green) means less energy used this month. Positive % (red) means more energy used. 0% (gray) means same usage.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stat-divider"></div>
                  {stats.monthlyChange !== null ? (
                    <p className={`stat-value ${stats.monthlyChange > 0 ? 'red' : stats.monthlyChange < 0 ? 'green' : 'gray'}`}>
                      {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange.toFixed(2)}%
                    </p>
                  ) : (
                    <p className="stat-na">
                      N/A - Data from one month only
                    </p>
                  )}
                </div>

                {/* estimated monthly bill card */}
                <div className="stat-card">
                  <div className="stat-header">
                    <h3 className="stat-title">Estimated Monthly Bill</h3>
                    <div
                      ref={iconRef}
                      className="tooltip-container"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <Info size={16} color="#6b7280" className="info-icon" />
                      {showTooltip && (
                        <div
                          ref={tooltipRef}
                          className="tooltip"
                          style={{
                            top: `${tooltipPosition.top}px`,
                            left: `${tooltipPosition.left}px`
                          }}
                        >
                          {stats.billDataSource && stats.billDataSource.includes('current month')
                            ? 'Projected based on your current monthly usage. Cost rate is from your uploaded data (CSV). If no cost data is available, a base rate of $0.14/kWh is used based on your location.'
                            : stats.billDataSource
                              ? `Estimated using data from ${stats.billDataSource} since no current month data is available. Cost rate is from your uploaded data (CSV). If no cost data is available, a base rate of $0.14/kWh is used based on your location.`
                              : 'Projected based on your monthly usage. Cost rate is from your uploaded data (CSV). If no cost data is available, a base rate of $0.14/kWh is used based on your location.'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stat-divider"></div>
                  <p className="stat-value">
                    ${stats.estimatedBill.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* appliance ranking and reports sections */}
              <div className="dashboard-sections">
                <div className="ranking-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>Appliance Rankings</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setShowSaveDialog(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                      >
                        Save Filter
                      </button>
                      <button
                        onClick={() => setShowSavedFilters(!showSavedFilters)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                      >
                        Saved Filters ({savedFilters.filter(f => !f.deleted).length})
                      </button>
                    </div>
                  </div>

                  <div className="ranking-filters">
                    <div className="filter-group">
                      <label>Rank By:</label>
                      <div className="filter-dropdown">
                        <div
                          className="filter-dropdown-toggle"
                          onClick={() => setIsRankOpen(!isRankOpen)}
                        >
                          <span>{rankBy === 'kwh' ? 'Energy (kWh)' : 'Cost ($)'}</span>
                          <span className="dropdown-arrow">{isRankOpen ? '▲' : '▼'}</span>
                        </div>
                        {isRankOpen && (
                          <div className="filter-options">
                            <div className="filter-section">
                              <label className="filter-option" onClick={() => { setRankBy('kwh'); setIsRankOpen(false); }}>
                                <input type="radio" checked={rankBy === 'kwh'} readOnly />
                                <span>Energy (kWh)</span>
                              </label>
                              <label className="filter-option" onClick={() => { setRankBy('price'); setIsRankOpen(false); }}>
                                <input type="radio" checked={rankBy === 'price'} readOnly />
                                <span>Cost ($)</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="filter-group">
                      <label>Filter By:</label>
                      <div className="filter-dropdown">
                        <div
                          className="filter-dropdown-toggle"
                          onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                          <span>
                            {filterBy.length === 0 ? 'All Appliances' : `${filterBy.length} filter${filterBy.length > 1 ? 's' : ''} selected`}
                          </span>
                          <span className="dropdown-arrow">{isFilterOpen ? '▲' : '▼'}</span>
                        </div>
                        {isFilterOpen && (
                          <div className="filter-options">
                            <div className="filter-section">
                              <div className="filter-section-title">Appliance Type</div>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('refrigerator')} onChange={() => toggleFilter('refrigerator')} />
                                <span>Refrigerator</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('washer')} onChange={() => toggleFilter('washer')} />
                                <span>Washer</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('dryer')} onChange={() => toggleFilter('dryer')} />
                                <span>Dryer</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('oven')} onChange={() => toggleFilter('oven')} />
                                <span>Oven</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('dishwasher')} onChange={() => toggleFilter('dishwasher')} />
                                <span>Dishwasher</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('microwave')} onChange={() => toggleFilter('microwave')} />
                                <span>Microwave</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('other')} onChange={() => toggleFilter('other')} />
                                <span>Other</span>
                              </label>
                            </div>
                            <div className="filter-section">
                              <div className="filter-section-title">Energy Usage</div>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('high-energy')} onChange={() => toggleFilter('high-energy')} />
                                <span>High Energy (50+ kWh)</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('medium-energy')} onChange={() => toggleFilter('medium-energy')} />
                                <span>Medium Energy (20-50 kWh)</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('low-energy')} onChange={() => toggleFilter('low-energy')} />
                                <span>Low Energy (&lt; 20 kWh)</span>
                              </label>
                            </div>
                            <div className="filter-section">
                              <div className="filter-section-title">Cost</div>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('high-cost')} onChange={() => toggleFilter('high-cost')} />
                                <span>High Cost ($10+)</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('medium-cost')} onChange={() => toggleFilter('medium-cost')} />
                                <span>Medium Cost ($5-$10)</span>
                              </label>
                              <label className="filter-option">
                                <input type="checkbox" checked={filterBy.includes('low-cost')} onChange={() => toggleFilter('low-cost')} />
                                <span>Low Cost (&lt; $5)</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="filter-group">
                      <label>Time:</label>
                      <div className="filter-dropdown">
                        <div
                          className="filter-dropdown-toggle"
                          onClick={() => setIsTimeOpen(!isTimeOpen)}
                        >
                          <span>
                            {timeFilter === 'today' ? 'Today' :
                              timeFilter === 'this-week' ? 'This Week' :
                                timeFilter === 'this-month' ? 'This Month' :
                                  timeFilter === 'last-month' ? 'Last Month' : 'All Time'}
                          </span>
                          <span className="dropdown-arrow">{isTimeOpen ? '▲' : '▼'}</span>
                        </div>
                        {isTimeOpen && (
                          <div className="filter-options">
                            <div className="filter-section">
                              <label className="filter-option" onClick={() => { setTimeFilter('today'); setIsTimeOpen(false); }}>
                                <input type="radio" checked={timeFilter === 'today'} readOnly />
                                <span>Today</span>
                              </label>
                              <label className="filter-option" onClick={() => { setTimeFilter('this-week'); setIsTimeOpen(false); }}>
                                <input type="radio" checked={timeFilter === 'this-week'} readOnly />
                                <span>This Week</span>
                              </label>
                              <label className="filter-option" onClick={() => { setTimeFilter('this-month'); setIsTimeOpen(false); }}>
                                <input type="radio" checked={timeFilter === 'this-month'} readOnly />
                                <span>This Month</span>
                              </label>
                              <label className="filter-option" onClick={() => { setTimeFilter('last-month'); setIsTimeOpen(false); }}>
                                <input type="radio" checked={timeFilter === 'last-month'} readOnly />
                                <span>Last Month</span>
                              </label>
                              <label className="filter-option" onClick={() => { setTimeFilter('all-time'); setIsTimeOpen(false); }}>
                                <input type="radio" checked={timeFilter === 'all-time'} readOnly />
                                <span>All Time</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {showSaveDialog && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10000
                    }}>
                      <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
                      }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                          Save Filter Preset
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                          Give this filter configuration a name so you can quickly apply it later.
                        </p>
                        <input
                          type="text"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          placeholder="Enter filter name (e.g., 'High Energy Appliances')"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveNamedFilter()}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            marginBottom: '24px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setShowSaveDialog(false); setFilterName(''); }}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveNamedFilter}
                            disabled={!filterName.trim()}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: filterName.trim() ? '#28a745' : '#9ca3af',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: filterName.trim() ? 'pointer' : 'not-allowed',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => filterName.trim() && (e.target.style.backgroundColor = '#218838')}
                            onMouseLeave={(e) => filterName.trim() && (e.target.style.backgroundColor = '#28a745')}
                          >
                            Save Filter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showSavedFilters && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10000
                    }}>
                      <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                            Saved Filter Presets
                          </h3>
                          <button
                            onClick={() => { setShowSavedFilters(false); setFilterTab('active'); }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            Close
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
                          <button
                            onClick={() => setFilterTab('active')}
                            style={{
                              padding: '12px 24px',
                              backgroundColor: 'transparent',
                              color: filterTab === 'active' ? '#28a745' : '#6b7280',
                              border: 'none',
                              borderBottom: filterTab === 'active' ? '2px solid #28a745' : '2px solid transparent',
                              marginBottom: '-2px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Active Filters ({savedFilters.filter(f => !f.deleted).length})
                          </button>
                          <button
                            onClick={() => setFilterTab('deleted')}
                            style={{
                              padding: '12px 24px',
                              backgroundColor: 'transparent',
                              color: filterTab === 'deleted' ? '#28a745' : '#6b7280',
                              border: 'none',
                              borderBottom: filterTab === 'deleted' ? '2px solid #28a745' : '2px solid transparent',
                              marginBottom: '-2px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Deleted Filters ({savedFilters.filter(f => f.deleted).length})
                          </button>
                        </div>

                        {filterTab === 'active' ? (
                          savedFilters.filter(f => !f.deleted).length === 0 ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '40px',
                              color: '#6b7280'
                            }}>
                              No saved filters yet. Use "Save Filter" to create one.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {savedFilters.filter(f => !f.deleted).map((filter) => (
                                <div
                                  key={filter.id}
                                  style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    backgroundColor: '#fff',
                                    transition: 'box-shadow 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <div>
                                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                        {filter.name}
                                      </h4>
                                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Saved {new Date(filter.savedAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={() => handleApplyFilter(filter)}
                                        style={{
                                          padding: '6px 12px',
                                          backgroundColor: '#28a745',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                      >
                                        Apply
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFilterClick(filter.id)}
                                        style={{
                                          padding: '6px 12px',
                                          backgroundColor: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                                    <div>
                                      <span style={{ fontWeight: '500' }}>Rank By:</span> {filter.rankBy === 'kwh' ? 'Energy (kWh)' : 'Cost ($)'}
                                    </div>
                                    <div>
                                      <span style={{ fontWeight: '500' }}>Filters:</span> {filter.filterBy.length === 0 ? 'None' : filter.filterBy.length}
                                    </div>
                                    <div>
                                      <span style={{ fontWeight: '500' }}>Time:</span> {
                                        filter.timeFilter === 'today' ? 'Today' :
                                        filter.timeFilter === 'this-week' ? 'This Week' :
                                        filter.timeFilter === 'this-month' ? 'This Month' :
                                        filter.timeFilter === 'last-month' ? 'Last Month' : 'All Time'
                                      }
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          savedFilters.filter(f => f.deleted).length === 0 ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '40px',
                              color: '#6b7280'
                            }}>
                              No deleted filters. Deleted filters are stored here for 30 days.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {savedFilters.filter(f => f.deleted).map((filter) => (
                              <div
                                key={filter.id}
                                style={{
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  backgroundColor: '#fff',
                                  transition: 'box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                  <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                      {filter.name}
                                    </h4>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                      Saved {new Date(filter.savedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleRestoreFilter(filter.id)}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                    >
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteFilter(filter.id)}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                    >
                                      Delete Forever
                                    </button>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                                  <div>
                                    <span style={{ fontWeight: '500' }}>Rank By:</span> {filter.rankBy === 'kwh' ? 'Energy (kWh)' : 'Cost ($)'}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: '500' }}>Filters:</span> {filter.filterBy.length === 0 ? 'None' : filter.filterBy.length}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: '500' }}>Time:</span> {
                                      filter.timeFilter === 'today' ? 'Today' :
                                      filter.timeFilter === 'this-week' ? 'This Week' :
                                      filter.timeFilter === 'this-month' ? 'This Month' :
                                      filter.timeFilter === 'last-month' ? 'Last Month' : 'All Time'
                                    }
                                  </div>
                                </div>
                              </div>
                            ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="ranked-list">
                    {rankedAppliances.length === 0 ? (
                      <div className="no-data">
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>N/A</div>
                        <div style={{ fontSize: '14px' }}>
                          {appliances.length === 0
                            ? 'No appliances available. Add appliances to see rankings.'
                            : (() => {
                              const timeMessage = timeFilter === 'today'
                                ? 'today'
                                : timeFilter === 'this-week'
                                  ? 'this week'
                                  : timeFilter === 'this-month'
                                    ? 'this month'
                                    : timeFilter === 'this-year'
                                      ? 'this year'
                                      : 'the selected time period';

                              const hasAnyData = appliances.some(a => a.energyData && a.energyData.length > 0);
                              const noDataInTimeRange = appliances.every(a => {
                                if (!a.energyData || a.energyData.length === 0) return true;

                                // check if this appliance has any data points in the time range
                                return !a.energyData.some(dataPoint => {
                                  const pointDate = new Date(dataPoint.time);
                                  const now = new Date();
                                  const currentYear = now.getFullYear();
                                  const currentMonth = now.getMonth();
                                  const currentDate = now.getDate();
                                  const currentDay = now.getDay();

                                  let startDate, endDate;
                                  switch (timeFilter) {
                                    case 'today':
                                      startDate = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
                                      endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
                                      break;
                                    case 'this-week':
                                      const daysFromSunday = currentDay;
                                      startDate = new Date(currentYear, currentMonth, currentDate - daysFromSunday, 0, 0, 0);
                                      endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
                                      break;
                                    case 'this-month':
                                      startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
                                      endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
                                      break;
                                    case 'this-year':
                                      startDate = new Date(currentYear, 0, 1, 0, 0, 0);
                                      endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
                                      break;
                                    case 'all-time':
                                    default:
                                      startDate = new Date(0);
                                      endDate = new Date(currentYear, currentMonth, currentDate, 23, 59, 59);
                                  }

                                  return pointDate >= startDate && pointDate <= endDate;
                                });
                              });

                              if (hasAnyData && noDataInTimeRange) {
                                return `No energy data found ${timeMessage}. Your appliances have data from other time periods.`;
                              }

                              const filterMessages = {
                                'refrigerator': 'No refrigerators',
                                'washer': 'No washers',
                                'dryer': 'No dryers',
                                'oven': 'No ovens',
                                'dishwasher': 'No dishwashers',
                                'microwave': 'No microwaves',
                                'other': 'No other appliances',
                                'high-energy': 'No appliances with high energy usage (50+ kWh)',
                                'medium-energy': 'No appliances with medium energy usage (20-50 kWh)',
                                'low-energy': 'No appliances with low energy usage (< 20 kWh)',
                                'high-cost': 'No appliances with high cost ($10+)',
                                'medium-cost': 'No appliances with medium cost ($5-$10)',
                                'low-cost': 'No appliances with low cost (< $5)'
                              };

                              const message = filterMessages[filterBy];
                              if (message) {
                                return `${message} found ${timeMessage}.`;
                              } else {
                                return `No appliances found ${timeMessage}.`;
                              }
                            })()
                          }
                        </div>
                      </div>
                    ) : (
                      rankedAppliances.map((appliance, index) => (
                        <div
                          key={appliance.id}
                          className="ranked-item"
                          onClick={() => handleApplianceClick(appliance.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="rank-number">#{index + 1}</div>
                          <div className="appliance-info">
                            <div className="appliance-name">{appliance.name}</div>
                            <div className="appliance-kwh">{appliance.totalKwh.toFixed(2)} kWh</div>
                          </div>
                          <div className="appliance-cost">
                            ${appliance.totalCost.toFixed(2)}
                          </div>
                          <div className="appliance-percentage">
                            {appliance.percentage.toFixed(1)}%
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="previous-reports-section">
                  <div className="reports-header">
                    <h3 style={{ margin: 0 }}>Past Reports</h3>
                    <button
                      className="create-report-btn"
                      onClick={() => navigate('/create-report')}
                    >
                      Create Report
                    </button>
                  </div>

                  {loadingReports ? (
                    <p>Loading reports...</p>
                  ) : reports.length === 0 ? (
                    <div className="no-reports">
                      <p>No reports created yet.</p>
                    </div>
                  ) : (
                    <div className="reports-grid">
                      {reports.slice(0, 5).map((report) => (
                        <div
                          key={report.id}
                          className="report-preview-card"
                          onClick={() => navigate('/report-view', { state: { reportData: report } })}
                        >
                          {report.chartImage && (
                            <img
                              src={report.chartImage}
                              alt={report.reportName}
                              className="report-chart-image"
                            />
                          )}
                          <div className="report-info">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <p className="report-name">{report.reportName}</p>
                              {report.startDate && report.endDate && (
                                <p className="report-date" style={{ fontSize: '11px', color: '#9ca3af' }}>
                                  Created on: {new Date(report.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              )}
                            </div>
                            <p className="report-date" style={{ textAlign: 'right' }}>
                              {report.startDate && report.endDate ? (
                                `${new Date(report.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} - ${new Date(report.endDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}`
                              ) : (
                                new Date(report.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;