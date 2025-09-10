import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://slope-multiplayer.onrender.com';

const ballGeo = new THREE.SphereGeometry(0.9, 32, 32);
const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
const boxMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0xff2e63, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.4 });

const MultiplayerGame = ({ ballColor, gameId, playerId, nickname, ws, onReturnToLobby }) => {
    const mountRef = useRef(null);
    const [score, setScore] = useState(0);
    const [showGameOverUI, setShowGameOverUI] = useState(false);


    const playerMeshes = useRef({}); // Includes local player and others
    const obstacleMeshes = useRef({});
    const trailMeshes = useRef({}); // Trail meshes for each player
    const lastServerUpdate = useRef(Date.now());
    const trailUpdateCounter = useRef(0);
    const performanceStats = useRef({ frameCount: 0, lastTime: Date.now(), avgFrameTime: 0 });

    useEffect(() => {
        if (!mountRef.current || !playerId) return;

        const canvas = mountRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x03111f, 30, 160);

        const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 300);
        camera.position.set(0, 5.5, 10);
        camera.lookAt(0, 0, 0);

        const hemi = new THREE.HemisphereLight(0x66aaff, 0x001122, 0.6);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0x66ddff, 0.9);
        dir.position.set(20, 40, 10);
        scene.add(dir);

        const groundGroup = new THREE.Group();
        scene.add(groundGroup);
        const groundSegments = 40;
        const segmentLen = 8;
        const groundGeo = new THREE.BoxGeometry(14, 0.5, segmentLen);
        const groundMats = [
            new THREE.MeshStandardMaterial({ color: 0x04283f, metalness: 0.2, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x05314e, metalness: 0.25, roughness: 0.75 })
        ];
        for (let i = 0; i < groundSegments; i++) {
            const tile = new THREE.Mesh(groundGeo, groundMats[i % 2]);
            tile.position.set(0, -0.3, -i * segmentLen);
            tile.receiveShadow = true;
            groundGroup.add(tile);
        }

        if (!ws) return;

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.roomId !== gameId) return;

            if (message.type === 'gameState') {
                const { players, obstacles, score } = message.payload;
                updateScene(players, obstacles, score);
            } else if (message.type === 'gameOver') {
                setShowGameOverUI(true);
            } else if (message.type === 'returnToLobby') {
                // All players died, automatically return to lobby after delay
                setTimeout(() => {
                    if (onReturnToLobby) {
                        onReturnToLobby();
                    }
                }, 3000); // 3 seconds delay to show game over UI
            }
        };

        ws.onclose = () => console.log('Game WebSocket disconnected');
        ws.onerror = (error) => console.error('Game WebSocket error:', error);

        const updateScene = (players, obstacles, serverScore) => {
            lastServerUpdate.current = Date.now(); // Update timestamp for interpolation
            const allPlayerIds = new Set(Object.keys(players));

            // Clean up meshes for players who left
            for (const id in playerMeshes.current) {
                if (!allPlayerIds.has(id)) {
                    scene.remove(playerMeshes.current[id]);
                    delete playerMeshes.current[id];
                    if (trailMeshes.current[id]) {
                        scene.remove(trailMeshes.current[id]);
                        delete trailMeshes.current[id];
                    }
                }
            }

            for (const id in players) {
                const p = players[id];
                if (!p.alive) {
                    if (playerMeshes.current[id]) {
                        scene.remove(playerMeshes.current[id]);
                        delete playerMeshes.current[id];
                    }
                    if (trailMeshes.current[id]) {
                        scene.remove(trailMeshes.current[id]);
                        delete trailMeshes.current[id];
                    }
                    continue;
                }

                let mesh = playerMeshes.current[id];
                if (!mesh) {
                    const playerColor = new THREE.Color(p.color);
                    const mat = new THREE.MeshStandardMaterial({ color: playerColor, emissive: playerColor, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.2 });
                    mesh = new THREE.Mesh(ballGeo, mat);
                    mesh.castShadow = true;
                    scene.add(mesh);
                    playerMeshes.current[id] = mesh;

                    // Store initial position for interpolation
                    mesh.userData.targetPosition = new THREE.Vector3(p.x, p.y, p.z);
                    mesh.userData.currentPosition = new THREE.Vector3(p.x, p.y, p.z);

                    // Create trail for new player
                    const trailPoints = [];
                    const trailLength = 10;
                    for (let i = 0; i < trailLength; i++) {
                        trailPoints.push(new THREE.Vector3(p.x, p.y - 0.5, p.z));
                    }
                    const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
                    const trailGeo = new THREE.TubeGeometry(trailCurve, 64, 0.2, 8, false);
                    const trailMat = new THREE.MeshBasicMaterial({ color: 0x00d6ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
                    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
                    scene.add(trailMesh);
                    trailMeshes.current[id] = { mesh: trailMesh, points: trailPoints };
                }

                // Update target position for smooth interpolation
                if (mesh.userData.targetPosition) {
                    mesh.userData.targetPosition.set(p.x, p.y, p.z);
                } else {
                    mesh.position.set(p.x, p.y, p.z);
                }

                // Update trail less frequently for performance (every 3 frames)
                if (trailMeshes.current[id]) {
                    const trailData = trailMeshes.current[id];
                    trailUpdateCounter.current++;

                    if (trailUpdateCounter.current >= 3) {
                        trailUpdateCounter.current = 0;

                        // Move existing trail points backward (away from player)
                        trailData.points.forEach(point => point.z -= 0.3); // Move trail behind player

                        // Remove oldest point and add new point at player's position
                        trailData.points.shift();
                        trailData.points.push(new THREE.Vector3(mesh.position.x, mesh.position.y - 0.5, mesh.position.z));

                        // Only update geometry when needed
                        const updatedCurve = new THREE.CatmullRomCurve3(trailData.points);
                        trailData.mesh.geometry.dispose();
                        trailData.mesh.geometry = new THREE.TubeGeometry(updatedCurve, 32, 0.15, 6, false);
                    }
                }
            }

            const allObstacleIds = new Set(obstacles.map(o => o.id));
            for (const id in obstacleMeshes.current) {
                if (!allObstacleIds.has(id)) {
                    scene.remove(obstacleMeshes.current[id]);
                    delete obstacleMeshes.current[id];
                }
            }

            obstacles.forEach(o => {
                let mesh = obstacleMeshes.current[o.id];
                if (!mesh) {
                    mesh = new THREE.Mesh(boxGeo, boxMat);
                    mesh.castShadow = true;
                    scene.add(mesh);
                    obstacleMeshes.current[o.id] = mesh;
                }
                mesh.position.set(o.x, o.y, o.z);
            });

            setScore(serverScore);
        };

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (ws && ws.readyState === WebSocket.OPEN) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    ws.send(JSON.stringify({ roomId: gameId, playerId: playerId, action: 'input', payload: { input: 'left' } }));
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    ws.send(JSON.stringify({ roomId: gameId, playerId: playerId, action: 'input', payload: { input: 'right' } }));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        const onResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);
        onResize();

        let animationId;
        const animate = () => {
            const frameStart = performance.now();
            animationId = requestAnimationFrame(animate);

            // Lightweight interpolation for smooth movement
            const currentTime = Date.now();
            const timeSinceUpdate = currentTime - lastServerUpdate.current;

            // Only interpolate if we have recent server updates (within 100ms)
            if (timeSinceUpdate < 100) {
                for (const id in playerMeshes.current) {
                    const mesh = playerMeshes.current[id];
                    if (mesh && mesh.userData.targetPosition) {
                        // Check if position difference is significant enough to interpolate
                        const distance = mesh.position.distanceTo(mesh.userData.targetPosition);
                        if (distance > 0.01) { // Only interpolate if difference is noticeable
                            // Simple linear interpolation with small factor for smoothness
                            mesh.position.lerp(mesh.userData.targetPosition, 0.3);
                        } else {
                            // Snap to target if very close
                            mesh.position.copy(mesh.userData.targetPosition);
                        }
                    }
                }
            }

            const localPlayerMesh = playerMeshes.current[playerId];
            if (localPlayerMesh) {
                camera.position.x = localPlayerMesh.position.x;
                camera.lookAt(localPlayerMesh.position);
            }

            renderer.render(scene, camera);

            // Performance monitoring
            const frameTime = performance.now() - frameStart;
            performanceStats.current.frameCount++;
            performanceStats.current.avgFrameTime = (performanceStats.current.avgFrameTime + frameTime) / 2;

            // Log performance warnings for frames taking too long
            if (frameTime > 16.67) { // More than one frame at 60fps
                console.warn(`Slow frame: ${frameTime.toFixed(2)}ms (avg: ${performanceStats.current.avgFrameTime.toFixed(2)}ms)`);
            }
        };
        animate();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            // The WebSocket connection is managed by the App component, so we don't close it here.
            // It will be closed when the user navigates away or the game ends.
        };
    }, [gameId, ballColor, playerId, nickname, ws]);



    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0a0f14' }}>
            <canvas ref={mountRef} style={{ position: 'fixed', inset: 0, outline: 'none', width: '100%', height: '100%', objectFit: 'contain' }} tabIndex={0} />
            <div style={{ position: 'fixed', left: 0, right: 0, top: 0, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', color: '#e6f0ff', fontWeight: 600, letterSpacing: '.3px', mixBlendMode: 'difference', pointerEvents: 'none', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
                <div style={{ fontSize: '20px' }}>
                    Score: <span>{score}</span>
                </div>
                <div style={{ fontSize: '14px', opacity: .8 }}>
                    A/D or ◀︎▶︎ to move • SPACE to restart
                </div>
            </div>

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
                        <p style={{ margin: '6px 0', opacity: .7 }}>
                            Press SPACE to restart
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiplayerGame;
