const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://growluckyblocks-tfpd.onrender.com';

console.log('API URL:', API_URL);

export interface ApiResponse {
  ok?: boolean;
  user?: any;
  servers?: any[];
  error?: string;
  token?: string;
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse> {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  health: () => apiRequest('/health'),
  
  signup: (email: string, password: string, username: string) =>
    apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    }),
  
  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  getServers: () => apiRequest('/api/servers'),
  
  createServer: (data: { name: string; description?: string; isPrivate?: boolean; maxPlayers?: number }) =>
    apiRequest('/api/servers/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getPlayer: () => apiRequest('/api/player/me'),
};
