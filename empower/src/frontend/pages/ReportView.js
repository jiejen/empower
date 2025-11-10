import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../components/Layout.css';

function ReportView() {
  const { user, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const reportData = location.state?.reportData;

  useEffect(() => {
    if (!reportData) {
      navigate('/create-report');
      return;
    }

    // Process the energy data based on selected parameters
    let processedData;
    
    if (reportData.chartType === 'pie') {
      // For pie chart, compare appliances
      processedData = processApplianceComparison(
        reportData.appliances,
        reportData.startDate,
        reportData.endDate,
        reportData.yAxis
      );
    } else {
      // For line and bar charts, show data over time
      processedData = processEnergyData(
        reportData.appliances,
        reportData.startDate,
        reportData.endDate,
        reportData.xAxis,
        reportData.yAxis
      );
    }
    
    setChartData(processedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, navigate]);

  const processApplianceComparison = (appliances, startDate, endDate, yAxis) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const costPerKwh = 0.12; // $0.12 per kWh

    const comparisonData = appliances.map(appliance => {
      let totalValue = 0;
      let dataPointCount = 0;

      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          // Filter by date range
          if (pointDate >= start && pointDate <= end) {
            if (yAxis === 'power') {
              // For power, calculate average
              totalValue += dataPoint.kwh;
            } else {
              // For cost, calculate total
              totalValue += dataPoint.kwh * costPerKwh;
            }
            dataPointCount++;
          }
        });
      }

      // For power (average), divide by count; for cost (total), use sum
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
    const costPerKwh = 0.12; // $0.12 per kWh

    // Combine all appliances' energy data
    const allData = [];
    
    appliances.forEach(appliance => {
      if (appliance.energyData && Array.isArray(appliance.energyData)) {
        appliance.energyData.forEach(dataPoint => {
          const pointDate = new Date(dataPoint.time);
          
          // Filter by date range
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

    // Sort by time
    allData.sort((a, b) => a.time - b.time);

    // Group data based on xAxis selection
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

    // Convert to array and calculate averages
    return Object.values(grouped).map(group => ({
      name: group.name,
      value: parseFloat((group.value / group.count).toFixed(2))
    }));
  };

  const renderChart = () => {
    if (!reportData || chartData.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          No data available for the selected date range and appliances.
        </div>
      );
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const yAxisLabel = reportData.yAxis === 'power' ? 'Power (kW)' : 'Cost ($)';

    switch (reportData.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name={yAxisLabel} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name={yAxisLabel} />
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
                outerRadius={120}
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

  if (!reportData) {
    return null;
  }

  return (
    <Layout activePage="Create Report" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1200px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          {/* Report Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#1f2937' }}>
                {reportData.reportName}
              </h2>
              <button
                onClick={() => navigate('/create-report')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Create New Report
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', color: '#6b7280', fontSize: '14px' }}>
              <span>
                <strong>Date Range:</strong> {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
              </span>
              <span>
                <strong>Chart Type:</strong> {reportData.chartType.charAt(0).toUpperCase() + reportData.chartType.slice(1)}
              </span>
              <span>
                <strong>Appliances:</strong> {reportData.appliances.length}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            {renderChart()}
          </div>

          {/* Appliance List */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Selected Appliances
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {reportData.appliances.map((appliance) => (
                <div
                  key={appliance.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>{appliance.name}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {appliance.applianceType} • {appliance.location}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {reportData.notes && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Notes
              </h3>
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#374151',
                whiteSpace: 'pre-wrap'
              }}>
                {reportData.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ReportView;