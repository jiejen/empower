import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import '../components/Layout.css';

function Reports() {
  const { user, loading: authLoading, logout } = useUser();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchReports();
    } else {
      navigate('/');
    }
  }, [navigate, user, authLoading]);

  const fetchReports = async () => {
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

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show non-deleted reports
        if (!data.deleted) {
          reportsData.push({ id: doc.id, ...data });
        }
      });

      reportsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setReports(reportsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('An error occurred while loading reports');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (reportId, currentFavoriteStatus) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const reportRef = doc(db, 'users', uid, 'reports', reportId);
      await updateDoc(reportRef, {
        isFavorite: !currentFavoriteStatus
      });

      // Update the local state
      setReports(reports.map(r =>
        r.id === reportId ? { ...r, isFavorite: !currentFavoriteStatus } : r
      ));
      setError(null);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('An error occurred while updating favorite status');
    }
  };

  const handleDeleteClick = (report) => {
    setConfirmDelete(report);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    const reportToDelete = confirmDelete;
    setConfirmDelete(null);

    try {
      setDeletingId(reportToDelete.id);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      // Soft delete - mark as deleted with timestamp
      const reportRef = doc(db, 'users', uid, 'reports', reportToDelete.id);
      await updateDoc(reportRef, {
        deleted: true,
        deletedAt: new Date().toISOString()
      });

      // Remove from UI immediately
      setReports(reports.filter(r => r.id !== reportToDelete.id));
      setError(null);
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('An error occurred while deleting report');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewReport = (report) => {
    navigate('/report-view', { state: { reportData: report } });
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

  // Separate favorite and non-favorite reports
  const favoriteReports = reports.filter(r => r.isFavorite);
  const regularReports = reports.filter(r => !r.isFavorite);

  const ReportCard = ({ report }) => {
    const isDeleting = deletingId === report.id;

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
          position: 'relative',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
        onClick={() => handleViewReport(report)}
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
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(report.id, report.isFavorite);
            }}
            style={{
              padding: '6px 10px',
              backgroundColor: 'white',
              color: report.isFavorite ? '#ef4444' : '#9ca3af',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.transform = 'scale(1)';
            }}
            title={report.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={report.isFavorite ? '#ef4444' : 'none'} stroke={report.isFavorite ? '#ef4444' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(report);
            }}
            disabled={isDeleting}
            style={{
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
        </div>

        <div style={{ marginBottom: '16px', paddingRight: '100px' }}>
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
            {report.chartType.charAt(0).toUpperCase() + report.chartType.slice(1)} Chart
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: '#6b7280',
            marginRight: '8px'
          }}>Appliances:</span>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            {report.appliances.length} appliance{report.appliances.length !== 1 ? 's' : ''}
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
      </div>
    );
  };

  return (
    <Layout activePage="Reports" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <ConfirmationDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Report?"
        message="Are you sure you want to delete this report? It will be moved to Deleted Reports where you can recover it for 30 days."
        itemName={confirmDelete?.reportName}
        confirmText="Delete"
        cancelText="Cancel"
      />

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
              All Reports
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => navigate('/trash-reports')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Deleted Reports
              </button>
              <button
                onClick={() => navigate('/create-report')}
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
                Create Report
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading reports...
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

          {!loading && !error && reports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No reports yet. Create one to get started!
            </div>
          )}

          {!loading && !error && reports.length > 0 && (
            <>
              {favoriteReports.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      Favorite Reports
                    </h3>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      ({favoriteReports.length})
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '24px'
                  }}>
                    {favoriteReports.map((report) => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                </div>
              )}
              {regularReports.length > 0 && (
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '20px'
                  }}>
                    {favoriteReports.length > 0 ? 'Other Reports' : 'All Reports'}
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}>
                      ({regularReports.length})
                    </span>
                  </h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '24px'
                  }}>
                    {regularReports.map((report) => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Reports;