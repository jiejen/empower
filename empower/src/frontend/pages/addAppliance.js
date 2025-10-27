import { useState } from 'react';
import { Layout } from '../components/layout';
import '../components/Layout.css';

function AddAppliance() {
  const [applianceType, setApplianceType] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [csvFile, setCsvFile] = useState(null);

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


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!applianceType || !name || !location) {
      setMessage('Please fill out all required fields.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('applianceType', applianceType);
      formData.append('name', name);
      formData.append('location', location);
      formData.append('notes', notes);
      if (csvFile) {
        formData.append('csv', csvFile);
      }

      const response = await fetch('/api/appliances', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('Appliance added successfully!');
        setApplianceType('');
        setName('');
        setLocation('');
        setNotes('');
        setCsvFile(null);
      } else {
        setMessage('Failed to add appliance.');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred while saving appliance.');
    }
  };

  return (
    <Layout activePage="Add Appliance" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h2>Add Appliance</h2>
        {message && <p style={{ color: message.includes('success') ? 'green' : 'red' }}>{message}</p>}
        
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '400px',
          }}
        >
          {/* Appliance Type */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="applianceType">Appliance Type:</label>
            <select
              id="applianceType"
              value={applianceType}
              onChange={(e) => setApplianceType(e.target.value)}
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Appliance Name"
            />
          </div>

          {/* Location */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="location">Location:</label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="notes">Notes (Optional):</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra notes..."
            />
          </div>

          {/* CSV Energy Data Upload */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="csvFile">Upload Energy Data CSV (Optional):</label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              style={{ fontSize: '14px' }}
            />
            <small style={{ color: '#666', marginTop: '4px' }}>
              CSV should have columns: timestamp, kwh
            </small>
          </div>

          <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Add Appliance
          </button>
        </form>
      </div>
    </Layout>
  );
}

export default AddAppliance;
