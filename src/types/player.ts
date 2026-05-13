export type PlayerProfile = {
  id: string
  name: string
  createdAt: number
  lastPlayedAt: number
  currentLevel: number
  totalScore: number
  usedWords: string[]
  bestSingleRoundScore: number
  bestTimeRaceSeconds: number | null
}

export type LeaderboardMetric = 'total' | 'single' | 'time'

export type LeaderboardRow = {
  id: string
  name: string
  currentLevel: number
  totalScore: number
  bestSingleRoundScore: number
  bestTimeRaceSeconds: number | null
  lastPlayedAt: number
}
