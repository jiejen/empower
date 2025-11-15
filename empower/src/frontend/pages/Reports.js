import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import '../components/Layout.css';

function Reports() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchReports();
    } else {
      navigate('/');
    }
  }, [navigate, user]);

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
        reportsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by creation date, newest first
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

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(reportId);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Not authenticated');
        return;
      }

      const reportRef = doc(db, 'users', uid, 'reports', reportId);
      await deleteDoc(reportRef);
      
      // Remove the report from the local state
      setReports(reports.filter(r => r.id !== reportId));
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

  // Format date for display
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

  return (
    <Layout activePage="Reports" userName={user?.name || user?.email || 'User'} onLogout={logout}>
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
              Saved Reports
            </h2>
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
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              + Create New Report
            </button>
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
              gap: '24px', 
              marginTop: '24px' 
            }}>
              {reports.map((report) => {
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
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
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
                        opacity: isDeleting ? 0.6 : 1,
                        zIndex: 10
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
                        {report.reportName}
                      </h3>
                    </div>
                
                    {/* Display chart image if available */}
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
                              backgroundColor: '#f0f9ff',
                              padding: '10px',
                              borderRadius: '6px'
                            }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                Total Energy
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
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
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Reports;