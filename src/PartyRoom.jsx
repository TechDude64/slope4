import React, { useState, useEffect, useRef } from 'react';
import './PartyRoom.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://slope-multiplayer.onrender.com';

const PartyRoom = ({ gameId, isHost, onStartGame, ballColor, onChangeBallColor, playerId, nickname, onChangeNickname, onWsConnect }) => {
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState({}); // State to store players as an object
  const ws = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    ws.current = socket;
    onWsConnect(socket);

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Send initial join message to the server
      socket.send(JSON.stringify({
        roomId: gameId,
        playerId: playerId,
        action: 'join',
        payload: {
          nickname,
          color: ballColor,
          ready: isReady,
        },
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.roomId !== gameId) return;

      if (message.type === 'state') {
        setPlayers(message.players);
      }
      
      // Game starts when the server sends the first 'gameState' message
      if (message.type === 'gameState' && message.payload.running) {
        onStartGame(gameId, isHost);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Server handles player cleanup on disconnect
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      // Don't close the socket here - ownership is transferred to the game component
      // socket.close();
    };
  }, [gameId, playerId]); // Reconnect only if gameId changes

  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        roomId: gameId,
        playerId: playerId,
        action: 'update',
        payload: {
          nickname,
          color: ballColor,
          ready: isReady,
        },
      }));
    }
  }, [nickname, ballColor, isReady, gameId, playerId]); // Send updates when player data changes

  const handleNicknameChange = (e) => {
    onChangeNickname(e.target.value);
  };

  const handleBallColorChange = (e) => {
    onChangeBallColor(e.target.value);
  };

  const handleReadyToggle = () => {
    setIsReady(prev => !prev);
  };


  return (
    <div className="party-room-container">
      <div className="party-room-card">
        <h1>Party Room</h1>
        <div className="game-id-section">
          <p>Game ID:</p>
          <div className="copyable-id">
            <span className="game-id-text">{gameId}</span>
            <button onClick={() => navigator.clipboard.writeText(gameId)} className="copy-button">
              Copy
            </button>
          </div>
        </div>

        <div className="party-content-wrapper">
          <div className="player-settings">
            <h2>Your Settings</h2>
            <label htmlFor="nickname">Nickname:</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={handleNicknameChange}
              maxLength={20}
              placeholder="Enter your nickname"
            />
            <label htmlFor="ballColor">Ball Color:</label>
            <input
              type="color"
              id="ballColor"
              value={ballColor}
              onChange={handleBallColorChange}
            />
            <button onClick={handleReadyToggle} className={isReady ? 'ready-button ready' : 'ready-button not-ready'}>
              {isReady ? 'Unready' : 'Ready Up'}
            </button>
          </div>

          <div className="player-list">
            <h2>Players in Room ({Object.keys(players).length})</h2>
            <ul>
              {Object.entries(players).map(([id, player]) => (
                <li key={id} className={player.ready ? 'player-ready' : ''}>
                  <span style={{ color: player.color }}>&#9679;</span> {player.nickname} {player.ready ? '(Ready)' : ''}
                </li>
              ))}
            </ul>
            <p className="start-info">
              The game will start automatically when all players are ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyRoom;
