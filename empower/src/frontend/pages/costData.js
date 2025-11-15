import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { parseCostCSV, saveCostData, loadCostData } from '../../services/costService';
import '../components/Layout.css';

function CostData() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [costDataInfo, setCostDataInfo] = useState(null);
  const [uploadingCost, setUploadingCost] = useState(false);
  const [costUploadError, setCostUploadError] = useState('');
  const [costUploadSuccess, setCostUploadSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadCostDataInfo();
  }, [user, navigate]);

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
      return;
    }

    setUploadingCost(true);
    setCostUploadError('');
    setCostUploadSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target.result;
          const costData = parseCostCSV(csvContent);
          
          if (costData.length === 0) {
            setCostUploadError('No valid cost data found in CSV. Expected format: date,costPerKwh');
            setUploadingCost(false);
            return;
          }

          await saveCostData(costData);
          await loadCostDataInfo();
          setCostUploadSuccess(`Successfully uploaded ${costData.length} cost data entries`);
          
          // Clear success message after 5 seconds
          setTimeout(() => setCostUploadSuccess(''), 5000);
        } catch (error) {
          console.error('Error processing CSV:', error);
          setCostUploadError(error.message || 'Failed to process CSV file');
        } finally {
          setUploadingCost(false);
        }
      };
      reader.onerror = () => {
        setCostUploadError('Error reading file');
        setUploadingCost(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading cost file:', error);
      setCostUploadError('Failed to upload file');
      setUploadingCost(false);
    }
  };

  return (
    <Layout activePage="Cost Data" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
            Energy Cost Data
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
            Upload a CSV file with your cost per kWh over time. This will be used to calculate costs in reports, dashboard, and filtering.
          </p>
          
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                CSV File Format
              </label>
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                fontFamily: 'monospace',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                date,costPerKwh<br/>
                2024-01-01,0.12<br/>
                2024-02-01,0.13<br/>
                2024-03-01,0.14
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                Date formats supported: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCostFileUpload}
                disabled={uploadingCost}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: uploadingCost ? '#f3f4f6' : 'white',
                  cursor: uploadingCost ? 'not-allowed' : 'pointer'
                }}
              />
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

            {costUploadSuccess && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '12px',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {costUploadSuccess}
              </div>
            )}

            {uploadingCost && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '12px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Uploading and processing CSV...
              </div>
            )}

            {costDataInfo && costDataInfo.data && costDataInfo.data.length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                  Current Cost Data
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Entries:</strong> {costDataInfo.data.length}
                </div>
                {costDataInfo.dateRange && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                    <strong>Date Range:</strong> {costDataInfo.dateRange.start} to {costDataInfo.dateRange.end}
                  </div>
                )}
                {costDataInfo.updatedAt && (
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    <strong>Last Updated:</strong> {new Date(costDataInfo.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {(!costDataInfo || !costDataInfo.data || costDataInfo.data.length === 0) && !uploadingCost && (
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
        </div>
      </div>
    </Layout>
  );
}

export default CostData;

