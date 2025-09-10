import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import './Lobby.css';

const Lobby = ({ onStartGame }) => {
  const [joinGameId, setJoinGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const handleHostGame = () => {
    setIsLoading(true);
    const newGameId = uuidv4(); // Generate a unique game ID
    onStartGame(newGameId, true); // Pass the new game ID to the parent, and set as host
    setIsLoading(false);
  };

  const handleJoinGame = () => {
    if (!joinGameId.trim()) {
      alert("Please enter a Game ID to join.");
      return;
    }
    setIsLoading(true);
    // No need to check if game exists on server, PartyRoom will handle connection
    onStartGame(joinGameId.trim(), false); // Join the game
    setIsLoading(false);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>Multiplayer Lobby</h1>
        <p>Host a new game or join an existing one.</p>
        <div className="lobby-actions">
          <button onClick={handleHostGame} className="host-button" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Host New Game'}
          </button>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter Game ID to Join"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              maxLength={36}
              disabled={isLoading}
            />
            <button onClick={handleJoinGame} disabled={!joinGameId.trim() || isLoading}>
              {isLoading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
