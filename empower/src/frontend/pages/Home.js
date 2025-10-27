import { Layout } from '../components/layout';
import '../components/Layout.css'; // Import the CSS
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './dashboard';
import Card from '../components/card.js';

function Home() {
  const navigate = useNavigate();
  return (
    <Layout activePage="Home" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h1>Take Charge of <span style={{color:' #4d8be9'}}>Your</span> Energy</h1>
        <button class="button" onClick={() => navigate('dashboard')}>Get Started</button>
      </div>
      <Card
      title={"Sarah L"}
      subtitle={"\"Wow! I was in so much debt I thought I was going to have to sell my own house! The energy bill was too high and I had no idea how to manage it, but through the EMPOWER app I have so much money saved! Thank you!! - Sarah L."}
      img={"https://media.istockphoto.com/id/157030584/vector/thumb-up-emoticon.jpg?s=612x612&w=0&k=20&c=GGl4NM_6_BzvJxLSl7uCDF4Vlo_zHGZVmmqOBIewgKg="}
      />
      <Card
      title={"Jake S."}
      subtitle={"\"Man. at first I couldn't tell you what was making my energy bills so high. I would get so frustrated I started punching holes in the wall. Now I'm in more debt! But through this app I saved so much money, fixed the walls and now finally understand my energy bill! Thanks EMPOWer!!! Jake S."}
      img={"https://media.istockphoto.com/id/157030584/vector/thumb-up-emoticon.jpg?s=612x612&w=0&k=20&c=GGl4NM_6_BzvJxLSl7uCDF4Vlo_zHGZVmmqOBIewgKg="}
      />
      
    </Layout>
  );
}

export default Home;