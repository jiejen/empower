import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import '../components/Layout.css';

function TrashReports() {
  const { user, loading: authLoading, logout } = useUser();
  const navigate = useNavigate();
  const [trashedReports, setTrashedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchTrashedReports();
    } else {
      navigate('/');
    }
  }, [navigate, user, authLoading]);

  const fetchTrashedReports = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const reportsRef = collection(db, 'users', uid, 'reports');
      const snapshot = await getDocs(reportsRef);
      const reportsData = [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.deleted && data.deletedAt) {
          const deletedDate = new Date(data.deletedAt);
          if (deletedDate > thirtyDaysAgo) {
            reportsData.push({ id: docSnap.id, ...data });
          }
        }
      });

      reportsData.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

      setTrashedReports(reportsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching trashed reports:', err);
      setError('An error occurred while loading trashed reports');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (reportId) => {
    try {
      setProcessingId(reportId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const reportRef = doc(db, 'users', uid, 'reports', reportId);
      await updateDoc(reportRef, {
        deleted: false,
        deletedAt: null
      });

      setTrashedReports(trashedReports.filter(r => r.id !== reportId));
      setError(null);
    } catch (err) {
      console.error('Error restoring report:', err);
      setError('An error occurred while restoring report');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (reportId) => {
    if (!window.confirm('Permanently delete this report? This action cannot be undone and the report will be lost forever.')) {
      return;
    }

    try {
      setProcessingId(reportId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const reportRef = doc(db, 'users', uid, 'reports', reportId);
      await deleteDoc(reportRef);

      setTrashedReports(trashedReports.filter(r => r.id !== reportId));
      setError(null);
    } catch (err) {
      console.error('Error permanently deleting report:', err);
      setError('An error occurred while permanently deleting report');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
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

  const ReportCard = ({ report }) => {
    const isProcessing = processingId === report.id;
    const daysRemaining = getDaysUntilPermanentDelete(report.deletedAt);

    return (
      <div
        key={report.id}
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
            onClick={() => handleRestore(report.id)}
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
            onClick={() => handlePermanentDelete(report.id)}
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
            {report.reportName}
          </h3>
        </div>

        {report.chartImage && (
          <div style={{
            marginBottom: '16px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}>
            <img
              src={report.chartImage}
              alt={`${report.reportName} chart`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: '#6b7280',
            marginRight: '8px'
          }}>Date Range:</span>
          <span style={{
            fontSize: '14px',
            color: '#1f2937',
            fontWeight: '500'
          }}>
            {formatDate(report.startDate)} - {formatDate(report.endDate)}
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: '#6b7280',
            marginRight: '8px'
          }}>Chart Type:</span>
          <span style={{
            fontSize: '14px',
            color: '#1f2937',
            fontWeight: '500'
          }}>
            {report.chartType ? report.chartType.charAt(0).toUpperCase() + report.chartType.slice(1) + ' Chart' : 'N/A'}
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: '#6b7280',
            marginRight: '8px'
          }}>Appliances:</span>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            {report.appliances ? `${report.appliances.length} appliance${report.appliances.length !== 1 ? 's' : ''}` : '0 appliances'}
          </span>
        </div>

        {report.stats && (
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
                Summary
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '10px',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Total Energy
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                    {report.stats.totalEnergy} kWh
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '10px',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Total Cost
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                    ${report.stats.totalCost}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {report.notes && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{
              fontSize: '13px',
              color: '#6b7280',
              marginRight: '8px'
            }}>Notes:</span>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {report.notes.length > 100 ? report.notes.substring(0, 100) + '...' : report.notes}
            </span>
          </div>
        )}

        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6'
        }}>
          Created: {formatDateTime(report.createdAt)}
        </div>

        <div style={{ 
          fontSize: '12px', 
          color: '#9ca3af', 
          marginTop: '8px'
        }}>
          Deleted: {formatDateTime(report.deletedAt)}
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
    <Layout activePage="Reports" userName={user?.name || user?.email || 'User'} onLogout={logout}>
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
                Deleted Reports
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Reports are kept for 30 days before being permanently deleted
              </p>
            </div>
            <button
              onClick={() => navigate('/reports')}
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
              Back to Reports
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading trashed reports...
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

          {!loading && !error && trashedReports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                No reports in trash
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Deleted reports will appear here for 30 days
              </p>
            </div>
          )}

          {!loading && !error && trashedReports.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '24px', 
              marginTop: '24px' 
            }}>
              {trashedReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default TrashReports;
