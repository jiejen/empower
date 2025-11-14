import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Calendar, PieChart, BarChart3, TrendingUp, FileText, Sparkles } from 'lucide-react';
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
  const [dateError, setDateError] = useState('');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Fetch appliances from Firestore
  useEffect(() => {
    const fetchAppliances = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error('Not authenticated');
        }
        
        const appliancesRef = collection(db, 'users', uid, 'appliances');
        const snapshot = await getDocs(appliancesRef);
        
        const appliancesData = [];
        snapshot.forEach((doc) => {
          appliancesData.push({ id: doc.id, ...doc.data() });
        });
        
        setAppliances(appliancesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appliances:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchAppliances();
    }
  }, [user]);

  const handleApplianceToggle = (applianceId) => {
    setSelectedAppliances(prev =>
      prev.includes(applianceId)
        ? prev.filter(id => id !== applianceId)
        : [...prev, applianceId]
    );
  };

  const validateDates = (start, end) => {
    const today = getTodayDate();
    
    if (start > today) {
      setDateError('Start date cannot be in the future');
      return false;
    }
    
    if (end > today) {
      setDateError('End date cannot be in the future');
      return false;
    }
    
    if (start > end) {
      setDateError('Start date cannot be after end date');
      return false;
    }
    
    setDateError('');
    return true;
  };

  const handleStartDateChange = (newStartDate) => {
    setStartDate(newStartDate);
    if (endDate) {
      validateDates(newStartDate, endDate);
    }
    // Auto-adjust end date if it's before the new start date
    if (endDate && newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  };

  const handleEndDateChange = (newEndDate) => {
    setEndDate(newEndDate);
    if (startDate) {
      validateDates(startDate, newEndDate);
    }
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
      <div style={{
        minHeight: 'calc(100vh - 96px)',
        background: 'linear-gradient(135deg, #f6f0b2 0%, #e8f5e9 45%, #dff3ff 100%)',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header Section */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '2px solid #f4f0a4'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4d8be9 0%, #28a745 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={28} color="white" />
              </div>
              <h1 style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #4d8be9 0%, #28a745 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Create Your Energy Report
              </h1>
            </div>
            <p style={{
              margin: 0,
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6'
            }}>
              Generate detailed insights about your appliance energy usage with beautiful visualizations
            </p>
          </div>

          {/* Main Form Container */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            {/* Report Name */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '10px'
              }}>
                <FileText size={18} color="#4d8be9" />
                Report Name *
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Monthly Kitchen Usage"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e6e6e6',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4d8be9'}
                onBlur={(e) => e.target.style.borderColor = '#e6e6e6'}
              />
            </div>

            {/* Date Range */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '28px',
              border: '2px solid #e0f2fe'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <Calendar size={20} color="#28a745" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: '#333' }}>
                  Date Range *
                </h3>
              </div>
              {dateError && (
                <div style={{
                  padding: '10px 12px',
                  marginBottom: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  {dateError}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#555',
                    marginBottom: '8px'
                  }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    max={getTodayDate()}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e6e6e6',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#555',
                    marginBottom: '8px'
                  }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={getTodayDate()}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    disabled={!startDate}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e6e6e6',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: !startDate ? '#f3f4f6' : 'white',
                      cursor: !startDate ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Select Appliances */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '12px'
              }}>
                Select Appliances * ({selectedAppliances.length} selected)
              </label>
              <div style={{
                border: '2px solid #e6e6e6',
                borderRadius: '12px',
                padding: '16px',
                maxHeight: '240px',
                overflowY: 'auto',
                background: '#fafafa'
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
                        padding: '14px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s',
                        backgroundColor: selectedAppliances.includes(appliance.id) ? '#e3f2fd' : 'white',
                        border: `2px solid ${selectedAppliances.includes(appliance.id) ? '#4d8be9' : '#e6e6e6'}`
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedAppliances.includes(appliance.id)) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedAppliances.includes(appliance.id)) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAppliances.includes(appliance.id)}
                        onChange={() => handleApplianceToggle(appliance.id)}
                        style={{
                          width: '20px',
                          height: '20px',
                          marginRight: '12px',
                          cursor: 'pointer',
                          accentColor: '#4d8be9'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                          {appliance.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {appliance.applianceType} • {appliance.location}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Chart Type Selection */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '12px'
              }}>
                Chart Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { value: 'line', label: 'Line Chart', icon: TrendingUp, color: '#4d8be9' },
                  { value: 'bar', label: 'Bar Chart', icon: BarChart3, color: '#28a745' },
                  { value: 'pie', label: 'Pie Chart', icon: PieChart, color: '#f59e0b' }
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = chartType === type.value;
                  return (
                    <label
                      key={type.value}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '20px 16px',
                        border: `3px solid ${isSelected ? type.color : '#e6e6e6'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? `${type.color}15` : 'white',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = type.color;
                          e.currentTarget.style.backgroundColor = `${type.color}08`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e6e6e6';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="chartType"
                        value={type.value}
                        checked={isSelected}
                        onChange={(e) => setChartType(e.target.value)}
                        style={{ display: 'none' }}
                      />
                      <Icon size={32} color={isSelected ? type.color : '#999'} strokeWidth={2.5} />
                      <span style={{
                        marginTop: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isSelected ? type.color : '#666'
                      }}>
                        {type.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Axis Configuration */}
            {chartType === 'pie' ? (
              <div style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '28px',
                border: '2px solid #fed7aa'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Compare By *
                </label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e6e6e6',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    fontWeight: '500'
                  }}
                >
                  <option value="power">Average Power (kW)</option>
                  <option value="cost">Total Cost ($)</option>
                </select>
                <p style={{
                  margin: '10px 0 0 0',
                  fontSize: '13px',
                  color: '#92400e',
                  fontStyle: 'italic'
                }}>
                  📊 Pie chart compares appliances by {yAxis === 'power' ? 'average power' : 'total cost'}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '28px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    Y-Axis (Value) *
                  </label>
                  <select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e6e6e6',
                      borderRadius: '8px',
                      fontSize: '15px',
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
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    X-Axis (Time) *
                  </label>
                  <select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e6e6e6',
                      borderRadius: '8px',
                      fontSize: '15px',
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
            )}

            {/* Notes */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '10px'
              }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or observations..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e6e6e6',
                  borderRadius: '10px',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4d8be9'}
                onBlur={(e) => e.target.style.borderColor = '#e6e6e6'}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #4d8be9 0%, #28a745 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(77, 139, 233, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(77, 139, 233, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(77, 139, 233, 0.3)';
              }}
            >
              ✨ Generate Report
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreateReport;