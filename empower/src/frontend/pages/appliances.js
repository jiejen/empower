import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth } from '../../firebase';
import '../components/Layout.css';

function Appliances() {
  const { user, loading: authLoading, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const applianceRefs = useRef({});

  useEffect(() => {
    if (authLoading) return; // Wait for auth to complete
    
    if (user) {
      fetchAppliances();
    } else {
      navigate('/');
    }
  }, [navigate, user, authLoading]);

  // Handle highlight effect from dashboard navigation
  useEffect(() => {
    if (location.state?.highlightId && appliances.length > 0) {
      const id = location.state.highlightId;
      setHighlightId(id);
      
      // Scroll to the appliance
      setTimeout(() => {
        if (applianceRefs.current[id]) {
          applianceRefs.current[id].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightId(null);
        navigate(location.pathname, { replace: true, state: {} });
      }, 2000);
    }
  }, [location.state, appliances, navigate, location.pathname]);

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

  const handleDelete = async (applianceId) => {
    if (!window.confirm('Are you sure you want to delete this appliance? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(applianceId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/appliances/${applianceId}`, {
        method: 'DELETE',
        headers: { 'x-user-uid': uid }
      });

      if (response.ok || response.status === 204) {
        // Remove the appliance from the local state
        setAppliances(appliances.filter(a => a.id !== applianceId));
        setError(null);
      } else {
        setError('Failed to delete appliance');
      }
    } catch (err) {
      console.error('Error deleting appliance:', err);
      setError('An error occurred while deleting appliance');
    } finally {
      setDeletingId(null);
    }
  };

  // Format date/time for display
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateTimeString;
    }
  };

  // Calculate time period description
  const getTimePeriodDescription = (firstTime, lastTime) => {
    if (!firstTime || !lastTime) return '';
    try {
      const first = new Date(firstTime);
      const last = new Date(lastTime);
      const diffMs = last - first;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      }
    } catch (e) {
      return '';
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
    const timePeriod = getTimePeriodDescription(firstTime, lastTime);
    
    return {
      totalKwh: totalKwh.toFixed(2),
      avgKwh: avgKwh.toFixed(2),
      minKwh: minKwh.toFixed(2),
      maxKwh: maxKwh.toFixed(2),
      firstTime,
      lastTime,
      timePeriod,
      dataPoints: data.length
    };
  };

  return (
    <Layout activePage="Appliances" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1400px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1f2937' 
            }}>
              Appliances
            </h2>
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
              fontWeight: '500',
              marginBottom: '24px'
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
                const isDeleting = deletingId === appliance.id;
                const isHighlighted = highlightId === appliance.id;
                
                return (
                  <div 
                    key={appliance.id}
                    ref={(el) => applianceRefs.current[appliance.id] = el}
                    style={{ 
                      border: isHighlighted ? '1px solid #6b7280' : '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      padding: '24px',
                      backgroundColor: isHighlighted ? '#f9fafb' : '#fff',
                      boxShadow: isHighlighted ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isHighlighted) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isHighlighted) {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }
                    }}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(appliance.id)}
                      disabled={isDeleting}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        padding: '6px 10px',
                        backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        opacity: isDeleting ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeleting) {
                          e.target.style.backgroundColor = '#dc2626';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDeleting) {
                          e.target.style.backgroundColor = '#ef4444';
                        }
                      }}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>

                    <div style={{ marginBottom: '16px', paddingRight: '80px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                        {appliance.name}
                      </h3>
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
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Energy Consumption Data
                          </div>
                          
                          <div style={{
                            backgroundColor: '#f0f9ff',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                              Total Energy Consumption
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                              {stats.totalKwh} kWh
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              Over {stats.timePeriod} ({formatDateTime(stats.firstTime)} to {formatDateTime(stats.lastTime)})
                            </div>
                          </div>
                          
                          <div style={{
                            backgroundColor: '#f0fdf4',
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '12px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                              Average per Reading
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                              {stats.avgKwh} kWh
                            </div>
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '12px'
                          }}>
                            <div style={{
                              backgroundColor: '#f9fafb',
                              padding: '10px',
                              borderRadius: '6px'
                            }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                Minimum Reading
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {stats.minKwh} kWh
                              </div>
                            </div>
                            <div style={{
                              backgroundColor: '#f9fafb',
                              padding: '10px',
                              borderRadius: '6px'
                            }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                Maximum Reading
                              </div>
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

export default Appliances;
