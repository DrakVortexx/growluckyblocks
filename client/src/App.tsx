import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Sky } from '@react-three/drei'
import { Suspense } from 'react'
import GameWorld from './components/GameWorld'
import UI from './components/UI'
import Auth from './components/Auth'
import { useGameStore } from './store/gameStore'

function App() {
  const { user } = useGameStore()

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {!user && <Auth />}
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 10, 20], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Environment */}
          <Sky sunPosition={[100, 20, 100]} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          {/* Game World */}
          <GameWorld />
          
          {/* Camera Controls */}
          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={50}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      {user && <UI />}
    </div>
  )
}

export default App
