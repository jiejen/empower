import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Zap, DollarSign, Save, ArrowLeft } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import '../components/Layout.css';

function ReportView() {
  const { user, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const reportData = location.state?.reportData;
  const reportRef = useRef();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!reportData) {
      navigate('/create-report');
      return;
    }

    let processedData;
    
    if (reportData.chartType === 'pie') {
      processedData = processApplianceComparison(
        reportData.appliances,
        reportData.startDate,
        reportData.endDate,
        reportData.yAxis
      );
    } else {
      processedData = processEnergyData(
        reportData.appliances,
        reportData.startDate,
        reportData.endDate,
        reportData.xAxis,
        reportData.yAxis
      );
    }
    
    setChartData(processedData);
  }, [reportData, navigate]);

  const processApplianceComparison = (appliances, startDate, endDate, yAxis) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const costPerKwh = 0.12;

    const comparisonData = appliances.map(appliance => {
      let totalValue = 0;
      let dataPointCount = 0;

      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end) {
            if (yAxis === 'power') {
              totalValue += dataPoint.kwh;
            } else {
              totalValue += dataPoint.kwh * costPerKwh;
            }
            dataPointCount++;
          }
        });
      }

      const finalValue = yAxis === 'power' 
        ? (dataPointCount > 0 ? totalValue / dataPointCount : 0)
        : totalValue;

      return {
        name: appliance.name,
        value: parseFloat(finalValue.toFixed(2)),
        applianceType: appliance.applianceType,
        location: appliance.location
      };
    });

    return comparisonData;
  };

  const processEnergyData = (appliances, startDate, endDate, xAxis, yAxis) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const costPerKwh = 0.12;

    const allData = [];
    
    appliances.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          if (pointDate >= start && pointDate <= end) {
            const value = yAxis === 'power' ? dataPoint.kwh : dataPoint.kwh * costPerKwh;
            
            allData.push({
              time: pointDate,
              value: value,
              applianceName: appliance.name
            });
          }
        });
      }
    });

    allData.sort((a, b) => a.time - b.time);
    const grouped = groupDataByTimeInterval(allData, xAxis);
    
    return grouped;
  };

  const groupDataByTimeInterval = (data, interval) => {
    if (data.length === 0) return [];

    const grouped = {};

    data.forEach(point => {
      let key;
      const date = point.time;

      switch (interval) {
        case 'hour':
          key = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
          break;
        case 'day':
          key = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          break;
        case 'week':
          const weekNum = Math.ceil((date.getDate()) / 7);
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

      if (!grouped[key]) {
        grouped[key] = { name: key, value: 0, count: 0 };
      }
      
      grouped[key].value += point.value;
      grouped[key].count += 1;
    });

    return Object.values(grouped).map(group => ({
      name: group.name,
      value: parseFloat((group.value / group.count).toFixed(2))
    }));
  };

  const handleSaveReport = async () => {
    if (!reportData) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error('User not authenticated');
      }

      // Create report data object
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
        stats: calculateStats(),
        createdAt: new Date().toISOString()
      };

      // Save report to Firestore
      const reportsRef = collection(db, 'users', uid, 'reports');
      const docRef = await addDoc(reportsRef, reportToSave);
      
      setSaveMessage('Report saved successfully!');
      setTimeout(() => {
        navigate('/reports');
      }, 1500);
    } catch (error) {
      console.error('Error saving report:', error);
      setSaveMessage('Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChart = () => {
    if (!reportData || chartData.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          No data available for the selected date range and appliances.
        </div>
      );
    }

    const colors = ['#4d8be9', '#28a745', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const yAxisLabel = reportData.yAxis === 'power' ? 'Power (kW)' : 'Cost ($)';

    switch (reportData.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#4d8be9" 
                strokeWidth={3}
                dot={{ fill: '#4d8be9', r: 6 }}
                activeDot={{ r: 8 }}
                name={yAxisLabel} 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#4d8be9" radius={[8, 8, 0, 0]} name={yAxisLabel} />
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
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} ${reportData.yAxis === 'power' ? 'kW' : '$'}`, metricLabel]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const calculateStats = () => {
    if (!chartData || chartData.length === 0) {
      return { totalEnergy: 0, avgEnergy: 0, totalCost: 0 };
    }

    const totalEnergy = chartData.reduce((sum, point) => sum + (point.value || 0), 0);
    const avgEnergy = totalEnergy / chartData.length;
    const totalCost = reportData.yAxis === 'cost' ? totalEnergy : totalEnergy * 0.12;

    return {
      totalEnergy: totalEnergy.toFixed(2),
      avgEnergy: avgEnergy.toFixed(2),
      totalCost: totalCost.toFixed(2)
    };
  };

  const stats = calculateStats();

  if (!reportData) {
    return null;
  }

  return (
    <Layout activePage="Create Report" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{
        minHeight: 'calc(100vh - 96px)',
        background: 'linear-gradient(135deg, #f6f0b2 0%, #e8f5e9 45%, #dff3ff 100%)',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'white',
              border: '2px solid #e6e6e6',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#4d8be9';
              e.target.style.color = '#4d8be9';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e6e6e6';
              e.target.style.color = '#374151';
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          {/* Report Content */}
          <div ref={reportRef}>
            {/* Header Section */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '2px solid #f4f0a4'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h1 style={{
                    margin: '0 0 12px 0',
                    fontSize: '32px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #4d8be9 0%, #28a745 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {reportData.reportName}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                      <Calendar size={18} color="#4d8be9" />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      background: 'linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#059669'
                    }}>
                      {reportData.chartType.charAt(0).toUpperCase() + reportData.chartType.slice(1)} Chart
                    </div>
                  </div>
                </div>
                <div>
                  {saveMessage && (
                    <div style={{
                      padding: '10px 16px',
                      marginBottom: '12px',
                      backgroundColor: saveMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
                      color: saveMessage.includes('successfully') ? '#065f46' : '#991b1b',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      {saveMessage}
                    </div>
                  )}
                  <button 
                    onClick={handleSaveReport}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #4d8be9 0%, #28a745 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '600',
                      color: 'white',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(77, 139, 233, 0.3)',
                      opacity: isSaving ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(77, 139, 233, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(77, 139, 233, 0.3)';
                      }
                    }}
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid #93c5fd',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Zap size={22} color="white" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>Total Energy</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e3a8a' }}>
                  {stats.totalEnergy} kWh
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid #6ee7b7',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp size={22} color="white" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#065f46' }}>Average Usage</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#064e3b' }}>
                  {stats.avgEnergy} kWh
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid #fcd34d',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <DollarSign size={22} color="white" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>Total Cost</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#78350f' }}>
                  ${stats.totalCost}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '2px solid #e5e7eb'
            }}>
              <h2 style={{
                margin: '0 0 24px 0',
                fontSize: '22px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                Energy Visualization
              </h2>
              <div style={{
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb'
              }}>
                {renderChart()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              {/* Appliances Section */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '2px solid #e5e7eb'
              }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  📱 Monitored Appliances ({reportData.appliances.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reportData.appliances.map((appliance, idx) => {
                    const colors = ['#4d8be9', '#28a745', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return (
                      <div
                        key={appliance.id}
                        style={{
                          padding: '16px',
                          background: `linear-gradient(135deg, ${colors[idx % colors.length]}10 0%, ${colors[idx % colors.length]}05 100%)`,
                          border: `2px solid ${colors[idx % colors.length]}30`,
                          borderRadius: '10px'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: colors[idx % colors.length]
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                              {appliance.name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {appliance.applianceType} • {appliance.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes Section */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '2px solid #e5e7eb'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  📝 Notes & Observations
                </h3>
                {reportData.notes ? (
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #fcd34d',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#78350f',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {reportData.notes}
                  </div>
                ) : (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    No notes added for this report
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ReportView;