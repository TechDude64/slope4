import { useState } from 'react'
import Game from './Game'
import Leaderboard from './Leaderboard'

function App() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true)
  }

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false)
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Game onShowLeaderboard={handleShowLeaderboard} />
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={handleCloseLeaderboard}
      />
    </div>
  )
}

export default App
