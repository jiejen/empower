import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import '../components/Layout.css'; // Import the CSS

function Dashboard() {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppliances();
  }, []);

  const fetchAppliances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/appliances');
      if (response.ok) {
        const data = await response.json();
        setAppliances(data);
        setError(null);
      } else {
        setError('Failed to load appliances');
      }
    } catch (err) {
      console.error('Error fetching appliances:', err);
      setError('An error occurred while loading appliances');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout activePage="Dashboard" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h2>Dashboard</h2>
        
        {loading && <p>Loading appliances...</p>}
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {!loading && !error && appliances.length === 0 && (
          <p>No appliances yet. Add one to get started!</p>
        )}
        
        {!loading && !error && appliances.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '20px', 
            marginTop: '24px' 
          }}>
            {appliances.map((appliance) => (
              <div 
                key={appliance.id} 
                style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '20px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <h3 style={{ marginTop: '0', marginBottom: '12px', color: '#333' }}>
                  {appliance.name}
                </h3>
                
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#666' }}>Type:</strong>{' '}
                  <span style={{ color: '#333' }}>{appliance.applianceType}</span>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#666' }}>Location:</strong>{' '}
                  <span style={{ color: '#333' }}>{appliance.location}</span>
                </div>
                
                {appliance.notes && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#666' }}>Notes:</strong>{' '}
                    <span style={{ color: '#333' }}>{appliance.notes}</span>
                  </div>
                )}
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#999', 
                  marginTop: '12px',
                  borderTop: '1px solid #eee',
                  paddingTop: '8px'
                }}>
                  Added: {new Date(appliance.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Dashboard;