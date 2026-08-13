import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Box, Sphere } from '@react-three/drei'
import * as THREE from 'three'

export default function GameWorld() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>

      {/* Base Platforms (8 slots around center) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 15
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return <BasePlatform key={i} position={[x, 0, z]} slot={i} />
      })}

      {/* Spawn Area */}
      <SpawnDropArea />

      {/* Players */}
      <Players />
    </group>
  )
}

function BasePlatform({ position, slot }: { position: [number, number, number]; slot: number }) {
  return (
    <group position={position}>
      {/* Platform base */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>

      {/* Pedestals */}
      {Array.from({ length: 10 }).map((_, i) => {
        const row = Math.floor(i / 5)
        const col = i % 5
        const x = (col - 2) * 1.5
        const z = (row - 0.5) * 1.5
        return <Pedestal key={i} position={[x, 0.5, z]} index={i} />
      })}

      {/* Slot label */}
      <Text
        position={[0, 3, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {`Slot ${slot + 1}`}
      </Text>
    </group>
  )
}

function Pedestal({ position, index }: { position: [number, number, number]; index: number }) {
  return (
    <group position={position}>
      {/* Pedestal base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.5, 8]} />
        <meshStandardMaterial color="#718096" />
      </mesh>

      {/* Placeholder for lucky block or creature */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#a0aec0" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

function SpawnDropArea() {
  return (
    <group position={[-10, 0, 6]}>
      {/* Spawn platform */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5, 5, 0.5, 32]} />
        <meshStandardMaterial color="#805ad5" />
      </mesh>

      {/* Glowing effect */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial
          color="#9f7aea"
          transparent
          opacity={0.3}
          emissive="#9f7aea"
          emissiveIntensity={0.5}
        />
      </mesh>

      <Text
        position={[0, 3, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Spawn Area
      </Text>
    </group>
  )
}

function Players() {
  const { players } = useGameStore()
  
  return (
    <>
      {players.map((player) => (
        <Player key={player.playerId} player={player} />
      ))}
    </>
  )
}

function Player({ player }: { player: { playerId: string; username: string; x: number; z: number; yaw: number } }) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(player.x, 1, player.z)
      groupRef.current.rotation.y = player.yaw
    }
  })

  return (
    <group ref={groupRef}>
      {/* Player body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.4, 1, 4, 8]} />
        <meshStandardMaterial color="#4299e1" />
      </mesh>

      {/* Player head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fbd38d" />
      </mesh>

      {/* Name tag */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {player.username}
      </Text>
    </group>
  )
}

// Import useGameStore at the top
import { useGameStore } from '../store/gameStore'
