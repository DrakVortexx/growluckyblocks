import { useState } from 'react'
import { api } from '../lib/api'
import { useGameStore } from '../store/gameStore'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useGameStore(state => state.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Login
        const response = await api.login(email, password)
        console.log('Login response:', response)
        if (response.ok && response.user && response.token) {
          localStorage.setItem('token', response.token)
          setUser(response.user)
        }
      } else {
        // Signup
        if (username.length < 3) {
          setError('Username must be at least 3 characters')
          setLoading(false)
          return
        }
        const response = await api.signup(email, password, username)
        console.log('Signup response:', response)
        if (response.ok && response.user && response.token) {
          localStorage.setItem('token', response.token)
          setUser(response.user)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-8 w-full max-w-md border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">
          {isLogin ? 'Login' : 'Create Account'}
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-slate-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2 rounded transition-colors"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
