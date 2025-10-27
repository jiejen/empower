import { Layout } from '../components/layout';
import '../components/Layout.css'; // Import the CSS
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './dashboard';

function Home() {
  const navigate = useNavigate();
  return (
    <Layout activePage="Dashboard" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h1>Take Charge of <span style={{color:' #4d8be9'}}>Your</span> Energy</h1>
        <button onClick={() => navigate('dashboard')}>Get Started</button>
      </div>
    </Layout>
  );
}

export default Home;