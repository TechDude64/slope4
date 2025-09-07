import { useState, useEffect } from 'react'
import { getLeaderboard } from './supabase'

const Leaderboard = ({ isOpen, onClose }) => {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard()
    }
  }, [isOpen])

  const loadLeaderboard = async () => {
    setLoading(true)
    const data = await getLeaderboard()
    setScores(data)
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'rgba(10,15,20,.9)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: '#e6f0ff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          &times;
        </button>
        <h2 style={{ margin: '0 0 16px', color: '#e6f0ff', textAlign: 'center' }}>
          🏆 Global Leaderboard
        </h2>
        <div id="leaderboardContent">
          {loading ? (
            <div style={{ textAlign: 'center', color: '#e6f0ff', padding: '20px' }}>
              Loading leaderboard...
            </div>
          ) : scores.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#e6f0ff', padding: '20px' }}>
              No scores yet. Be the first!
            </div>
          ) : (
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {scores.map((entry, index) => (
                <li key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < scores.length - 1 ? '1px solid rgba(255,255,255,.1)' : 'none'
                }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#00ffb3',
                    minWidth: '30px'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    flex: 1,
                    color: '#e6f0ff'
                  }}>
                    {entry.player_name || 'Anonymous'}
                  </span>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#66ddff'
                  }}>
                    {Math.floor(entry.score)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
