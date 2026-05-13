import type { PlayerProfile } from '../types/player'

type PlayerPickerProps = {
  players: PlayerProfile[]
  onSelect: (profileId: string) => void
  onBack: () => void
}

function PlayerPicker({
  players,
  onSelect,
  onBack,
}: PlayerPickerProps) {
  return (
    <main className="menu-shell">
      <section className="menu-card menu-card-wide">
        <h1>Continue Profile</h1>
        <p>Select a player on this device.</p>

        <ul className="player-list">
          {players.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="player-row"
                onClick={() => onSelect(player.id)}
              >
                <strong>{player.name}</strong>
                <span>
                  Level {player.currentLevel + 1} | Score{' '}
                  {player.totalScore}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          className="menu-btn menu-btn-ghost"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      </section>
    </main>
  )
}

export default PlayerPicker
