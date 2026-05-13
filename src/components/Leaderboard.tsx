import { useMemo, useState } from 'react'
import type {
  LeaderboardMetric,
  LeaderboardRow,
} from '../types/player'

type LeaderboardProps = {
  rows: LeaderboardRow[]
  metric: LeaderboardMetric
  onMetricChange: (metric: LeaderboardMetric) => void
  onBack: () => void
}

function formatDate(value: number) {
  return new Date(value).toLocaleString()
}

function formatSeconds(value: number | null) {
  if (value == null) {
    return '--'
  }

  const mins = Math.floor(value / 60)
  const secs = value % 60

  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

function Leaderboard({
  rows,
  metric,
  onMetricChange,
  onBack,
}: LeaderboardProps) {
  const [limit, setLimit] = useState(15)

  const visibleRows = useMemo(
    () => rows.slice(0, limit),
    [rows, limit],
  )

  return (
    <main className="menu-shell">
      <section className="menu-card menu-card-wide">
        <h1>Leaderboard</h1>
        <p>Progress and scores stored per player.</p>

        <div className="leaderboard-tabs">
          <button
            type="button"
            className={
              metric === 'total' ? 'active' : ''
            }
            onClick={() => onMetricChange('total')}
          >
            Total Score
          </button>

          <button
            type="button"
            className={
              metric === 'single' ? 'active' : ''
            }
            onClick={() => onMetricChange('single')}
          >
            Best Single Round
          </button>

          <button
            type="button"
            className={
              metric === 'time' ? 'active' : ''
            }
            onClick={() => onMetricChange('time')}
          >
            Time Race
          </button>
        </div>

        {visibleRows.length === 0 ? (
          <p className="empty-copy">
            No players yet. Start a new game to populate
            this board.
          </p>
        ) : (
          <div className="leaderboard-list">
            {visibleRows.map((row, index) => (
              <article key={row.id} className="board-row">
                <span className="rank">#{index + 1}</span>
                <div>
                  <h2>{row.name}</h2>
                  <p>
                    Level {row.currentLevel + 1} | Last played{' '}
                    {formatDate(row.lastPlayedAt)}
                  </p>
                </div>
                <strong>
                  {metric === 'total'
                    ? row.totalScore.toLocaleString()
                    : metric === 'single'
                      ? row.bestSingleRoundScore.toLocaleString()
                      : formatSeconds(row.bestTimeRaceSeconds)}
                </strong>
              </article>
            ))}
          </div>
        )}

        {rows.length > visibleRows.length ? (
          <button
            type="button"
            className="menu-btn"
            onClick={() => setLimit((prev) => prev + 10)}
          >
            Show More
          </button>
        ) : null}

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

export default Leaderboard
