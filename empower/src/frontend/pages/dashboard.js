import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth } from '../../firebase';
import '../components/Layout.css';

function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAppliances();
    } else {
      navigate('/');
    }
  }, [navigate, user]);

  const fetchAppliances = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      const response = await fetch('/api/appliances', { headers: { 'x-user-uid': uid } });
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

  // Calculate energy statistics for an appliance
  const getEnergyStats = (appliance) => {
    if (!appliance.energyData || appliance.energyData.length === 0) {
      return null;
    }
    
    const data = appliance.energyData;
    const totalKwh = data.reduce((sum, point) => sum + (point.kwh || 0), 0);
    const avgKwh = totalKwh / data.length;
    const minKwh = Math.min(...data.map(p => p.kwh || 0));
    const maxKwh = Math.max(...data.map(p => p.kwh || 0));
    const firstTime = data[0]?.time;
    const lastTime = data[data.length - 1]?.time;
    
    return {
      totalKwh: totalKwh.toFixed(2),
      avgKwh: avgKwh.toFixed(2),
      minKwh: minKwh.toFixed(2),
      maxKwh: maxKwh.toFixed(2),
      dataPoints: data.length,
      firstTime,
      lastTime
    };
  };

  return (
    <Layout activePage="Dashboard" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1400px' }}>
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
            Dashboard
          </h2>
        
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading appliances...
            </div>
          )}
        
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}
        
          {!loading && !error && appliances.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No appliances yet. Add one to get started!
            </div>
          )}
        
          {!loading && !error && appliances.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '24px', 
              marginTop: '24px' 
            }}>
              {appliances.map((appliance) => {
                const stats = getEnergyStats(appliance);
                
                return (
                  <div 
                    key={appliance.id} 
                    style={{ 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      padding: '24px',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                        {appliance.name}
                      </h3>
                      {stats && (
                        <span style={{
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          {stats.dataPoints} pts
                        </span>
                      )}
                    </div>
                
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#6b7280',
                        marginRight: '8px'
                      }}>Type:</span>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#1f2937',
                        fontWeight: '500'
                      }}>
                        {appliance.applianceType}
                      </span>
                    </div>
                
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#6b7280',
                        marginRight: '8px'
                      }}>Location:</span>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#1f2937',
                        fontWeight: '500'
                      }}>
                        {appliance.location}
                      </span>
                    </div>
                
                    {appliance.notes && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ 
                          fontSize: '13px', 
                          color: '#6b7280',
                          marginRight: '8px'
                        }}>Notes:</span>
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          {appliance.notes}
                        </span>
                      </div>
                    )}
                
                    {stats && (
                      <>
                        <div style={{ 
                          borderTop: '1px solid #e5e7eb',
                          marginTop: '16px',
                          paddingTop: '16px'
                        }}>
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: '#6b7280',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Energy Data
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              backgroundColor: '#f0f9ff',
                              padding: '8px',
                              borderRadius: '6px'
                            }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Total</div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                                {stats.totalKwh} kWh
                              </div>
                            </div>
                            <div style={{
                              backgroundColor: '#f0fdf4',
                              padding: '8px',
                              borderRadius: '6px'
                            }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Average</div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                                {stats.avgKwh} kWh
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '8px'
                          }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Min</div>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {stats.minKwh} kWh
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Max</div>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {stats.maxKwh} kWh
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                
                    {!stats && (
                      <div style={{ 
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#9ca3af',
                          textAlign: 'center'
                        }}>
                          No energy data uploaded
                        </div>
                      </div>
                    )}
                
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af', 
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      Added: {new Date(appliance.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;