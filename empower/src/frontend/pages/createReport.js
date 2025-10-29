import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import '../components/Layout.css';

function CreateReport() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [reportName, setReportName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAppliances, setSelectedAppliances] = useState([]);
  const [chartType, setChartType] = useState('line');
  const [yAxis, setYAxis] = useState('power');
  const [xAxis, setXAxis] = useState('hour');
  const [notes, setNotes] = useState('');
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch appliances from backend for current Firebase user
  useEffect(() => {
    const fetchAppliances = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        const response = await fetch('/api/appliances', { headers: { 'x-user-uid': uid } });
        if (!response.ok) {
          throw new Error('Failed to fetch appliances');
        }
        const data = await response.json();
        setAppliances(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appliances:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAppliances();
  }, []);

  const handleApplianceToggle = (applianceId) => {
    setSelectedAppliances(prev =>
      prev.includes(applianceId)
        ? prev.filter(id => id !== applianceId)
        : [...prev, applianceId]
    );
  };

  const handleSubmit = () => {
    // Validation
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    if (selectedAppliances.length === 0) {
      alert('Please select at least one appliance');
      return;
    }

    // Get selected appliance data
    const selectedApplianceData = appliances.filter(app => 
      selectedAppliances.includes(app.id)
    );

    // Create report data object
    const reportData = {
      reportName,
      startDate,
      endDate,
      appliances: selectedApplianceData,
      chartType,
      yAxis,
      xAxis,
      notes,
      createdAt: new Date().toISOString()
    };

    // Navigate to report view with data
    navigate('/report-view', { state: { reportData } });
  };

  return (
    <Layout activePage="Create Report" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '900px' }}>
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
            Create New Report
          </h2>

          {/* Report Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Report Name *
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Enter report name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Date Range */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px',
            marginBottom: '24px' 
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={!startDate}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: !startDate ? '#f3f4f6' : 'white',
                  cursor: !startDate ? 'not-allowed' : 'pointer'
                }}
              />
            </div>
          </div>

          {/* Select Appliances */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Select Appliances *
            </label>
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '16px',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#f9fafb'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  Loading appliances...
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#dc2626' }}>
                  Error loading appliances: {error}
                </div>
              ) : appliances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  No appliances available. Please add appliances first.
                </div>
              ) : (
                appliances.map((appliance) => (
                  <label
                    key={appliance.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAppliances.includes(appliance.id)}
                      onChange={() => handleApplianceToggle(appliance.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        marginRight: '12px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '15px', color: '#374151' }}>
                      {appliance.name} - {appliance.location}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Chart Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Chart Type *
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['line', 'bar', 'pie'].map((type) => (
                <label
                  key={type}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    border: `2px solid ${chartType === type ? '#3b82f6' : '#d1d5db'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: chartType === type ? '#eff6ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="chartType"
                    value={type}
                    checked={chartType === type}
                    onChange={(e) => setChartType(e.target.value)}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ 
                    fontSize: '15px', 
                    fontWeight: '500',
                    color: chartType === type ? '#3b82f6' : '#374151',
                    textTransform: 'capitalize'
                  }}>
                    {type} Chart
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Axis Selection */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px',
            marginBottom: '24px' 
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Plot Y-Value *
              </label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="power">Power (kW)</option>
                <option value="cost">Cost ($)</option>
              </select>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Plot X-Value *
              </label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or comments..."
              rows="4"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              onClick={handleSubmit}
              style={{
                padding: '12px 32px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreateReport;