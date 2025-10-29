import { Layout } from '../components/layout';
import '../components/Layout.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './dashboard';
import Card from '../components/card.js';

function Home() {
  const navigate = useNavigate();
  return (
    <Layout activePage="Home" userName="John Doe">
      <div style={{ padding: '32px'} }>
      {/* Hero section */}
      <div style={{marginBottom: '40px', position: 'relative', width: '1/2', height: '400px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'}} >
        <div style={{display: 'flex'}}>
        
        <h1 style={{padding: '32px'}}>Take Charge of <span style={{color:' #4d8be9'}}>Your</span> Energy <br/>Through <span style={{color:' #4d8be9'}}>EMPOWER!</span></h1>
       
        <img style={{width: '400px', height: '300px', position: 'absolute', right: '72px', marginTop: '16px', borderRadius: '8px'}} 
        src="https://cdn.creazilla.com/cliparts/1631825/wind-turbine-clipart-md.png" alt="Energy Efficiency"/>
        </div>
        <button style={{margin: '32px', position: 'absolute', bottom: '24px'}} class="button" onClick={() => navigate('dashboard')}>Get Started</button>
      </div>

      {/* Testimony Section */}
      <h1 style={{padding: '16px'}}><br/>Testimonies</h1>
      <div style={{ padding: '16px', display: 'flex', gap: '60px' }}>

      <Card
      title={"Sarah L"}
      subtitle={"\"Wow! I was in so much debt I thought I was going to have to sell my own house! The energy bill was too high and I had no idea how to manage it, but through the EMPOWER app I have so much money saved! Thank you!! - Sarah L."}
      img={"https://img.freepik.com/premium-vector/vector-happy-excited-woman-cartoon-illustration_844724-1222.jpg"}
      />
      <Card
      title={"Jake S."}
      subtitle={"\"Man. at first I couldn't tell you what was making my energy bills so high. I would get so frustrated I started punching holes in the wall. Now I'm in more debt! But through this app I saved so much money, fixed the walls and now finally understand my energy bill! Thanks EMPOWER!!! - Jake S."}
      img={"https://cdn.creazilla.com/cliparts/8122/happy-boy-clipart-xl.png"}
      />
      </div>

      </div>
      
    </Layout>
  );
}

export default Home;