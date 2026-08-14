import { useGameStore } from '../store/gameStore'

export default function UI() {
  const { user, profile, connected } = useGameStore()

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
        {/* Player info */}
        {user && (
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
            <div className="text-white font-bold">{user.username}</div>
            {profile && (
              <div className="text-sm text-slate-300 mt-2">
                <div>Money: ${profile.money.toLocaleString()}</div>
                <div>Stardust: {profile.stardust.toLocaleString()}</div>
                <div>Seeds: {profile.seeds.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}

        {/* Connection status */}
        <div className={`px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Controls help */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
        <div className="text-white text-sm">
          <div className="font-bold mb-2">Controls</div>
          <div>WASD - Move</div>
          <div>Mouse - Look</div>
          <div>E - Interact</div>
          <div>F - Open Block</div>
          <div>Q - Shop</div>
        </div>
      </div>
    </div>
  )
}
