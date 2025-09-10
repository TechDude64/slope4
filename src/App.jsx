import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Game from './Game'
import MultiplayerGame from './MultiplayerGame'
import Leaderboard from './Leaderboard'
import MainMenu from './MainMenu'
import Lobby from './Lobby'
import PartyRoom from './PartyRoom' // Import PartyRoom

function App() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showMainMenu, setShowMainMenu] = useState(true)
  const [showLobby, setShowLobby] = useState(false)
  const [showPartyRoom, setShowPartyRoom] = useState(false) // New state for PartyRoom
  const [ballColor, setBallColor] = useState('#FF0000') // Default ball color
  const [gameId, setGameId] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const playerId = useRef(uuidv4()) // Stable player ID for the session
  const [nickname, setNickname] = useState(`Player-${playerId.current.substring(0, 4)}`);
  const ws = useRef(null);


  const handleStartGame = (mode) => {
    if (mode === 'singleplayer') {
      setShowMainMenu(false)
    } else if (mode === 'multiplayer') {
      setShowLobby(true)
    }
  }

  const handleEnterPartyRoom = (newGameId, hostStatus) => {
    setGameId(newGameId)
    setIsHost(hostStatus)
    setShowLobby(false)
    setShowMainMenu(false)
    setShowPartyRoom(true) // Show PartyRoom
  }

  const handleStartMultiplayerGame = (newGameId, hostStatus) => {
    setGameId(newGameId)
    setIsHost(hostStatus)
    setShowPartyRoom(false) // Hide PartyRoom when game starts
    setShowMainMenu(false)
  }

  const handleChangeBallColor = (color) => {
    setBallColor(color)
  }

  const handleChangeNickname = (nickname) => {
    setNickname(nickname)
  }

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true)
  }

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false)
  }

  const handleWsConnect = (socket) => {
    // Close existing connection if any
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    ws.current = socket;
  }

  const handleReturnToLobby = () => {
    // Close WebSocket when returning to lobby
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setShowPartyRoom(true); // Show PartyRoom (lobby)
    setGameId(null); // Clear game ID
  }



  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showMainMenu && !showLobby && !showPartyRoom && (
        <MainMenu onStartGame={handleStartGame} onChangeBallColor={handleChangeBallColor} />
      )}
      {showLobby && (
        <Lobby onStartGame={handleEnterPartyRoom} />
      )}
      {showPartyRoom && (
        <PartyRoom
          gameId={gameId}
          isHost={isHost}
          onStartGame={handleStartMultiplayerGame}
          ballColor={ballColor}
          onChangeBallColor={handleChangeBallColor}
          playerId={playerId.current}
          nickname={nickname}
          onChangeNickname={handleChangeNickname}
          onWsConnect={handleWsConnect}
        />
      )}
      {!showMainMenu && !showLobby && !showPartyRoom && (
        <>
          {gameId ? (
            <MultiplayerGame
              onShowLeaderboard={handleShowLeaderboard}
              ballColor={ballColor}
              gameId={gameId}
              playerId={playerId.current}
              nickname={nickname}
              ws={ws.current}
              onReturnToLobby={handleReturnToLobby}
            />
          ) : (
            <Game
              onShowLeaderboard={handleShowLeaderboard}
              ballColor={ballColor}
            />
          )}
          <Leaderboard
            isOpen={showLeaderboard}
            onClose={handleCloseLeaderboard}
          />
        </>
      )}
    </div>
  )
}

export default App
