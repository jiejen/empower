import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
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
    billDataSource: null // tracks which month's data was used for estimation
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const iconRef = useRef(null);
  const [rankBy, setRankBy] = useState('kwh');
  const [filterBy, setFilterBy] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [rankedAppliances, setRankedAppliances] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRankOpen, setIsRankOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const toggleFilter = (filterValue) => {
    setFilterBy(prev => 
      prev.includes(filterValue)
        ? prev.filter(f => f !== filterValue)
        : [...prev, filterValue]
    );
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
  };

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
      window.addEventListener('resize', updateTooltipPosition);
      window.addEventListener('scroll', updateTooltipPosition);
      
      return () => {
        window.removeEventListener('resize', updateTooltipPosition);
        window.removeEventListener('scroll', updateTooltipPosition);
      };
    }
  }, [showTooltip]);

  // calculate all the dashboard stats from appliance data
  const calculateStats = useCallback(async (applianceData) => {
    let totalKwh = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Collect data by month for all available data
    const monthlyData = {}; // key: 'YYYY-MM', value: { kwh, dataPoints }
    
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

    // Calculate percentage change from last month
    let monthlyChange = null;
    if (lastMonthKwh > 0 && currentMonthKwh > 0) {
      monthlyChange = ((currentMonthKwh - lastMonthKwh) / lastMonthKwh) * 100;
    }

    // Calculate estimated bill with fallback logic
    let estimatedBill = 0;
    let billDataSource = null;
    
    if (currentMonthKwh > 0) {
      // We have current month data - project it to full month
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const projectedMonthlyKwh = (currentMonthKwh / dayOfMonth) * daysInMonth;
      
      // Get cost for current month
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      const rate = await getCostForDateRange(monthStart, monthEnd);
      estimatedBill = projectedMonthlyKwh * rate;
      billDataSource = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (current month)`;
    } else {
      // No current month data - look for historical data
      // Try to find the most recent complete month
      const sortedMonths = Object.keys(monthlyData).sort().reverse();
      
      for (const monthKey of sortedMonths) {
        const [year, month] = monthKey.split('-').map(Number);
        // Skip current month (we already know it's empty)
        if (year === currentYear && month === currentMonth + 1) continue;
        
        // Get cost for that month
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const rate = await getCostForDateRange(monthStart, monthEnd);
        
        // Use this month's data as estimate
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
    // use current date from system (November 14, 2025)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    const currentDay = now.getDay(); // 0 = sunday
    
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

    // Get average cost for the time range
    const avgRate = await getCostForDateRange(startDate, endDate);
    
    // Process appliances with async cost calculations
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
            
            // Get cost for this specific date (async)
            costPromises.push(
              getCostForDate(pointDate).then(rate => ({ kwh, rate }))
            );
          }
        });
      }

      // Wait for all cost calculations
      const costData = await Promise.all(costPromises);
      let totalCost = costData.reduce((sum, { kwh, rate }) => sum + (kwh * rate), 0);

      // Fallback: if no cost calculated, use average rate
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

    // apply filters - when no filters selected, show all with data
    let filtered = ranked.filter(a => a.totalKwh > 0);
    
    if (filter.length > 0) {
      filtered = ranked.filter(appliance => {
        // An appliance passes only if it matches ALL selected filters
        return filter.every(f => {
          // Appliance type filters
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
          // Energy usage filters
          else if (f === 'high-energy') {
            return appliance.totalKwh > 50;
          } else if (f === 'medium-energy') {
            return appliance.totalKwh >= 20 && appliance.totalKwh <= 50;
          } else if (f === 'low-energy') {
            return appliance.totalKwh < 20 && appliance.totalKwh > 0;
          }
          // Cost filters
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

    // Calculate total kWh for percentage calculation
    const totalKwhSum = filtered.reduce((sum, a) => sum + a.totalKwh, 0);
    
    // Add percentage to each appliance
    const withPercentage = filtered.map(appliance => ({
      ...appliance,
      percentage: totalKwhSum > 0 ? (appliance.totalKwh / totalKwhSum) * 100 : 0
    }));

    setRankedAppliances(withPercentage);
  }, []);

  // Handle clicking on an appliance to navigate to appliances page
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
      
      // debug: log appliance data structure
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
      
      // Sort by creation date, newest first
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
    if (authLoading) return; // Wait for auth to complete
    
    if (user) {
      fetchAppliances();
      fetchReports();
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
                <h3 className="stat-title">Total Energy Used</h3>
                <div className="stat-divider"></div>
                <p className="stat-value">
                  {stats.totalEnergy.toFixed(2)}
                  <span className="stat-unit">kWh</span>
                </p>
              </div>

              {/* monthly change card */}
              <div className="stat-card">
                <h3 className="stat-title">Energy Usage Change vs. Last Month</h3>
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
                          ? 'Projected based on your current monthly usage using $0.14 per kWh.'
                          : stats.billDataSource
                          ? `Estimated using data from ${stats.billDataSource} since no current month data is available.`
                          : 'Projected based on your monthly usage using $0.14 per kWh.'}
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
                <h2>Appliance Rankings</h2>

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
                              
                              // FIRST: Check if ANY appliance has data in the selected time range
                              const hasAnyData = appliances.some(a => a.energyData && a.energyData.length > 0);
                              const noDataInTimeRange = appliances.every(a => {
                                if (!a.energyData || a.energyData.length === 0) return true;
                                
                                // Check if this appliance has any data points in the time range
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
                              
                              // If appliances exist with data, but none in the time range, show time-based message
                              if (hasAnyData && noDataInTimeRange) {
                                return `No energy data found ${timeMessage}. Your appliances have data from other time periods.`;
                              }
                              
                              // Otherwise, show filter-specific messages
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