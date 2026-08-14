import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function GameWorld() {
  const groundRef = useRef<any>(null)

  useFrame(() => {
    if (groundRef.current) {
      // Animation logic here
    }
  })

  return (
    <group>
      {/* Ground */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

      {/* Simple blocks */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[Math.random() * 20 - 10, 0.5, Math.random() * 20 - 10]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      ))}
    </group>
  )
}
