import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { submitScore } from './supabase'

const Game = ({ onShowLeaderboard }) => {
  const mountRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [showGameOverUI, setShowGameOverUI] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCheatMessage, setShowCheatMessage] = useState(false)
  const [cheatMessage, setCheatMessage] = useState('')
  const [cheatWasUsedThisGame, setCheatWasUsedThisGame] = useState(false)
  const [scoreMultiplier, setScoreMultiplier] = useState(1)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const scoreMultiplierRef = useRef(1)
  const speedMultiplierRef = useRef(1)

  useEffect(() => {
    if (!mountRef.current) return

    const canvas = mountRef.current

    // Scene setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x03111f, 30, 160)

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 300)
    camera.position.set(0, 5.5, 10)
    camera.lookAt(0, 0, 0)

    // Lights
    const hemi = new THREE.HemisphereLight(0x66aaff, 0x001122, 0.6)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0x66ddff, 0.9)
    dir.position.set(20, 40, 10)
    scene.add(dir)

    // Ground (tiled strips to create motion parallax)
    const groundGroup = new THREE.Group()
    scene.add(groundGroup)
    const laneX = [-4, 0, 4]
    const groundSegments = 40
    const segmentLen = 8
    const groundGeo = new THREE.BoxGeometry(14, 0.5, segmentLen)
    const groundMats = [
      new THREE.MeshStandardMaterial({ color: 0x04283f, metalness: 0.2, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x05314e, metalness: 0.25, roughness: 0.75 })
    ]
    for (let i = 0; i < groundSegments; i++) {
      const tile = new THREE.Mesh(groundGeo, groundMats[i % 2])
      tile.position.set(0, -0.3, -i * segmentLen)
      tile.castShadow = false
      tile.receiveShadow = true
      groundGroup.add(tile)
    }

    // Player (neon ball)
    const player = new THREE.Group()
    player.position.set(0, 1, 0)
    scene.add(player)

    const ballGeo = new THREE.SphereGeometry(0.9, 32, 32)
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x00ffb3, emissive: 0x00ffb3, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.2 })
    const ball = new THREE.Mesh(ballGeo, ballMat)
    ball.castShadow = true
    player.add(ball)

    // Dynamic ribbon trail
    const trailPoints = []
    const trailLength = 10
    for (let i = 0; i < trailLength; i++) {
      trailPoints.push(new THREE.Vector3())
    }
    const trailCurve = new THREE.CatmullRomCurve3(trailPoints)
    const trailGeo = new THREE.TubeGeometry(trailCurve, 64, 0.2, 8, false)
    const trailMat = new THREE.MeshBasicMaterial({ color: 0x00d6ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    const trailMesh = new THREE.Mesh(trailGeo, trailMat)
    scene.add(trailMesh)

    // Obstacles
    const obstacles = []
    const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0xff2e63, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.4 })

    function spawnObstacle(z) {
      const box = new THREE.Mesh(boxGeo, boxMat.clone())
      const lane = laneX[Math.floor(Math.random() * laneX.length)]
      box.position.set(lane, 0.9, z)
      box.rotation.set(0, Math.random() * Math.PI, 0)
      obstacles.push(box)
      scene.add(box)
    }

    // Pre-spawn obstacles
    for (let i = 1; i <= 8; i++) {
      spawnObstacle(-i * 20)
    }

    // Game state
    let running = false
    let laneTarget = 0
    let laneCurrent = 0
    let speed = 0.5
    let t = 0
    let currentScore = 0
    const cheatKeys = new Set(['b', 'e', 'n'])
    const pressedKeys = new Set()
    let cheatActive = false
    let cheatKeysWerePressed = false

    function reset() {
      obstacles.forEach(o => scene.remove(o))
      obstacles.length = 0
      for (let i = 1; i <= 8; i++) spawnObstacle(-i * 20)

      laneTarget = 0
      laneCurrent = 0
      player.position.set(0, 1, 0)
      speed = 0.5
      t = 0
      currentScore = 0
      setScore(0)
      setGameOver(false)
      setShowGameOverUI(false)
      running = true
      pressedKeys.clear()
      cheatActive = false
      setShowCheatMessage(false)
      setCheatWasUsedThisGame(false)

      // Reset trail
      trailPoints.length = 0
      const initialTrailPos = player.position.clone().add(new THREE.Vector3(0, -0.5, 0))
      for (let i = 0; i < trailLength; i++) {
        trailPoints.push(initialTrailPos.clone())
      }
      const updatedCurve = new THREE.CatmullRomCurve3(trailPoints)
      trailMesh.geometry.dispose()
      trailMesh.geometry = new THREE.TubeGeometry(updatedCurve, 64, 0.2, 8, false)
    }

    // Input handling
    const handleKeyDown = (e) => {
      // Don't handle game keys when typing in input fields
      if (e.target.tagName === 'INPUT') return

      const key = e.key.toLowerCase()
      pressedKeys.add(key)

      if ((!running && !gameOver) && e.code === 'Space') {
        reset()
        return
      }
      if (gameOver && e.code === 'Space') {
        reset()
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') laneTarget = Math.max(-1, laneTarget - 1)
      if (e.code === 'ArrowRight' || e.code === 'KeyD') laneTarget = Math.min(1, laneTarget + 1)

      // Cheat code detection - toggle when all keys are first pressed simultaneously
      const allCheatKeysPressed = [...cheatKeys].every(k => pressedKeys.has(k))

      if (allCheatKeysPressed && !cheatKeysWerePressed) {
        // Only allow activation, not deactivation mid-game
        if (!cheatActive) {
          // Ask user for speed multiplier
          const speedMult = parseFloat(prompt("Enter speed multiplier (e.g., 0.5 for half speed, 2 for double speed):", "0.5")) || 1
          // Ask user for score multiplier
          const scoreMult = parseFloat(prompt("Enter score multiplier (e.g., 2 for 2x, 5 for 5x):", "3")) || 1

          if (speedMult > 0 && scoreMult > 0) {
            setSpeedMultiplier(speedMult)
            setScoreMultiplier(scoreMult)
            speedMultiplierRef.current = speedMult
            scoreMultiplierRef.current = scoreMult
            cheatActive = true
            setCheatWasUsedThisGame(true)
            setCheatMessage(`Cheat Activated! Speed: ${speedMult}x, Score: ${scoreMult}x`)
            setShowCheatMessage(true)
            setTimeout(() => setShowCheatMessage(false), 3000)
          }
        }
      }

      cheatKeysWerePressed = allCheatKeysPressed
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      pressedKeys.delete(key)

      // Update cheat key tracking
      if (cheatKeys.has(key)) {
        cheatKeysWerePressed = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Resize handling
    function onResize() {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)
    onResize()

    // Main game loop
    const clock = new THREE.Clock()
    let animationId

    function animate() {
      animationId = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.033)

      if (!running) {
        renderer.render(scene, camera)
        return
      }

      t += dt
      const originalSpeed = 0.5 + Math.min(3.5, t * 0.12)
      speed = cheatActive ? originalSpeed * speedMultiplierRef.current : originalSpeed

      groundGroup.children.forEach((tile) => {
        tile.position.z += speed
        if (tile.position.z > 15) tile.position.z -= groundSegments * segmentLen
      })

      // Smooth lane interpolation
      const targetX = laneX[laneTarget + 1]
      laneCurrent += (targetX - laneCurrent) * Math.min(1, dt * 6)
      player.position.x = laneCurrent

      ball.rotation.z -= speed * 0.12

      // Update trail
      trailPoints.forEach(p => p.z += speed)
      const oldestPoint = trailPoints.shift()
      oldestPoint.copy(player.position).add(new THREE.Vector3(0, -0.5, 0))
      trailPoints.push(oldestPoint)
      const updatedCurve = new THREE.CatmullRomCurve3(trailPoints)
      trailMesh.geometry.dispose()
      trailMesh.geometry = new THREE.TubeGeometry(updatedCurve, 64, 0.2, 8, false)

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]
        o.position.z += speed
        o.rotation.y += dt * 1.2
        if (o.position.z > 6) {
          o.position.z = - (160 + Math.random() * 80)
          o.position.x = laneX[Math.floor(Math.random() * laneX.length)]
        }
        const dx = Math.abs(o.position.x - player.position.x)
        const dz = Math.abs(o.position.z - player.position.z)
        if (dx < 1.6 && dz < 1.6) {
          running = false
          setGameOver(true)
          setShowGameOverUI(true)
        }
      }

      currentScore += originalSpeed * dt * (cheatActive ? scoreMultiplierRef.current : 1)
      setScore(Math.floor(currentScore))

      camera.position.x = player.position.x
      camera.lookAt(player.position)

      renderer.render(scene, camera)
    }

    animate()
    canvas.focus()

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animationId)
      renderer.dispose()
    }
  }, [])

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return

    // Prevent score submission if cheat was used
    if (cheatWasUsedThisGame) {
      alert("Cheat codes were used! High scores cannot be submitted.")
      return
    }

    setSubmitting(true)
    await submitScore(playerName.trim(), score)
    setSubmitting(false)
    setShowGameOverUI(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0a0f14' }}>
      <canvas
        ref={mountRef}
        style={{
          position: 'fixed',
          inset: 0,
          outline: 'none',
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        tabIndex={0}
      />

      {/* HUD */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        color: '#e6f0ff',
        fontWeight: 600,
        letterSpacing: '.3px',
        mixBlendMode: 'difference',
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
      }}>
        <div style={{ fontSize: '20px' }}>
          Score: <span>{score}</span>
        </div>
        <div style={{ fontSize: '14px', opacity: .8 }}>
          A/D or ◀︎▶︎ to move • SPACE to restart
        </div>
        <button
          onClick={onShowLeaderboard}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0,0,0,.5)',
            border: '1px solid rgba(255,255,255,.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: '#e6f0ff',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0,0,0,.7)'
            e.target.style.borderColor = 'rgba(255,255,255,.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0,0,0,.5)'
            e.target.style.borderColor = 'rgba(255,255,255,.2)'
          }}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* Cheat Message */}
      {showCheatMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00ffb3',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'rgba(0,0,0,.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid #00ffb3',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          {cheatMessage}
        </div>
      )}

      {/* Game Over UI */}
      {showGameOverUI && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            color: 'white',
            textAlign: 'center',
            background: 'rgba(0,0,0,.35)',
            backdropFilter: 'blur(6px)',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,.3)',
            pointerEvents: 'auto'
          }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '24px', letterSpacing: '.5px' }}>
              Game Over
            </h1>
            <p style={{ margin: '6px 0', opacity: .9 }}>
              Final Score: {score}
            </p>
            {score > 30 && !cheatWasUsedThisGame && (
              <div style={{ margin: '16px 0' }}>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginRight: '8px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSubmitScore}
                  disabled={submitting || !playerName.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#00ffb3',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#000',
                    cursor: submitting || !playerName.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: submitting || !playerName.trim() ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit to Leaderboard'}
                </button>
              </div>
            )}
            {cheatWasUsedThisGame && (
              <p style={{ margin: '16px 0', color: '#ff6b6b', fontWeight: 'bold' }}>
                ⚠️ Cheat codes were used - score cannot be submitted to leaderboard
              </p>
            )}
            <p style={{ margin: '6px 0', opacity: .7 }}>
              Press SPACE to restart
            </p>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {!gameOver && score === 0 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            color: 'white',
            textAlign: 'center',
            background: 'rgba(0,0,0,.35)',
            backdropFilter: 'blur(6px)',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,.3)'
          }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '24px', letterSpacing: '.5px' }}>
              SLOPE 4
            </h1>
            <p style={{ margin: '6px 0', opacity: .9 }}>
              Tap A/D or ◀︎▶︎ to dodge. Survive as long as you can.
            </p>
            <p style={{ margin: '6px 0', opacity: .9 }}>
              Tip: the game gets faster the longer you last.
            </p>
            <p style={{ margin: '6px 0', opacity: .7 }}>
              Press SPACE to start
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Game
