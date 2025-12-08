import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import '../components/Layout.css';

function TrashAppliances() {
  const { user, loading: authLoading, logout } = useUser();
  const navigate = useNavigate();
  const [trashedAppliances, setTrashedAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchTrashedAppliances();
    } else {
      navigate('/');
    }
  }, [navigate, user, authLoading]);

  const fetchTrashedAppliances = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const appliancesRef = collection(db, 'users', uid, 'appliances');
      const snapshot = await getDocs(appliancesRef);
      const appliancesData = [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.deleted && data.deletedAt) {
          const deletedDate = new Date(data.deletedAt);
          if (deletedDate > thirtyDaysAgo) {
            appliancesData.push({ id: docSnap.id, ...data });
          }
        }
      });

      appliancesData.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

      setTrashedAppliances(appliancesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching trashed appliances:', err);
      setError('An error occurred while loading trashed appliances');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (applianceId) => {
    try {
      setProcessingId(applianceId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const applianceRef = doc(db, 'users', uid, 'appliances', applianceId);
      await updateDoc(applianceRef, {
        deleted: false,
        deletedAt: null
      });

      setTrashedAppliances(trashedAppliances.filter(a => a.id !== applianceId));
      setError(null);
    } catch (err) {
      console.error('Error restoring appliance:', err);
      setError('An error occurred while restoring appliance');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (applianceId) => {
    if (!window.confirm('Permanently delete this appliance? This action cannot be undone and the appliance will be lost forever.')) {
      return;
    }

    try {
      setProcessingId(applianceId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const applianceRef = doc(db, 'users', uid, 'appliances', applianceId);
      await deleteDoc(applianceRef);

      setTrashedAppliances(trashedAppliances.filter(a => a.id !== applianceId));
      setError(null);
    } catch (err) {
      console.error('Error permanently deleting appliance:', err);
      setError('An error occurred while permanently deleting appliance');
    } finally {
      setProcessingId(null);
    }
  };

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

  const getDaysUntilPermanentDelete = (deletedAt) => {
    if (!deletedAt) return 0;
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const daysElapsed = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysElapsed);
  };

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

  const ApplianceCard = ({ appliance }) => {
    const isProcessing = processingId === appliance.id;
    const daysRemaining = getDaysUntilPermanentDelete(appliance.deletedAt);
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
          transition: 'box-shadow 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }
        }}
      >
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          <button
            onClick={() => handleRestore(appliance.id)}
            disabled={isProcessing}
            style={{
              padding: '6px 12px',
              backgroundColor: isProcessing ? '#9ca3af' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#218838';
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#28a745';
              }
            }}
          >
            Restore
          </button>

          <button
            onClick={() => handlePermanentDelete(appliance.id)}
            disabled={isProcessing}
            style={{
              padding: '6px 12px',
              backgroundColor: isProcessing ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#dc2626';
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) {
                e.target.style.backgroundColor = '#ef4444';
              }
            }}
          >
            Delete Forever
          </button>
        </div>

        <div style={{ marginBottom: '16px', paddingRight: '180px' }}>
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
                backgroundColor: '#f0fdf4',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                  Total Energy Consumption
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#059669', 
                  marginBottom: '4px' 
                }}>
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

        <div style={{ 
          fontSize: '12px', 
          color: '#9ca3af', 
          marginTop: '8px'
        }}>
          Deleted: {formatDateTime(appliance.deletedAt)}
        </div>

        <div style={{
          marginTop: '16px',
          padding: '10px 12px',
          backgroundColor: daysRemaining <= 7 ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${daysRemaining <= 7 ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '6px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: daysRemaining <= 7 ? '#991b1b' : '#166534',
            fontWeight: '500'
          }}>
            {daysRemaining === 0 
              ? 'Will be permanently deleted today' 
              : `Will be permanently deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    );
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '25px', 
                fontWeight: '600', 
                color: '#1f2937' 
              }}>
                Deleted Appliances
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Appliances are kept for 30 days before being permanently deleted
              </p>
            </div>
            <button
              onClick={() => navigate('/appliances')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Back to Appliances
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading trashed appliances...
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

          {!loading && !error && trashedAppliances.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                No appliances in trash
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Deleted appliances will appear here for 30 days
              </p>
            </div>
          )}

          {!loading && !error && trashedAppliances.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '24px', 
              marginTop: '24px' 
            }}>
              {trashedAppliances.map((appliance) => (
                <ApplianceCard key={appliance.id} appliance={appliance} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default TrashAppliances;
