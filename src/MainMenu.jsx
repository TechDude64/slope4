import React, { useState } from 'react';
import './MainMenu.css'; // Import a new CSS file for styling

function MainMenu({ onStartGame, onChangeBallColor }) {
  const [ballColor, setBallColor] = useState('#FF0000'); // Default red

  const handleColorChange = (e) => {
    setBallColor(e.target.value);
    onChangeBallColor(e.target.value);
  };

  return (
    <div className="main-menu-container">
      <div className="background-animation"></div> {/* Background animation element */}
      <div className="menu-content">
        <h1>Slope Game</h1>
        <div className="menu-options">
          <button
            className="menu-button"
            onClick={() => onStartGame('singleplayer')}
          >
            Single Player
          </button>
          <button
            className="menu-button"
            onClick={() => onStartGame('multiplayer')}
          >
            Multiplayer
          </button>
        </div>
        <div className="color-picker-container">
          <label htmlFor="ballColor">Ball Color:</label>
          <input
            type="color"
            id="ballColor"
            value={ballColor}
            onChange={handleColorChange}
            className="color-input"
          />
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
