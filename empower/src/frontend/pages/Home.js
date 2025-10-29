import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-inner">
          <div className="brand">
            <div className="app-symbol" aria-hidden="true">E</div>
            <span className="app-name">Empower</span>
          </div>

          <nav className="header-nav">
            <a className="nav-link" href="#about">About Us</a>
            <a className="nav-link" href="#contact">Contact Us</a>
            <button className="signin-btn" onClick={() => navigate('/login')}>Sign In/Up</button>
          </nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <h1 className="hero-title">Your home's energy bill,</h1>
            <h1 className="hero-title">optimized.</h1>

            <p className="hero-subtitle">Empowering homeowners to be efficient.</p>
            <button
              className="signup-btn"
              onClick={() => navigate('/login')}
            >
              Sign Up for free
            </button>
          </div>

          <div className="hero-right">
            <div className="placeholder-image" aria-hidden="true">Placeholder Image</div>
          </div>
        </div>
      </section>

      <section className="white-section">
        <div className="white-inner">
          <div className="feature-left">
            <div className="placeholder-image" aria-hidden="true">Placeholder Image</div>
          </div>

          <div className="feature-right">
            <h2 className="feature-title">Be Efficient.</h2>
            <p className="feature-subtitle">
              Empower yourself with appliance-level energy breakdowns and analytics. Explore interactive dashboards and create reports with actionable fix suggestions.
            </p>
            <button className="try-btn" onClick={() => navigate('/login')}>Try it now!</button>
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

          <div className="team-avatars" aria-hidden="true">
            <div className="avatar">A</div>
            <div className="avatar">B</div>
            <div className="avatar">C</div>
            <div className="avatar">D</div>
            <div className="avatar">E</div>
          </div>

          <h3 className="mission-title">Our Mission</h3>
          <p className="mission-text">
            To empower homeowners with clear, actionable insights that make
            energy savings simple, affordable, and sustainable.
          </p>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-inner">
          <h2 className="contact-title">Contact Us</h2>
          <p className="contact-text">Have questions or want to partner with us? Reach out:</p>

          <div className="contact-card">
            <div className="contact-item">
              <strong>Address</strong>
              <div>TODO!</div>
            </div>

            <div className="contact-item">
              <strong>Phone</strong>
              <div>TODO!</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;