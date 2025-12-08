import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { parseCostCSV, saveCostData, loadCostData, deleteCostDataByDateRange, deleteAllCostData } from '../../services/costService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../components/Layout.css';

function CostData() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [costDataInfo, setCostDataInfo] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [costUploadError, setCostUploadError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRange, setDeleteRange] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadCostDataInfo();
  }, [user, navigate]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const loadCostDataInfo = async () => {
    try {
      const costData = await loadCostData();
      if (costData) {
        setCostDataInfo(costData);
      }
    } catch (error) {
      console.error('Error loading cost data info:', error);
    }
  };

  const handleCostFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCostUploadError('Please upload a CSV file');
      setCsvFile(null);
      return;
    }

    setCsvFile(file);
    setCostUploadError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      reader.onload = async (e) => {
        try {
          setUploadProgress(50);
          const csvContent = e.target.result;
          const costData = parseCostCSV(csvContent);
          
          if (costData.length === 0) {
            setCostUploadError('No valid cost data found in CSV. Expected format: dateRange,costPerKwh (e.g., "2024-01-01 to 2024-01-31,0.12")');
            setCsvFile(null);
            document.getElementById('costCsvFile').value = '';
            setIsUploading(false);
            setUploadProgress(0);
            clearInterval(progressInterval);
            return;
          }

          setUploadProgress(70);
          await saveCostData(costData);
          setUploadProgress(90);
          await loadCostDataInfo();
          setUploadProgress(100);
          
          showToastMessage('Cost data uploaded successfully!');
          
          setTimeout(() => {
            setCsvFile(null);
            document.getElementById('costCsvFile').value = '';
            setIsUploading(false);
            setUploadProgress(0);
          }, 500);
        } catch (error) {
          console.error('Error processing CSV:', error);
          setCostUploadError(error.message || 'Failed to process CSV file');
          setCsvFile(null);
          document.getElementById('costCsvFile').value = '';
          setIsUploading(false);
          setUploadProgress(0);
          clearInterval(progressInterval);
        }
      };
      reader.onerror = () => {
        setCostUploadError('Error reading file');
        setCsvFile(null);
        document.getElementById('costCsvFile').value = '';
        setIsUploading(false);
        setUploadProgress(0);
        clearInterval(progressInterval);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading cost file:', error);
      setCostUploadError('Failed to upload file');
      setCsvFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteRange = async (startDate, endDate) => {
    setDeleteRange({ start: startDate, end: endDate });
    setShowDeleteConfirm(true);
  };

  const handleDeleteAll = async () => {
    setDeleteRange(null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteRange) {
        await deleteCostDataByDateRange(deleteRange.start, deleteRange.end);
        showToastMessage(`Deleted cost data from ${deleteRange.start} to ${deleteRange.end}`);
      } else {
        await deleteAllCostData();
        showToastMessage('All cost data deleted successfully');
      }
      await loadCostDataInfo();
    } catch (error) {
      console.error('Error deleting cost data:', error);
      showToastMessage('Failed to delete cost data');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteRange(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteRange(null);
  };

  const prepareChartData = () => {
    if (!costDataInfo || !costDataInfo.data || costDataInfo.data.length === 0) {
      return [];
    }

    const monthlyData = {};
    costDataInfo.data.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { dates: [], costs: [] };
      }
      monthlyData[monthKey].dates.push(entry.date);
      monthlyData[monthKey].costs.push(entry.costPerKwh);
    });

    return Object.keys(monthlyData)
      .sort()
      .map(monthKey => {
        const monthData = monthlyData[monthKey];
        const avgCost = monthData.costs.reduce((sum, cost) => sum + cost, 0) / monthData.costs.length;
        return {
          month: monthKey,
          costPerKwh: parseFloat(avgCost.toFixed(2))
        };
      });
  };

  const getDateRanges = () => {
    if (!costDataInfo || !costDataInfo.data || costDataInfo.data.length === 0) {
      return [];
    }

    const ranges = [];
    let currentRange = null;

    const sortedData = [...costDataInfo.data].sort((a, b) => a.timestamp - b.timestamp);

    sortedData.forEach((entry, index) => {
      if (!currentRange) {
        currentRange = {
          start: entry.date,
          end: entry.date,
          cost: entry.costPerKwh,
          count: 1
        };
      } else if (entry.costPerKwh === currentRange.cost) {
        currentRange.end = entry.date;
        currentRange.count++;
      } else {
        ranges.push(currentRange);
        currentRange = {
          start: entry.date,
          end: entry.date,
          cost: entry.costPerKwh,
          count: 1
        };
      }

      if (index === sortedData.length - 1) {
        ranges.push(currentRange);
      }
    });

    return ranges;
  };

  const chartData = prepareChartData();
  const dateRanges = getDateRanges();

  return (
    <Layout activePage="Cost Data" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        {showToast && (
          <div style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '16px 24px',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            borderRadius: '8px',
            border: '1px solid #a7f3d0',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'fadeInBottom 0.3s ease-in',
            minWidth: '300px',
            textAlign: 'center'
          }}>
            {toastMessage}
          </div>
        )}

        {showDeleteConfirm && (
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
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                Confirm Deletion
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {deleteRange 
                  ? `Are you sure you want to delete cost data from ${deleteRange.start} to ${deleteRange.end}? This action cannot be undone.`
                  : 'Are you sure you want to delete ALL cost data? This action cannot be undone.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDelete}
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
                  onClick={confirmDelete}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
            Cost Data
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
            Upload a CSV file with your cost per kWh over time. This will be used to calculate costs in reports, dashboard, and filtering.
            New uploads will be merged with existing data, so you can add new date ranges without losing previous entries.
          </p>
          
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Upload Cost Data CSV
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '6px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: csvFile ? '#f0f9ff' : '#f9fafb',
                transition: 'all 0.2s'
              }}>
                <input
                  id="costCsvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCostFileUpload}
                  style={{
                    display: 'none'
                  }}
                  disabled={isUploading}
                />
                <label
                  htmlFor="costCsvFile"
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: isUploading ? '#9ca3af' : '#28a745',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    opacity: isUploading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !isUploading && (e.target.style.backgroundColor = '#218838')}
                  onMouseLeave={(e) => !isUploading && (e.target.style.backgroundColor = '#28a745')}
                >
                  {csvFile ? csvFile.name : 'Upload Cost Data'}
                </label>
                
                {isUploading && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      Uploading... {uploadProgress}% done
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        backgroundColor: '#28a745',
                        transition: 'width 0.3s ease',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                )}
                
                <p style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  CSV format: dateRange,costPerKwh (e.g., "2024-01-01 to 2024-01-31,0.12" or "2024-01-01,0.12")
                </p>
                <p style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  Use date ranges or single dates. Formats: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY
                </p>
              </div>
            </div>

            {costUploadError && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {costUploadError}
              </div>
            )}

            {(!costDataInfo || !costDataInfo.data || costDataInfo.data.length === 0) && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ fontSize: '13px', color: '#92400e' }}>
                  No cost data uploaded. Using default rate of $0.14 per kWh for calculations.
                </div>
              </div>
            )}
          </div>

          {costDataInfo && costDataInfo.data && costDataInfo.data.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px',
              marginTop: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937' 
                }}>
                  Current Cost Data
                </h3>
                <button
                  onClick={handleDeleteAll}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  Delete All Data
                </button>
              </div>
              
              {chartData.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        label={{ value: 'Cost per kWh ($)', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(2)}`, 'Cost per kWh']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="costPerKwh" 
                        stroke="#28a745" 
                        strokeWidth={2}
                        dot={{ fill: '#28a745', r: 4 }}
                        name="Cost per kWh"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginTop: '16px'
              }}>
                {costDataInfo.dateRange && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      Date Range
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                      {costDataInfo.dateRange.start} to {costDataInfo.dateRange.end}
                    </div>
                  </div>
                )}
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Total Entries
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                    {costDataInfo.data.length} days
                  </div>
                </div>
                {costDataInfo.updatedAt && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      Last Updated
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                      {new Date(costDataInfo.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  Cost Data Ranges
                </h4>
                
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}>
                  {dateRanges.map((range, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < dateRanges.length - 1 ? '1px solid #e5e7eb' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                          {range.start === range.end ? range.start : `${range.start} to ${range.end}`}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          ${range.cost.toFixed(4)} per kWh • {range.count} {range.count === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRange(range.start, range.end)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#fecaca';
                          e.target.style.borderColor = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#fee2e2';
                          e.target.style.borderColor = '#fecaca';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '24px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#166534' }}>
              Understanding kWh and Energy Costs
            </h3>
            <div style={{ fontSize: '14px', color: '#15803d', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>kWh (kilowatt-hour)</strong> is a unit of energy that measures how much electricity your appliances consume. 
                Think of it like miles for a car, the more you use, the more it costs.
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>Cost Calculation:</strong> Your energy bill is calculated by multiplying the energy you use (kWh) by the rate (cost per kWh). 
                For example, if you use 100 kWh in a month and your rate is $0.12 per kWh, your cost would be: <strong>100 × $0.12 = $12.00</strong>
              </p>
              <p style={{ margin: '0 0 0 0' }}>
                <strong>Why rates matter:</strong> Energy rates can change over time due to seasonal variations, market conditions, or utility pricing changes. 
                By uploading your historical rate data, the app can accurately calculate costs for different time periods, giving you more precise insights 
                into your energy spending patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CostData;