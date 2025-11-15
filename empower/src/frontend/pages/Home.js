import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Card from '../components/card.js';
import heroImg from '../assets/Green-energy-lightbulb.jpg';
import heroImg2 from '../assets/Saving_Hub_House.png';
import joshImg from '../assets/josh.png';
import viviImg from '../assets/vivi.png';
import jenniImg from '../assets/jenni.png';
import thuyanImg from '../assets/thuyan.png';
import abbasImg from '../assets/abbas.png';
import logo from '../assets/logo.png';

function Home() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/signup');
    window.scrollTo(0, 0);
  };

  const handleTryNow = () => {
    navigate('/signup');
    window.scrollTo(0, 0);
  };

  return (
    <div className="home-page">
        <header className="home-header">
          <div className="header-inner">
            <div className="brand">
              <img src={logo} alt="Empower Logo" style={{ height: '40px', marginRight: '-4px', transform: 'rotate(220deg)' }} />
              <span className="app-name">Empower</span>
            </div>

            <nav className="header-nav">
              <a className="nav-link" href="#about">About Us</a>
              <a className="nav-link" href="#contact">Contact Us</a>
              <button className="signin-btn" onClick={() => navigate('/login')}>Sign In</button>
            </nav>
          </div>
        </header>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-left">
              <h1 className="hero-title">Your home's energy bill,</h1>
              <h1 className="hero-title" style={{color: '#28a745', fontWeight: 700 }}>optimized.</h1>

              <p className="hero-subtitle">Empowering homeowners to be efficient.</p>
              <button
                className="signup-btn"
                onClick={handleSignUp}
              >
                Sign Up for free
              </button>
            </div>

            <div className="hero-right">
              {/* <div className="placeholder-image" aria-hidden="true">Placeholder Image</div> */}
              <img src={heroImg} alt="Green energy lightbulb" className="hero-image" />
            </div>
          </div>
        </section>

        <section className="white-section">
          <div className="white-inner">
            <div className="feature-left">
              {/* <div className="placeholder-image" aria-hidden="true">Placeholder Image</div> */}
              <img src={heroImg2} alt="Saving Hub House" className="hero-image2" />
            </div>

            <div className="feature-right">
              <h2 className="feature-title">Be Efficient.</h2>
              <p className="feature-subtitle">
                Empower yourself with appliance-level energy breakdowns and analytics. Explore interactive dashboards and create reports with actionable fix suggestions.
              </p>
              <button className="try-btn" onClick={handleTryNow}>Try it now!</button>
            </div>
          </div>
        </section>

        <section id="about" className="about-section">
          <div className="about-inner">
            <h2 className="about-title">About Us</h2>
            <p className="about-text">
              We are five UTD students who saw how rising household energy bills were
              putting pressure on families and wanted to do something about it.
              Combining data, simple visuals, and actionable recommendations, we
              built Empower to help homeowners understand their energy use and
              take practical steps to save money and reduce waste.
            </p>
            
            <div className="team-avatars">
              <div className="avatar-container">
                <img src={joshImg} alt="Joshua Das" className="avatar-img" />
                <div className="avatar-name">Joshua Das</div>
              </div>
              <div className="avatar-container">
                <img src={viviImg} alt="Vaishnavi Josyula" className="avatar-img" />
                <div className="avatar-name">Vaishnavi Josyula</div>
              </div>
              <div className="avatar-container">
                <img src={jenniImg} alt="Jennifer Zhang" className="avatar-img" />
                <div className="avatar-name">Jennifer Zhang</div>
              </div>
              <div className="avatar-container">
                <img src={thuyanImg} alt="Thuyan Dang" className="avatar-img" />
                <div className="avatar-name">Thuyan Dang</div>
              </div>
              <div className="avatar-container">
                <img src={abbasImg} alt="Abbas Khawaja" className="avatar-img" />
                <div className="avatar-name">Abbas Khawaja</div>
              </div>
            </div>

            {/* <h3 className="mission-title">Our Mission</h3>
            <p className="mission-text">
              To empower homeowners with clear, actionable insights that make
              energy savings simple, affordable, and sustainable.
            </p> */}
          </div>
        </section>


        <section className="testimonials">
          <div className="testimonials-inner">
            {/* Testimony Section */}
            <h1 className="testimonials-title">Testimonies</h1>
            <div className="testimonials-cards">
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
        </section>
                <section id="contact" className="contact-section">
          <div className="contact-inner">
            <h2 className="contact-title">Contact Us</h2>
            <p className="contact-text">Have questions or want to partner with us? Reach out:</p>

            <div className="contact-card">
              <div className="contact-item">
                <strong>Address:  </strong>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=800+W+Campbell+Rd,+Richardson,+TX+75080" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="contact-link"
                >
                  800 W Campbell Rd, Richardson, TX 75080
                </a>
              </div>

              <div className="contact-item">
                <strong>Phone:  </strong>
                <a href="tel:+19728832111" className="contact-link">
                  (972) 883-2111
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    );
  }

export default Home;