import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
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
  const [dateError, setDateError] = useState('');
  const [applianceValidationError, setApplianceValidationError] = useState('');

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

  // Clear validation error when dates are cleared
  useEffect(() => {
    if (!startDate || !endDate) {
      setApplianceValidationError('');
    }
  }, [startDate, endDate]);

  // Check if an appliance has data for the selected date range
  const applianceHasDataForDateRange = (appliance, start, end) => {
    if (!start || !end) return true; // If dates not selected, allow selection
    
    if (!appliance.energyData || !Array.isArray(appliance.energyData) || appliance.energyData.length === 0) {
      return false;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    // Set end date to end of day for inclusive comparison
    endDate.setHours(23, 59, 59, 999);

    // Check if any data point falls within the date range
    return appliance.energyData.some(dataPoint => {
      if (!dataPoint.time) return false;
      const pointDate = new Date(dataPoint.time);
      return pointDate >= startDate && pointDate <= endDate;
    });
  };

  const handleApplianceToggle = (applianceId) => {
    // Don't allow toggling if dates are selected and appliance doesn't have data
    if (startDate && endDate) {
      const appliance = appliances.find(app => app.id === applianceId);
      if (appliance && !applianceHasDataForDateRange(appliance, startDate, endDate)) {
        setApplianceValidationError(`"${appliance.name}" does not have data for the selected date range.`);
        return;
      }
    }
    
    setApplianceValidationError('');
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
    
    // Clear selected appliances that don't have data for the new date range
    if (newStartDate && endDate) {
      const validAppliances = selectedAppliances.filter(appId => {
        const appliance = appliances.find(app => app.id === appId);
        return appliance && applianceHasDataForDateRange(appliance, newStartDate, endDate);
      });
      
      if (validAppliances.length !== selectedAppliances.length) {
        setSelectedAppliances(validAppliances);
        setApplianceValidationError('Some selected appliances were removed because they don\'t have data for the selected date range.');
      } else {
        setApplianceValidationError('');
      }
    }
  };

  const handleEndDateChange = (newEndDate) => {
    setEndDate(newEndDate);
    if (startDate) {
      validateDates(startDate, newEndDate);
    }
    
    // Clear selected appliances that don't have data for the new date range
    if (startDate && newEndDate) {
      const validAppliances = selectedAppliances.filter(appId => {
        const appliance = appliances.find(app => app.id === appId);
        return appliance && applianceHasDataForDateRange(appliance, startDate, newEndDate);
      });
      
      if (validAppliances.length !== selectedAppliances.length) {
        setSelectedAppliances(validAppliances);
        setApplianceValidationError('Some selected appliances were removed because they don\'t have data for the selected date range.');
      } else {
        setApplianceValidationError('');
      }
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

    // Validate that all selected appliances have data for the date range
    const selectedApplianceData = appliances.filter(app => 
      selectedAppliances.includes(app.id)
    );

    const appliancesWithoutData = selectedApplianceData.filter(app => 
      !applianceHasDataForDateRange(app, startDate, endDate)
    );

    if (appliancesWithoutData.length > 0) {
      const applianceNames = appliancesWithoutData.map(app => app.name).join(', ');
      alert(`The following appliances do not have data for the selected date range: ${applianceNames}. Please select different appliances or adjust the date range.`);
      return;
    }

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
      <div style={{ padding: '32px', maxWidth: '1000px' }}>
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
            Create Report
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
              placeholder="e.g., Monthly Kitchen Usage"
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
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Date Range *
            </label>
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
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '6px'
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
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
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
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '6px'
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
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
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
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Select Appliances * ({selectedAppliances.length} selected)
            </label>
            {applianceValidationError && (
              <div style={{
                padding: '10px 12px',
                marginBottom: '12px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {applianceValidationError}
              </div>
            )}
            {startDate && endDate && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                backgroundColor: '#e0f2fe',
                color: '#0c4a6e',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                Only appliances with data for the selected date range can be selected.
              </div>
            )}
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '240px',
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
                  No appliances available. Please add appliances first. <br/><br/>
                    <button
                      onClick={() => navigate('/add-appliance')}
                    style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                        + Add Appliance
                    </button>
                </div>
              ) : (
                appliances.map((appliance) => {
                  const hasData = !startDate || !endDate || applianceHasDataForDateRange(appliance, startDate, endDate);
                  const isSelected = selectedAppliances.includes(appliance.id);
                  const isDisabled = startDate && endDate && !hasData;
                  
                  return (
                    <label
                      key={appliance.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        transition: 'all 0.2s',
                        backgroundColor: isDisabled 
                          ? '#f3f4f6' 
                          : isSelected 
                            ? '#dbeafe' 
                            : 'white',
                        border: `1px solid ${isDisabled 
                          ? '#e5e7eb' 
                          : isSelected 
                            ? '#3b82f6' 
                            : '#e5e7eb'}`,
                        opacity: isDisabled ? 0.6 : 1
                      }}
                      title={isDisabled ? 'This appliance does not have data for the selected date range' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleApplianceToggle(appliance.id)}
                        disabled={isDisabled}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginRight: '12px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          accentColor: '#3b82f6'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '15px', 
                          fontWeight: '500', 
                          color: isDisabled ? '#9ca3af' : '#1f2937', 
                          marginBottom: '2px' 
                        }}>
                          {appliance.name}
                          {isDisabled && (
                            <span style={{ 
                              marginLeft: '8px', 
                              fontSize: '12px', 
                              color: '#dc2626',
                              fontWeight: '400'
                            }}>
                              (No data for date range)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: isDisabled ? '#9ca3af' : '#6b7280' }}>
                          {appliance.applianceType} • {appliance.location}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Chart Type Selection */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { value: 'line', label: 'Line Chart' },
                { value: 'bar', label: 'Bar Chart' },
                { value: 'pie', label: 'Pie Chart' }
              ].map((type) => {
                const isSelected = chartType === type.value;
                return (
                  <label
                    key={type.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      border: `2px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#dbeafe' : 'white',
                      transition: 'all 0.2s',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: isSelected ? '#1e40af' : '#374151'
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
                    {type.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Axis Configuration */}
          {chartType === 'pie' ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Compare By *
              </label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '15px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="power">Average Power (kW)</option>
                <option value="cost">Total Cost ($)</option>
              </select>
            </div>
          ) : (
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
                  Y-Axis (Value) *
                </label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
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
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  X-Axis (Time) *
                </label>
                <select
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
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
              placeholder="Add any additional notes or observations..."
              rows="4"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '15px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            style={{
              padding: '12px 32px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Generate Report
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default CreateReport;