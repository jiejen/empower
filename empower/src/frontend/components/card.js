import React from 'react';
import './card.css';

function Card({ title, subtitle, img }) {
  return (
    <div className="headline-card-container">
      <img className="headline-card-image" src={img} alt={title} />
      <div className="headline-card-content">
        <h1 className="headline-card-title">{title}</h1>
        <p className="headline-card-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default Card;
