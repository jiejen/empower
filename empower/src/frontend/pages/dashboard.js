import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import '../components/Layout.css';

function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  if (!user) {
    navigate('/');
    return null;
  }

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
        
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              Welcome to your energy management dashboard!
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Navigate to the <strong>Appliances</strong> tab to view and manage your appliances.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;