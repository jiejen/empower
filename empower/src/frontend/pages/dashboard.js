import { Layout } from '../components/layout';
import { auth } from '../../firebase';
import { authService } from '../../services/authService';
import '../components/Layout.css';
import { useState, useEffect } from 'react';

function Dashboard() {
  const [userName, setUserName] = useState('John Doe');

  useEffect(() => {
    // Get user name from either Firebase or local auth
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserName(user.displayName || user.email.split('@')[0]);
      } else {
        const localUser = authService.getCurrentSession()?.user;
        if (localUser) {
          setUserName(localUser.profile?.name || localUser.email.split('@')[0]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Layout activePage="Dashboard" userName={userName}>
      <div style={{ padding: '32px' }}>
        <h2>Dashboard</h2>
      </div>
    </Layout>
  );
}

export default Dashboard;