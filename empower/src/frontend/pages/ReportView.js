import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { auth, db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getCostForDate, getCostForDateRange } from '../../services/costService';
import '../components/Layout.css';

function ReportView()
{
  const {user, logout} = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const reportData = location.state?.reportData;
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const navigationRef = useRef(null);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [applianceBreakdown, setApplianceBreakdown] = useState([]);
  const [peakUsageTime, setPeakUsageTime] = useState(null);
  const [comparisonStats] = useState(null);
  const [energySavingTips, setEnergySavingTips] = useState([]);

  useEffect(() => {
    if (reportData)
    {
      const isExistingReport = reportData.id || (reportData.createdAt && reportData.chartImage);
      setHasUnsavedChanges(!isExistingReport);
    }
  }, [reportData]);

  // useEffect(() => {
  //   if (reportData)
  //   {
  //     console.log('Original dates received:',
  //     {
  //       startDate: reportData.startDate,
  //       endDate: reportData.endDate,
  //       startDateObj: new Date(reportData.startDate),
  //       endDateObj: new Date(reportData.endDate),
  //       startDateISO: new Date(reportData.startDate).toISOString(),
  //       endDateISO: new Date(reportData.endDate).toISOString()
  //     });
  //   }
  // }, [reportData]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges)
      {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleClick = (e) => {
      const link = e.target.closest('a, button');
      if (!link) return;

      const isNavigationButton = link.textContent?.toLowerCase().includes('dashboard') || link.textContent?.toLowerCase().includes('reports') || link.textContent?.toLowerCase().includes('appliance') || link.textContent?.toLowerCase().includes('profile') || link.textContent?.toLowerCase().includes('cost data') || link.textContent?.toLowerCase().includes('log out');

      if (isNavigationButton)
      {
        e.preventDefault();
        e.stopPropagation();
        
        navigationRef.current = () => {
          setHasUnsavedChanges(false);
          setTimeout(() => {
            link.click();
          }, 100);
        };
        
        setShowNavigationModal(true);
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges]);

  const handleNavigationConfirm = () => {
    if (navigationRef.current)
    {
      navigationRef.current();
      navigationRef.current = null;
    }
    setShowNavigationModal(false);
  };

  const handleNavigationCancel = () => {
    navigationRef.current = null;
    setShowNavigationModal(false);
  };

  const processApplianceComparison = useCallback(async (appliances, startDate, endDate, yAxis) => {
    const start = parseISOWithLocalTime(startDate);
    const end = parseISOWithLocalTime(endDate);

    // console.log('Processing comparison with dates:', {
    //   originalStart: startDate,
    //   originalEnd: endDate,
    //   localStart: start,
    //   localEnd: end
    // });

    const avgCostPerKwh = await getCostForDateRange(start, end);

    const comparisonDataPromises = appliances.map(async (appliance) => {
      let totalValue = 0;
      let dataPointCount = 0;
      const costPromises = [];

      if (appliance.energyData && Array.isArray(appliance.energyData))
      {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end)
          {
            if (yAxis === 'power')
            {
              totalValue += dataPoint.kwh;
            }
            else
            {
              costPromises.push(getCostForDate(pointDate).then(rate => ({kwh: dataPoint.kwh, rate})));
            }
            dataPointCount++;
          }
        });
      }

      if (yAxis === 'cost')
      {
        const costData = await Promise.all(costPromises);
        totalValue = costData.reduce((sum, {kwh, rate}) => sum + (kwh * rate), 0);
        
        if (totalValue === 0 && dataPointCount > 0)
        {
          let totalKwh = 0;
          appliance.energyData?.forEach(dataPoint => {
            const pointDate = new Date(dataPoint.time);
            if (pointDate >= start && pointDate <= end)
            {
              totalKwh += dataPoint.kwh;
            }
          });
          totalValue = totalKwh * avgCostPerKwh;
        }
      }

      const finalValue = yAxis === 'power' ? (dataPointCount > 0 ? totalValue/dataPointCount : 0) : totalValue;

      return {
        name: appliance.name,
        value: parseFloat(finalValue.toFixed(2)),
        applianceType: appliance.applianceType,
        location: appliance.location
      };
    });

    return await Promise.all(comparisonDataPromises);
  }, []);

  const parseISOWithLocalTime = (dateString) => {
    if (dateString.includes('T'))
    {
      return new Date(dateString);
    }
    else
    {
      return new Date(dateString + 'T00:00:00');
    }
  };

  const groupDataByTimeInterval = useCallback((data, interval) => {
    if (data.length === 0) return [];

    const grouped = {};

    data.forEach(point => {
      let key;
      const date = point.time;

      switch (interval)
      {
        case 'hour':
          key = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
          break;
        case 'day':
          key = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          break;
        case 'week':
          const firstDayOfWeek = new Date(date);
          firstDayOfWeek.setDate(date.getDate() - date.getDay());
          firstDayOfWeek.setHours(0, 0, 0, 0);
          
          const lastDayOfWeek = new Date(firstDayOfWeek);
          lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
          lastDayOfWeek.setHours(23, 59, 59, 999);
          
          key = `Week of ${firstDayOfWeek.getMonth() + 1}/${firstDayOfWeek.getDate()}/${firstDayOfWeek.getFullYear()}`;
          break;
        case 'month':
          key = `${date.toLocaleString('default', {month: 'short'})} ${date.getFullYear()}`;
          break;
        case 'year':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = date.toISOString();
      }

      if (!grouped[key])
      {
        grouped[key] = {name: key, value: 0, count: 0};
      }
      
      grouped[key].value += point.value;
      grouped[key].count += 1;
    });

    return Object.values(grouped).map(group => ({
      name: group.name,
      value: parseFloat((group.value/group.count).toFixed(2))
    }));
  }, []);

  const processEnergyData = useCallback(async (appliances, startDate, endDate, xAxis, yAxis) => {
    const start = parseISOWithLocalTime(startDate);
    const end = parseISOWithLocalTime(endDate);

    const allDataPromises = [];
    
    appliances.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData))
      {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end)
          {
            if (yAxis === 'power')
            {
              allDataPromises.push(Promise.resolve({time: pointDate, value: dataPoint.kwh, applianceName: appliance.name}));
            }
            else
            {
              allDataPromises.push(getCostForDate(pointDate).then(rate => ({time: pointDate, value: dataPoint.kwh * rate, applianceName: appliance.name})));
            }
          }
        });
      }
    });

    const allData = await Promise.all(allDataPromises);
    allData.sort((a, b) => a.time - b.time);
    const grouped = groupDataByTimeInterval(allData, xAxis);
    
    return grouped;
  }, [groupDataByTimeInterval]);

  useEffect(() => {
    if (!reportData)
    {
      navigate('/create-report');
      return;
    }

    const loadData = async () => {
      let processedData;
      if (reportData.chartType === 'pie')
      {
        processedData = await processApplianceComparison(reportData.appliances, reportData.startDate, reportData.endDate, reportData.yAxis);
      }
      else
      {
        processedData = await processEnergyData(reportData.appliances, reportData.startDate, reportData.endDate, reportData.xAxis, reportData.yAxis);
      }
      setChartData(processedData);
    };

    loadData().catch(err => {
      console.error('Error processing report data:', err);
    });
  }, [reportData, navigate, processApplianceComparison, processEnergyData]);

  const handleSaveReport = async () => {
    if (!reportData) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try
    {
      const uid = auth.currentUser?.uid;
      if (!uid)
      {
        throw new Error('User not authenticated');
      }

      const reportToSave = {
        reportName: reportData.reportName,
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        appliances: reportData.appliances,
        chartType: reportData.chartType,
        yAxis: reportData.yAxis,
        xAxis: reportData.xAxis,
        notes: reportData.notes,
        chartData: chartData,
        stats: await calculateStats(),
        advancedStats: {
          applianceBreakdown,
          peakUsageTime,
          energySavingTips,
          comparisonStats
        },
        createdAt: new Date().toISOString()
      };

      const reportsRef = collection(db, 'users', uid, 'reports');
      await addDoc(reportsRef, reportToSave);
      
      setSaveMessage('Report saved successfully!');
      setHasUnsavedChanges(false);
    }
    catch (error)
    {
      console.error('Error saving report:', error);
      setSaveMessage('Failed to save report. Please try again.');
    }
    finally
    {
      setIsSaving(false);
    }
  };

  const handleBackButton = () => {
    if (hasUnsavedChanges)
    {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (confirmed)
      {
        navigate('/reports');
      }
    }
    else
    {
      navigate('/reports');
    }
  };

  const renderChart = () => {
    if (!reportData || chartData.length === 0)
    {
      return (
        <div style={{textAlign: 'center', padding: '60px', color: '#6b7280'}}>
          No data available for the selected date range and appliances.
        </div>
      );
    }

    const colors = ['#28a745', '#059669', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const yAxisLabel = reportData.yAxis === 'power' ? 'Power (kW)' : 'Cost ($)';

    switch (reportData.chartType)
    {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" stroke="#6b7280"/>
              <YAxis label={{value: yAxisLabel, angle: -90, position: 'insideLeft'}} stroke="#6b7280"/>
              <Tooltip contentStyle={{backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}/>
              <Legend/>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#28a745"
                strokeWidth={2}
                dot={{fill: '#059669', r: 4}}
                activeDot={{r: 6, fill: '#059669'}}
                name={yAxisLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" stroke="#6b7280"/>
              <YAxis label={{value: yAxisLabel, angle: -90, position: 'insideLeft'}} stroke="#6b7280"/>
              <Tooltip contentStyle={{backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}/>
              <Legend/>
              <Bar
                dataKey="value"
                fill="#28a745"
                radius={[6, 6, 0, 0]}
                name={yAxisLabel}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        const metricLabel = reportData.yAxis === 'power' ? 'Avg Power (kW)' : 'Total Cost ($)';
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({name, value}) => `${name}: ${value}`}
                outerRadius={120}
                fill="#28a745"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} ${reportData.yAxis === 'power' ? 'kW' : '$'}`, metricLabel]}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const calculateStats = useCallback(async () => {
    if (!chartData || chartData.length === 0 || !reportData)
    {
      return {totalEnergy: 0, avgEnergy: 0, totalCost: 0};
    }

    let totalEnergy = 0;
    const start = parseISOWithLocalTime(reportData.startDate);
    const end = parseISOWithLocalTime(reportData.endDate);

    reportData.appliances.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData))
      {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          if (pointDate >= start && pointDate <= end)
          {
            totalEnergy += parseFloat(dataPoint.kwh) || 0;
          }
        });
      }
    });

    const avgEnergy = chartData.length > 0 ? totalEnergy/chartData.length : 0;
    
    let totalCost = 0;
    if (reportData.yAxis === 'cost')
    {
      totalCost = chartData.reduce((sum, point) => sum + (point.value || 0), 0);
    }
    else
    {
      const avgCostPerKwh = await getCostForDateRange(start, end);
      totalCost = totalEnergy * avgCostPerKwh;
    }

    return {
      totalEnergy: totalEnergy.toFixed(2),
      avgEnergy: avgEnergy.toFixed(2),
      totalCost: totalCost.toFixed(2)
    };
  }, [chartData, reportData]);

  const calculateAdvancedStats = useCallback(async () => {
    if (!reportData || !reportData.appliances || reportData.appliances.length === 0) {
      return;
    }

    const start = parseISOWithLocalTime(reportData.startDate);
    const end = parseISOWithLocalTime(reportData.endDate);
    const daysInRange = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    const breakdownPromises = reportData.appliances.map(async (appliance) => {
      let totalEnergy = 0;
      let totalCost = 0;
      const hourlyData = Array(24).fill(0);
      let dataPoints = 0;

      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          if (pointDate >= start && pointDate <= end) {
            const energy = parseFloat(dataPoint.kwh) || 0;
            totalEnergy += energy;
            
            const hour = pointDate.getHours();
            hourlyData[hour] += energy;
            dataPoints++;
          }
        });

        if (reportData.yAxis === 'cost') {
          const costPromises = appliance.energyData
            .filter(dataPoint => {
              const pointDate = new Date(dataPoint.time);
              return pointDate >= start && pointDate <= end;
            })
            .map(async (dataPoint) => {
              const rate = await getCostForDate(new Date(dataPoint.time));
              return parseFloat(dataPoint.kwh) * rate;
            });
          
          const costs = await Promise.all(costPromises);
          totalCost = costs.reduce((sum, cost) => sum + cost, 0);
        } else {
          const avgCostPerKwh = await getCostForDateRange(start, end);
          totalCost = totalEnergy * avgCostPerKwh;
        }
      }

      return {
        name: appliance.name,
        type: appliance.applianceType,
        totalEnergy: parseFloat(totalEnergy.toFixed(2)),
        avgDailyEnergy: parseFloat((totalEnergy / daysInRange).toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        percentageOfTotal: 0,
        hourlyData,
        dataPoints
      };
    });

    const breakdownResults = await Promise.all(breakdownPromises);
    
    const totalEnergyAll = breakdownResults.reduce((sum, app) => sum + app.totalEnergy, 0);
    
    let maxHourEnergy = 0;
    let peakHour = 0;
    const hourlyTotals = Array(24).fill(0);
    
    const finalBreakdown = breakdownResults.map(app => {
      const percentage = totalEnergyAll > 0 ? (app.totalEnergy / totalEnergyAll) * 100 : 0;
      
      app.hourlyData.forEach((energy, hour) => {
        hourlyTotals[hour] += energy;
        if (hourlyTotals[hour] > maxHourEnergy) {
          maxHourEnergy = hourlyTotals[hour];
          peakHour = hour;
        }
      });
      
      return {
        ...app,
        percentageOfTotal: parseFloat(percentage.toFixed(1))
      };
    });

    finalBreakdown.sort((a, b) => b.totalEnergy - a.totalEnergy);

    setApplianceBreakdown(finalBreakdown);
    setPeakUsageTime(peakHour);

    const avgEnergyPerDay = totalEnergyAll / daysInRange;    

    const tips = generateEnergySavingTips(finalBreakdown, peakHour, avgEnergyPerDay);
    setEnergySavingTips(tips);

  }, [reportData]);

  const generateEnergySavingTips = (breakdown, peakHour, avgDailyEnergy) => {
    const tips = [];
    
    if (breakdown.length === 0) return tips;
    
    const topConsumer = breakdown[0];
    
    tips.push({
      title: `Reduce ${topConsumer.name} Usage`,
      description: `${topConsumer.name} is your highest energy consumer at ${topConsumer.percentageOfTotal}% of total usage. Consider using it during off-peak hours or reducing usage time.`,
      priority: 'high'
    });
    
    if (peakHour >= 14 && peakHour <= 20) {
      tips.push({
        title: 'Shift Usage Away From Peak Hours',
        description: `Your peak energy usage occurs at ${peakHour}:00, during peak rate hours. Consider shifting usage to early morning or late night.`,
        priority: 'medium'
      });
    }
    
    if (avgDailyEnergy > 30) {
      tips.push({
        title: 'High Overall Energy Consumption',
        description: `Your average daily energy usage (${avgDailyEnergy.toFixed(1)} kWh) is above typical household levels. Consider an energy audit.`,
        priority: 'medium'
      });
    }
    
    tips.push({
      title: 'Use Smart Power Strips',
      description: 'Connect entertainment systems and office equipment to smart power strips to eliminate phantom load.',
      priority: 'low'
    });
    
    tips.push({
      title: 'Maintain Appliances Regularly',
      description: 'Clean filters and perform regular maintenance on appliances to keep them running efficiently.',
      priority: 'low'
    });
    
    return tips.slice(0, 3);
  };

  useEffect(() => {
    if (reportData && chartData && chartData.length > 0) {
      calculateAdvancedStats();
    }
  }, [reportData, chartData, calculateAdvancedStats]);

  const [stats, setStats] = useState({totalEnergy: 0, avgEnergy: 0, totalCost: 0});

  useEffect(() => {
    if (reportData && chartData && chartData.length > 0)
    {
      const loadStats = async () => {
        try
        {
          const calculatedStats = await calculateStats();
          setStats(calculatedStats);
        }
        catch (err)
        {
          console.error('Error calculating stats:', err);
        }
      };
      loadStats();
    }
    else
    {
      setStats({totalEnergy: 0, avgEnergy: 0, totalCost: 0});
    }
  }, [reportData, chartData, calculateStats]);

  if (!reportData)
  {
    return null;
  }

  return (
    <Layout activePage="Create Report" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      {showNavigationModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937'}}>
              Unsaved Changes
            </h3>
            <p style={{margin: '0 0 24px 0', color: '#6b7280', lineHeight: '1.5'}}>
              You have unsaved changes. Are you sure you want to leave? Your report will be lost.
            </p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button onClick={handleNavigationCancel} style={{padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#374151'}}>
                Cancel
              </button>
              <button onClick={handleNavigationConfirm} style={{padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{padding: '32px', maxWidth: '1200px'}}>
        <button onClick={handleBackButton}
          style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '16px', transition: 'all 0.2s'}}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#9ca3af';
            e.target.style.backgroundColor = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.backgroundColor = 'white';
          }}
        >
          ← Back to Reports
        </button>

        <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px'}}>
            <div>
              <h1 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937'}}>
                {reportData.reportName}
              </h1>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'}}>
                <div style={{fontSize: '14px', color: '#6b7280'}}>
                  {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                </div>
                <div style={{padding: '2px 8px', backgroundColor: '#fef9c3', borderRadius: '4px', fontSize: '13px', fontWeight: '500', color: '#b45309'}}>
                  {reportData.chartType.charAt(0).toUpperCase() + reportData.chartType.slice(1)} Chart
                </div>
                {!hasUnsavedChanges && (
                  <div style={{padding: '2px 8px', backgroundColor: '#d1fae5', borderRadius: '4px', fontSize: '13px', fontWeight: '500', color: '#065f46'}}>
                    Saved
                  </div>
                )}
              </div>
            </div>
            <div>
              {saveMessage && (
                <div style={{padding: '8px 12px', marginBottom: '8px', backgroundColor: saveMessage.includes('successfully') ? '#d1fae5' : '#fee2e2', color: saveMessage.includes('successfully') ? '#065f46' : '#991b1b', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textAlign: 'center'}}>
                  {saveMessage}
                </div>
              )}
              {hasUnsavedChanges && (
                <button onClick={handleSaveReport} disabled={isSaving}
                  style={{padding: '10px 20px', backgroundColor: '#28a745', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '14px', color: 'white', transition: 'background-color 0.2s', opacity: isSaving ? 0.6 : 1}}
                  onMouseEnter={(e) => {
                    if (!isSaving) e.target.style.backgroundColor = '#218838';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) e.target.style.backgroundColor = '#28a745';
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Report'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px'}}>
          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Total Energy
            </div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              {stats.totalEnergy} kWh
            </div>
          </div>

          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Average Usage
            </div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              {stats.avgEnergy} kWh
            </div>
          </div>

          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Total Cost
            </div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              ${stats.totalCost}
            </div>
          </div>
        </div>

        <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px'}}>
          <h2 style={{margin: '0 0 24px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937'}}>
            Energy Visualization
          </h2>
          <div>
            {renderChart()}
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px'}}>
          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937'}}>
              Monitored Appliances ({reportData.appliances.length})
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {reportData.appliances.map((appliance, idx) => (
                <div key={appliance.id} style={{padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px'}}>
                  <div style={{fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '4px'}}>
                    {appliance.name}
                  </div>
                  <div style={{fontSize: '13px', color: '#6b7280'}}>
                    {appliance.applianceType} • {appliance.location}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937'}}>
              Notes
            </h3>
            {reportData.notes ? (
              <div style={{padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap'}}>
                {reportData.notes}
              </div>
            ) : (
              <div style={{padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontStyle: 'italic'}}>
                No notes added for this report
              </div>
            )}
          </div>
        </div>

        <div style={{marginBottom: '24px', marginTop: '24px'}}>
          <button 
            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
            style={{padding: '10px 20px', backgroundColor: showAdvancedStats ? '#28a745' : '#f3f4f6', color: showAdvancedStats ? 'white' : '#374151', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: showAdvancedStats ? '16px' : '0'}}
            onMouseEnter={(e) => {
              if (!showAdvancedStats) {
                e.target.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!showAdvancedStats) {
                e.target.style.backgroundColor = '#f3f4f6';
              }
            }}
          >
            {showAdvancedStats ? '▼ Hide Advanced Statistics' : '▶ Show Advanced Statistics'}
          </button>

          {showAdvancedStats && (
            <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', marginTop: '16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h3 style={{margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937'}}>
                  Advanced Statistics
                </h3>
              </div>

              <div style={{marginBottom: '32px'}}>
                <h4 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937'}}>
                  Energy Consumption Breakdown
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px'}}>
                  {applianceBreakdown.map((appliance, index) => (
                    <div key={index} style={{padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                        <div style={{fontSize: '15px', fontWeight: '500', color: '#1f2937'}}>
                          {appliance.name}
                        </div>
                        <div style={{fontSize: '14px', fontWeight: '600', color: index === 0 ? '#ef4444' : '#28a745'}}>
                          {appliance.percentageOfTotal}% of total
                        </div>
                      </div>
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
                        <div>
                          <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Total Energy</div>
                          <div style={{fontSize: '14px', fontWeight: '500', color: '#1f2937'}}>
                            {appliance.totalEnergy} kWh
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Avg Daily</div>
                          <div style={{fontSize: '14px', fontWeight: '500', color: '#1f2937'}}>
                            {appliance.avgDailyEnergy} kWh
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Total Cost</div>
                          <div style={{fontSize: '14px', fontWeight: '500', color: '#1f2937'}}>
                            ${appliance.totalCost}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Data Points</div>
                          <div style={{fontSize: '14px', fontWeight: '500', color: '#1f2937'}}>
                            {appliance.dataPoints}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937'}}>
                  Energy Saving Recommendations
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px'}}>
                  {energySavingTips.map((tip, index) => (
                    <div key={index} style={{padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                        <div style={{fontSize: '14px', fontWeight: '600', color: '#1f2937'}}>
                          {tip.title}
                        </div>
                        <div style={{fontSize: '11px', fontWeight: '500', padding: '2px 8px', backgroundColor: tip.priority === 'high' ? '#ef4444' : tip.priority === 'medium' ? '#fef9c3' : '#28a745', color: 'white', borderRadius: '12px'}}>
                          {tip.priority.toUpperCase()} PRIORITY
                        </div>
                      </div>
                      
                      <div style={{fontSize: '13px', color: '#4b5563', marginBottom: '8px', lineHeight: '1.5'}}>
                        {tip.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ReportView;