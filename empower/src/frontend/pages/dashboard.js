import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import '../components/Layout.css'; // Import the CSS

function Dashboard() {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAppliance, setExpandedAppliance] = useState(null);

  const calculateEnergyStats = (energyData) => {
    if (!energyData || energyData.length === 0) return null;
    
    const kwhValues = energyData.map(d => parseFloat(d.kwh)).filter(v => !isNaN(v));
    if (kwhValues.length === 0) return null;

    const totalKwh = kwhValues.reduce((sum, val) => sum + val, 0);
    const avgKwh = totalKwh / kwhValues.length;
    const minKwh = Math.min(...kwhValues);
    const maxKwh = Math.max(...kwhValues);
    const dataPoints = energyData.length;

    return { totalKwh, avgKwh, minKwh, maxKwh, dataPoints };
  };

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

                {/* Energy Data Stats */}
                {appliance.energyData && appliance.energyData.length > 0 && (
                  <div style={{ 
                    marginBottom: '8px', 
                    padding: '8px', 
                    backgroundColor: '#f0f7ff',
                    borderRadius: '4px',
                    border: '1px solid #d0e7ff'
                  }}>
                    <strong style={{ color: '#0066cc', display: 'block', marginBottom: '4px' }}>
                      Energy Data Available
                    </strong>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      📊 {appliance.energyData.length} data points
                      {appliance.dataLastUploaded && (
                        <span style={{ display: 'block', marginTop: '4px' }}>
                          Last uploaded: {new Date(appliance.dataLastUploaded).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setExpandedAppliance(expandedAppliance === appliance.id ? null : appliance.id)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: 'white',
                        border: '1px solid #0066cc',
                        borderRadius: '4px',
                        color: '#0066cc',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedAppliance === appliance.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                )}

                {/* Expanded Energy Data */}
                {expandedAppliance === appliance.id && appliance.energyData && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Energy Consumption Data:</strong>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Timestamp</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>kWh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appliance.energyData.slice(0, 20).map((data, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '6px' }}>{data.timestamp}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                              {parseFloat(data.kwh).toFixed(2)} kWh
                            </td>
                          </tr>
                        ))}
                        {appliance.energyData.length > 20 && (
                          <tr>
                            <td colSpan="2" style={{ padding: '6px', textAlign: 'center', color: '#666' }}>
                              ... and {appliance.energyData.length - 20} more data points
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    
                    {/* Statistics */}
                    {(() => {
                      const stats = calculateEnergyStats(appliance.energyData);
                      if (!stats) return null;
                      return (
                        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                          <strong style={{ display: 'block', marginBottom: '4px' }}>Statistics:</strong>
                          <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                            <div>Total: {stats.totalKwh.toFixed(2)} kWh</div>
                            <div>Average: {stats.avgKwh.toFixed(2)} kWh</div>
                            <div>Min: {stats.minKwh.toFixed(2)} kWh</div>
                            <div>Max: {stats.maxKwh.toFixed(2)} kWh</div>
                          </div>
                        </div>
                      );
                    })()}
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