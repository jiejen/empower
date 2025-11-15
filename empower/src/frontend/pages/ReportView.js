import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { auth, db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import '../components/Layout.css';

function ReportView()
{
  const { user, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const reportData = location.state?.reportData;
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const chartRef = useRef(null);

  const processApplianceComparison = useCallback((appliances, startDate, endDate, yAxis) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const costPerKwh = 0.12;

    const comparisonData = appliances.map(appliance => {
      let totalValue = 0;
      let dataPointCount = 0;

      if (appliance.energyData && Array.isArray(appliance.energyData))
      {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end)
          {
            if (yAxis === 'power')
            {
              totalValue += dataPoint.kwh;
            } else {
              totalValue += dataPoint.kwh * costPerKwh;
            }
            dataPointCount++;
          }
        });
      }

      const finalValue = yAxis === 'power' ? (dataPointCount > 0 ? totalValue/dataPointCount : 0) : totalValue;

      return {
        name: appliance.name,
        value: parseFloat(finalValue.toFixed(2)),
        applianceType: appliance.applianceType,
        location: appliance.location
      };
    });

    return comparisonData;
  }, []);

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
          const weekNum = Math.ceil((date.getDate())/7);
          key = `Week ${weekNum} - ${date.getMonth() + 1}/${date.getFullYear()}`;
          break;
        case 'month':
          key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
          break;
        case 'year':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = date.toISOString();
      }

      if (!grouped[key])
      {
        grouped[key] = { name: key, value: 0, count: 0 };
      }
      
      grouped[key].value += point.value;
      grouped[key].count += 1;
    });

    return Object.values(grouped).map(group => ({
      name: group.name,
      value: parseFloat((group.value/group.count).toFixed(2))
    }));
  }, []);

  const processEnergyData = useCallback((appliances, startDate, endDate, xAxis, yAxis) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const costPerKwh = 0.12;

    const allData = [];
    
    appliances.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData))
      {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end)
          {
            const value = yAxis === 'power' ? dataPoint.kwh : dataPoint.kwh * costPerKwh;
            
            allData.push({time: pointDate, value: value, applianceName: appliance.name});
          }
        });
      }
    });

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

    let processedData;
    
    if (reportData.chartType === 'pie')
    {
      processedData = processApplianceComparison(reportData.appliances, reportData.startDate, reportData.endDate, reportData.yAxis);
    }
    else
    {
      processedData = processEnergyData(reportData.appliances, reportData.startDate, reportData.endDate, reportData.xAxis, reportData.yAxis);
    }
    
    setChartData(processedData);
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

      // Capture chart as image
      let chartImageUrl = null;
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher quality
            logging: false
          });
          
          // Convert canvas to blob
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          
          // Convert blob to base64
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          chartImageUrl = await base64Promise;
        } catch (error) {
          console.error('Error capturing chart image:', error);
          // Continue saving even if image capture fails
        }
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
        chartImage: chartImageUrl, // Save the base64 image
        stats: calculateStats(),
        createdAt: new Date().toISOString()
      };

      const reportsRef = collection(db, 'users', uid, 'reports');
      await addDoc(reportsRef, reportToSave);
      
      setSaveMessage('Report saved successfully!');
      setTimeout(() => {
        navigate('/reports');
      }, 1500);
    }
    catch (error)
    {
      console.error('Error saving report:', error);
      setSaveMessage('Failed to save report. Please try again.');
    }
    finally {
      setIsSaving(false);
    }
  };

  const renderChart = () => {
    if (!reportData || chartData.length === 0)
    {
      return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          No data available for the selected date range and appliances.
        </div>
      );
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const yAxisLabel = reportData.yAxis === 'power' ? 'Power (kW)' : 'Cost ($)';

    switch (reportData.chartType)
    {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" stroke="#6b7280"/>
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#6b7280"/>
              <Tooltip contentStyle={{backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}/>
              <Legend/>
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} name={yAxisLabel}/>
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" stroke="#6b7280"/>
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#6b7280"/>
              <Tooltip contentStyle={{backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}/>
              <Legend/>
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} name={yAxisLabel}/>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        const metricLabel = reportData.yAxis === 'power' ? 'Avg Power (kW)' : 'Total Cost ($)';
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={120} fill="#8884d8" dataKey="value">
                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={colors[index % colors.length]}/>))}
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

  const calculateStats = () => {
    if (!chartData || chartData.length === 0)
    {
      return { totalEnergy: 0, avgEnergy: 0, totalCost: 0 };
    }

    const totalEnergy = chartData.reduce((sum, point) => sum + (point.value || 0), 0);
    const avgEnergy = totalEnergy/chartData.length;
    const totalCost = reportData.yAxis === 'cost' ? totalEnergy : totalEnergy * 0.12;

    return {
      totalEnergy: totalEnergy.toFixed(2),
      avgEnergy: avgEnergy.toFixed(2),
      totalCost: totalCost.toFixed(2)
    };
  };

  const stats = calculateStats();

  if (!reportData)
  {
    return null;
  }

  return (
    <Layout activePage="Create Report" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1200px' }}>
        <button onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '16px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#9ca3af';
            e.target.style.backgroundColor = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.backgroundColor = 'white';
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px'}}>
            <div>
              <h1 style={{margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937'}}>
                {reportData.reportName}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'}}>
                <div style={{ fontSize: '14px', color: '#6b7280'}}>
                  {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                </div>
                <div style={{padding: '2px 8px', backgroundColor: '#dbeafe', borderRadius: '4px', fontSize: '13px', fontWeight: '500', color: '#1e40af'}}>
                  {reportData.chartType.charAt(0).toUpperCase() + reportData.chartType.slice(1)} Chart
                </div>
              </div>
            </div>
            <div>
              {saveMessage && (
                <div style={{
                  padding: '8px 12px',
                  marginBottom: '8px',
                  backgroundColor: saveMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
                  color: saveMessage.includes('successfully') ? '#065f46' : '#991b1b',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {saveMessage}
                </div>
              )}
              <button onClick={handleSaveReport} disabled={isSaving}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  color: 'white',
                  transition: 'background-color 0.2s',
                  opacity: isSaving ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                {isSaving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px'}}>
          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Total Energy
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              {stats.totalEnergy} kWh
            </div>
          </div>

          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Average Usage
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              {stats.avgEnergy} kWh
            </div>
          </div>

          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px'}}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>
              Total Cost
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>
              ${stats.totalCost}
            </div>
          </div>
        </div>

        <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px'}}>
          <h2 style={{margin: '0 0 24px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937'}}>
            Energy Visualization
          </h2>
          <div ref={chartRef}>
            {renderChart()}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px'}}>
          <div style={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937'}}>
              Monitored Appliances ({reportData.appliances.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {reportData.appliances.map((appliance, idx) => (
                <div key={appliance.id} style={{padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px'}}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '4px'}}>
                    {appliance.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280'}}>
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
      </div>
    </Layout>
  );
}

export default ReportView;