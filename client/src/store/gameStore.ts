import { create } from 'zustand'
import type { User, PlayerProfile, Server, WebSocketMessage } from '../../shared/types/index.js'

interface GameState {
  // Connection
  connected: boolean
  playerId: string | null
  serverId: string | null
  
  // User data
  user: User | null
  profile: PlayerProfile | null
  
  // Server data
  currentServer: Server | null
  servers: Server[]
  
  // Game state
  players: Array<{ playerId: string; username: string; x: number; z: number; yaw: number }>
  spawnDrops: any[]
  
  // Auth state
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  setConnected: (connected: boolean) => void
  setPlayerId: (playerId: string) => void
  setServerId: (serverId: string) => void
  setUser: (user: User | null) => void
  setProfile: (profile: PlayerProfile | null) => void
  setCurrentServer: (server: Server | null) => void
  setServers: (servers: Server[]) => void
  updatePlayerPosition: (playerId: string, x: number, z: number, yaw: number) => void
  handleWebSocketMessage: (message: WebSocketMessage) => void
  setIsLoading: (loading: boolean) => void
  logout: () => void
  initializeAuth: () => void
}

export const useGameStore = create<GameState>((set) => ({
  connected: false,
  playerId: null,
  serverId: null,
  user: null,
  profile: null,
  currentServer: null,
  servers: [],
  players: [],
  spawnDrops: [],
  isLoading: true,
  isAuthenticated: false,
  
  setConnected: (connected) => set({ connected }),
  setPlayerId: (playerId) => set({ playerId }),
  setServerId: (serverId) => set({ serverId }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setCurrentServer: (currentServer) => set({ currentServer }),
  setServers: (servers) => set({ servers }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, isAuthenticated: false })
  },
  initializeAuth: () => {
    const token = localStorage.getItem('token')
    if (token) {
      // Token exists, but we need to verify it with the server
      // For now, just set loading to false and let the user re-authenticate
      set({ isLoading: false, isAuthenticated: false })
    } else {
      set({ isLoading: false, isAuthenticated: false })
    }
  },
  updatePlayerPosition: (playerId, x, z, yaw) => set((state) => ({
    players: state.players.map(p => 
      p.playerId === playerId ? { ...p, x, z, yaw } : p
    )
  })),
  handleWebSocketMessage: (message) => {
    switch (message.type) {
      case 'world':
        if ('serverId' in message && 'serverLuck' in message) {
          set({
            serverId: message.serverId,
            spawnDrops: message.spawnDrops || [],
            players: message.players || []
          })
        }
        break
      case 'chat-message':
        // Handle chat messages
        break
      case 'steal-start':
        // Handle steal start
        break
      default:
        console.log('Unhandled message type:', message)
    }
  }
}))
