import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

export default function GameWorld() {
  const groundRef = useRef<any>(null)

  useFrame(() => {
    if (groundRef.current) {
      // Animation logic here
    }
  })

  const blocks = [
    { pos: [0, 0.5, 0], color: '#fbbf24', label: 'Lucky' },
    { pos: [3, 0.5, 2], color: '#a855f7', label: 'Stardust' },
    { pos: [-3, 0.5, -2], color: '#22c55e', label: 'Growth' },
    { pos: [5, 0.5, -3], color: '#3b82f6', label: 'Water' },
    { pos: [-5, 0.5, 3], color: '#ef4444', label: 'Fire' },
    { pos: [2, 1.5, 5], color: '#f59e0b', label: 'Gold' },
    { pos: [-2, 1.5, -5], color: '#8b5cf6', label: 'Magic' },
    { pos: [6, 0.5, 1], color: '#14b8a6', label: 'Emerald' },
    { pos: [-6, 0.5, -1], color: '#ec4899', label: 'Ruby' },
    { pos: [0, 2, 8], color: '#6366f1', label: 'Diamond' },
  ]

  return (
    <group>
      {/* Ground with grid */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 50, 50]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[100, 50, '#22c55e', '#16a34a']} position={[0, 0.01, 0]} />

      {/* Lucky blocks with labels */}
      {blocks.map((block, i) => (
        <group key={i} position={block.pos as [number, number, number]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color={block.color} roughness={0.3} metalness={0.7} />
          </mesh>
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {block.label}
          </Text>
        </group>
      ))}

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.random() * 40 - 20,
            Math.random() * 5 + 1,
            Math.random() * 40 - 20
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Trees */}
      {[...Array(8)].map((_, i) => (
        <group key={`tree-${i}`} position={[
          Math.random() * 30 - 15,
          0,
          Math.random() * 30 - 15
        ]}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 2]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#228b22" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
