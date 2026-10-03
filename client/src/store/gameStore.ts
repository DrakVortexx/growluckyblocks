import { create } from 'zustand'

interface User {
  id: string;
  username: string;
  email: string;
}

interface PlayerProfile {
  money: number;
  stardust: number;
  seeds: number;
  level: number;
  xp: number;
}

interface GameState {
  user: User | null;
  profile: PlayerProfile | null;
  connected: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: PlayerProfile | null) => void;
  setConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  profile: null,
  connected: false,
  isLoading: true,
  isAuthenticated: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setConnected: (connected) => set({ connected }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
  initializeAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ isLoading: false, isAuthenticated: false });
    } else {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}))
