import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import '../components/Layout.css';

function AddAppliance() {
  const { user, logout } = useUser();
  const [applianceType, setApplianceType] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [message, setMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const applianceOptions = [
    'Refrigerator',
    'Washer',
    'Dryer',
    'Oven',
    'Dishwasher',
    'Microwave',
    'Other'
  ];

  const locationOptions = [
    'Kitchen',
    'Living Room',
    'Bedroom',
    'Bathroom',
    'Garage',
    'Laundry Room',
    'Other'
  ];

  // Auto-hide toast after 3 seconds
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

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find indices for common column names
    const timeIndex = headers.findIndex(h => h.includes('time') || h.includes('timestamp') || h.includes('date'));
    const kwhIndex = headers.findIndex(h => h.includes('kwh') || h.includes('energy') || h.includes('power'));
    
    if (timeIndex === -1 || kwhIndex === -1) {
      throw new Error('CSV must contain time and kWh columns');
    }
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= Math.max(timeIndex, kwhIndex) + 1) {
        const time = values[timeIndex];
        const kwh = parseFloat(values[kwhIndex]);
        if (!isNaN(kwh)) {
          data.push({ time, kwh });
        }
      }
    }
    
    return data;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setMessage('Please upload a CSV file.');
      return;
    }
    
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCSV(event.target.result);
        setCsvData(parsed);
      } catch (error) {
        setMessage(`Error parsing CSV: ${error.message}`);
        setCsvData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!applianceType || !name || !location) {
      setMessage('Please fill out all required fields.');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setMessage('You must be signed in with Firebase to add an appliance.');
      return;
    }

    const applianceData = { 
      applianceType, 
      name, 
      location, 
      notes: notes || '',
      energyData: Array.isArray(csvData) ? csvData : [],
      createdAt: new Date().toISOString()
    };

    try {
      const appliancesRef = collection(db, 'users', uid, 'appliances');
      await addDoc(appliancesRef, applianceData);

      showToastMessage('Appliance added successfully!');
      setApplianceType('');
      setName('');
      setLocation('');
      setNotes('');
      setCsvFile(null);
      setCsvData(null);
      // Reset file input
      document.getElementById('csvFile').value = '';
    } catch (error) {
      console.error(error);
      setMessage('An error occurred while saving appliance.');
    }
  };

  return (
    <Layout activePage="Add Appliance" userName={user?.name || user?.email || 'User'} onLogout={logout}>
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
            Add New Appliance
          </h2>



          {/* Bottom Centered Toast Notification */}
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

          <form onSubmit={handleSubmit}>
            {/* Appliance Type */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="applianceType" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Appliance Type *
              </label>
              <select
                id="applianceType"
                value={applianceType}
                onChange={(e) => setApplianceType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  outlineColor: '#28a745',
                  backgroundColor: 'white',
                  color: '#1f2937', // ensure selected text is dark
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Type</option>
                {applianceOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="name" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Appliance Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter appliance name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  outlineColor: '#28a745', // set to green, or use '#d1d5db' for neutral
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Location */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="location" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Location *
              </label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  outlineColor: '#28a745',
                  backgroundColor: 'white',
                  color: '#1f2937', // ensure selected text is dark
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Location</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="notes" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Notes (Optional)
              </label>
              <textarea
                id="notes"
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

            {/* CSV File Upload */}
            <div style={{ marginBottom: '32px' }}>
              <label htmlFor="csvFile" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Upload Energy Data CSV (Optional)
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
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{
                    display: 'none'
                  }}
                />
                <label
                  htmlFor="csvFile"
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                >
                  {csvFile ? csvFile.name : 'Choose CSV File'}
                </label>
                <p style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  CSV should contain columns for time/timestamp and kWh/energy. 
                  First row should be headers.
                </p>
                {csvData && (
                  <p style={{
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#059669',
                    fontWeight: '500'
                  }}>
                    ✓ {csvFile.name} uploaded successfully
                  </p>
                )}
              </div>
            </div>



            {/* Submit Button */}
            <div>
              <button
                type="submit"
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
                Add Appliance
              </button>
            </div>

            {/* Submit message */}
            {message && (
            <div style={{
              padding: '12px 16px',
              marginTop: '24px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {message}
            </div>
          )}
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default AddAppliance;
