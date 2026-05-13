type SplashScreenProps = {
  onNewGame: () => void
  onContinue: () => void
  onLeaderboard: () => void
  onResetCorruptedStorage: () => void
  canContinue: boolean
  storageCorrupted: boolean
}

function SplashScreen({
  onNewGame,
  onContinue,
  onLeaderboard,
  onResetCorruptedStorage,
  canContinue,
  storageCorrupted,
}: SplashScreenProps) {
  return (
    <main className="menu-shell">
      <section className="menu-card">
        <p className="menu-kicker">Text Twist 100</p>
        <h1>Word Rush League</h1>
        <p>
          Build your profile, clear levels, and climb the
          local leaderboard.
        </p>

        {storageCorrupted ? (
          <div className="storage-warning">
            <p>
              Profile storage appears corrupted. Reset local
              profile data to recover.
            </p>

            <button
              className="menu-btn menu-btn-danger"
              type="button"
              onClick={onResetCorruptedStorage}
            >
              Reset Corrupted Storage
            </button>
          </div>
        ) : null}

        <div className="menu-actions">
          <button
            className="menu-btn menu-btn-primary"
            type="button"
            onClick={onNewGame}
          >
            New Game
          </button>

          {canContinue ? (
            <button
              className="menu-btn"
              type="button"
              onClick={onContinue}
            >
              Continue
            </button>
          ) : null}

          <button
            className="menu-btn menu-btn-ghost"
            type="button"
            onClick={onLeaderboard}
          >
            Leaderboard
          </button>
        </div>
      </section>
    </main>
  )
}

export default SplashScreen
