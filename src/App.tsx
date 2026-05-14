
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Leaderboard from './components/Leaderboard'
import PlayerPicker from './components/PlayerPicker'
import SplashScreen from './components/SplashScreen'
import roundsData from './data/rounds.json'
import dictionaryRaw from '../google-10000-english.txt?raw'
import {
  createProfile,
  findProfileByName,
  getActiveProfile,
  getLeaderboard,
  hasProfiles,
  isProfileStoreCorrupted,
  listProfiles,
  resetProfileStore,
  setActiveProfile,
  updateProfile,
} from './services/profileStorage'
import type {
  LeaderboardMetric,
  PlayerProfile,
} from './types/player'
import './App.css'

import HangmanGame from './components/HangmanGame'

type Difficulty = 'simple' | 'hard' | 'hardest'

type Round = {
  bingo: string
  difficulty: Difficulty
  sub: string[]
  valid: Set<string>
}

type RoundSource = {
  bingo: string
  difficulty: Difficulty
  subWords?: string[]
  sub?: string[] | number
}

const ROUND_TIME_SECONDS = 120
const MAX_LEVELS = 100
const GENERATED_ROUND_TARGET = 900
const SUBWORD_LIMITS: Record<Difficulty, number> = {
  simple: 15,
  hard: 20,
  hardest: 30,
}

const BLOCKED_WORDS = new Set([
  'ANAL',
  'ASS',
  'BABES',
  'BEASTIALITY',
  'BLOWJOB',
  'BLOWJOBS',
  'BOOBS',
  'COCK',
  'CUM',
  'DICK',
  'DILDO',
  'FUCK',
  'FUCKING',
  'GAY',
  'HARDCORE',
  'HENTAI',
  'INCEST',
  'LESBIAN',
  'LESBIANS',
  'MILF',
  'MILFS',
  'NAKED',
  'NUDE',
  'PENIS',
  'PORN',
  'PORNO',
  'PUSSY',
  'RAPE',
  'SEXCAM',
  'SEXY',
  'SHEMALE',
  'SLUT',
  'TITS',
  'VOYEUR',
  'XXX',
])

function sortByLengthThenAlpha(words: string[]) {
  return [...words].sort((a, b) => {
    if (a.length !== b.length) {
      return a.length - b.length
    }

    return a.localeCompare(b)
  })
}

function shuffleLetters(letters: string[]) {
  const cloned = [...letters]

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cloned[i], cloned[j]] = [cloned[j], cloned[i]]
  }

  return cloned
}

function buildLetterMap(word: string) {
  const map = new Map<string, number>()

  for (const char of word) {
    map.set(char, (map.get(char) ?? 0) + 1)
  }

  return map
}

function canBuildFromLetters(word: string, source: string) {
  const sourceMap = buildLetterMap(source)

  for (const char of word) {
    const remaining = sourceMap.get(char) ?? 0

    if (remaining === 0) {
      return false
    }

    sourceMap.set(char, remaining - 1)
  }

  return true
}

function pickDifficultyByLength(length: number): Difficulty {
  if (length <= 6) {
    return 'simple'
  }

  if (length === 7) {
    return 'hard'
  }

  return 'hardest'
}

function normalizeSubWords(subWords: string[], bingo: string) {
  return sortByLengthThenAlpha(
    Array.from(
      new Set(
        subWords.filter(
          (word) =>
            /^[A-Z]{3,5}$/.test(word) &&
            word !== bingo &&
            !BLOCKED_WORDS.has(word),
        ),
      ),
    ),
  )
}

function toRound(
  bingo: string,
  difficulty: Difficulty,
  words: string[],
): Round {
  const sub = normalizeSubWords(words, bingo).slice(
    0,
    SUBWORD_LIMITS[difficulty],
  )

  return {
    bingo,
    difficulty,
    sub,
    valid: new Set<string>([...sub, bingo]),
  }
}

function createGeneratedRounds(existingBingos: Set<string>) {
  const dictionary = Array.from(
    new Set(
      dictionaryRaw
        .split(/\r?\n/)
        .map((word) => word.trim().toUpperCase())
        .filter((word) => /^[A-Z]+$/.test(word))
        .filter((word) => !BLOCKED_WORDS.has(word)),
    ),
  )

  const subWordDictionary = dictionary.filter(
    (word) => word.length >= 3 && word.length <= 5,
  )

  const bingoCandidates = shuffleLetters(
    dictionary.filter(
      (word) => word.length >= 6 && word.length <= 8,
    ),
  )

  const generated: Round[] = []

  for (const bingo of bingoCandidates) {
    if (generated.length >= GENERATED_ROUND_TARGET) {
      break
    }

    if (existingBingos.has(bingo)) {
      continue
    }

    const difficulty = pickDifficultyByLength(
      bingo.length,
    )

    const subWords = subWordDictionary.filter(
      (word) => canBuildFromLetters(word, bingo),
    )

    if (subWords.length < 5) {
      continue
    }

    generated.push(toRound(bingo, difficulty, subWords))
    existingBingos.add(bingo)
  }

  return generated
}

const ROUND_LIBRARY = (roundsData.wordPool || roundsData) as RoundSource[]

const CURATED_ROUNDS: Round[] = ROUND_LIBRARY.map((round) => {
  const bingo = round.bingo.trim().toUpperCase()
  const difficulty = round.difficulty

  const words = Array.isArray(round.subWords)
    ? round.subWords
    : Array.isArray(round.sub)
      ? round.sub
      : []

  return toRound(
    bingo,
    difficulty,
    words.map((word) => word.trim().toUpperCase()),
  )
})

const GENERATED_ROUNDS = createGeneratedRounds(
  new Set(CURATED_ROUNDS.map((round) => round.bingo)),
)

const ROUNDS: Round[] = [
  ...CURATED_ROUNDS,
  ...GENERATED_ROUNDS,
]

const SIMPLE_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'simple')
const HARD_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'hard')
const HARDEST_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'hardest')

type ModalAction = 'next' | 'retry' | 'restart' | null
type AppView =
  | 'splash'
  | 'new-game'
  | 'continue'
  | 'leaderboard'
  | 'game-select'
  | 'text-twist'
  | 'hangman'

function App() {
  const [view, setView] = useState<AppView>('splash')
  const [profiles, setProfiles] = useState<PlayerProfile[]>([])
  const [activeProfile, setActiveProfileState] =
    useState<PlayerProfile | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerError, setNewPlayerError] = useState('')
  const [duplicateProfile, setDuplicateProfile] =
    useState<PlayerProfile | null>(null)
  const [leaderboardMetric, setLeaderboardMetric] =
    useState<LeaderboardMetric>('total')

  const [currentLevel, setCurrentLevel] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [bestSingleRound, setBestSingleRound] =
    useState(0)
  const [bestTimeRaceSeconds, setBestTimeRaceSeconds] =
    useState<number | null>(null)
  const [roundScore, setRoundScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS)
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([])
  const [bingoFound, setBingoFound] = useState(false)
  const [isRoundOver, setIsRoundOver] = useState(false)
  const [usedWords, setUsedWords] = useState<string[]>([])

  const [feedback, setFeedback] = useState<{
    text: string
    tone: 'neutral' | 'good' | 'bad' | 'great'
  }>({
    text: '',
    tone: 'neutral',
  })

  const [isShaking, setIsShaking] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')
  const [modalButton, setModalButton] = useState('CONTINUE')
  const [modalAction, setModalAction] = useState<ModalAction>(null)
  const [canContinue, setCanContinue] = useState(false)
  const [storageCorrupted, setStorageCorrupted] = useState(false)

  const lastSavedSnapshot = useRef('')

  const getDifficultyPool = (level: number) => {
    if (level <= 30) return SIMPLE_ROUNDS
    if (level <= 70) return HARD_ROUNDS
    return HARDEST_ROUNDS
  }

  const getRandomRound = useCallback(
    (level: number, usedPool = usedWords) => {
      const pool = getDifficultyPool(level)

      const unused = pool.filter(
        (round) => !usedPool.includes(round.bingo),
      )

      const source = unused.length > 0 ? unused : pool

      return source[Math.floor(Math.random() * source.length)]
    },
    [usedWords],
  )

  const [round, setRound] = useState<Round>(() =>
    getRandomRound(1),
  )

  const foundSet = useMemo(
    () => new Set(foundWords),
    [foundWords],
  )

  const allWords = useMemo(() => {
    return [...round.sub, round.bingo].sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length
      }

      return a.localeCompare(b)
    })
  }, [round])

  useEffect(() => {
    // The current round should be marked as used exactly when round changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsedWords((prev) => {
      if (prev.includes(round.bingo)) {
        return prev
      }

      return [...prev, round.bingo]
    })
  }, [round])

  const startRound = useCallback(() => {
    setTimeLeft(ROUND_TIME_SECONDS)
    setFoundWords([])
    setCurrentGuess('')
    setRoundScore(0)
    setBingoFound(false)
    setIsRoundOver(false)
    setFeedback({ text: '', tone: 'neutral' })
    setScrambledLetters(shuffleLetters(round.bingo.split('')))
  }, [round])

  useEffect(() => {
    // Starting a fresh round is the intended side effect whenever source round changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRound()
  }, [startRound])

  const refreshProfiles = useCallback(() => {
    const nextProfiles = listProfiles()
    setProfiles(nextProfiles)
    setCanContinue(hasProfiles())
    setStorageCorrupted(isProfileStoreCorrupted())
  }, [])

  const hydrateFromProfile = useCallback(
    (profile: PlayerProfile) => {
      setCurrentLevel(profile.currentLevel)
      setTotalScore(profile.totalScore)
      setUsedWords(profile.usedWords)
      setBestSingleRound(profile.bestSingleRoundScore)
      setBestTimeRaceSeconds(profile.bestTimeRaceSeconds)
      setRound(getRandomRound(profile.currentLevel + 1, profile.usedWords))
      setModalOpen(false)
      setModalAction(null)
      setModalBody('')
      setModalButton('CONTINUE')
      setModalTitle('')
      setView('game-select')
      lastSavedSnapshot.current = ''
    },
    [getRandomRound],
  )

  const activateProfile = useCallback(
    (profileId: string) => {
      const profile = setActiveProfile(profileId)

      if (!profile) {
        return
      }

      setActiveProfileState(profile)
      hydrateFromProfile(profile)
      refreshProfiles()
    },
    [hydrateFromProfile, refreshProfiles],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshProfiles()

    const initialActive = getActiveProfile()

    if (initialActive) {
      setActiveProfileState(initialActive)
    }

    const onStorage = () => {
      refreshProfiles()
    }

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshProfiles])

  const showModal = useCallback(
    (
      title: string,
      body: string,
      button: string,
      action: ModalAction,
    ) => {
      setModalTitle(title)
      setModalBody(body)
      setModalButton(button)
      setModalAction(action)
      setModalOpen(true)
    },
    [],
  )

  const endRound = useCallback(() => {
    setIsRoundOver(true)

    if (bingoFound) {
      if (currentLevel >= MAX_LEVELS - 1) {
        showModal(
          'GAME COMPLETE!',
          `You conquered all ${MAX_LEVELS} levels.`,
          'PLAY AGAIN',
          'restart',
        )

        return
      }

      showModal(
        'LEVEL CLEARED',
        `Excellent work. You found ${round.bingo}.`,
        'NEXT LEVEL',
        'next',
      )

      return
    }

    showModal(
      'TIME UP',
      'Retry this level and keep hunting for the bingo word.',
      'RETRY LEVEL',
      'retry',
    )
  }, [
    bingoFound,
    currentLevel,
    round.bingo,
    showModal,
  ])

  useEffect(() => {
    if (!activeProfile || view !== 'text-twist') {
      return
    }

    const snapshot = JSON.stringify({
      id: activeProfile.id,
      currentLevel,
      totalScore,
      usedWords,
      bestSingleRound,
      bestTimeRaceSeconds,
    })

    if (snapshot === lastSavedSnapshot.current) {
      return
    }

    lastSavedSnapshot.current = snapshot

    updateProfile(activeProfile.id, {
      currentLevel,
      totalScore,
      usedWords,
      bestSingleRoundScore: bestSingleRound,
      bestTimeRaceSeconds,
      lastPlayedAt: Date.now(),
    })
  }, [
    activeProfile,
    bestSingleRound,
    bestTimeRaceSeconds,
    currentLevel,
    refreshProfiles,
    totalScore,
    usedWords,
    view,
  ])

  useEffect(() => {
    if (isRoundOver || modalOpen) {
      return
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRoundOver, modalOpen])

  useEffect(() => {
    if (timeLeft === 0 && !isRoundOver) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      endRound()
    }
  }, [timeLeft, isRoundOver, endRound])

  const clearGuess = useCallback(() => {
    setCurrentGuess('')
  }, [])

  const twistLetters = useCallback(() => {
    setScrambledLetters((prev) => shuffleLetters(prev))
  }, [])

  const addLetter = useCallback(
    (char: string) => {
      if (isRoundOver || modalOpen) {
        return
      }

      if (currentGuess.length >= round.bingo.length) {
        return
      }

      const totalInRack = scrambledLetters.filter(
        (letter) => letter === char,
      ).length

      const totalInGuess = currentGuess
        .split('')
        .filter((letter) => letter === char).length

      if (totalInGuess < totalInRack) {
        setCurrentGuess((prev) => `${prev}${char}`)
      }
    },
    [
      currentGuess,
      isRoundOver,
      modalOpen,
      round.bingo.length,
      scrambledLetters,
    ],
  )

  const submitWord = useCallback(() => {
    if (isRoundOver || modalOpen) {
      return
    }

    const guess = currentGuess.toUpperCase()

    if (guess.length < 3) {
      return
    }

    if (foundSet.has(guess)) {
      setFeedback({
        text: 'Already found',
        tone: 'neutral',
      })

      setCurrentGuess('')
      return
    }

    const isValid =
      round.valid.has(guess) || guess === round.bingo

    if (!isValid) {
      setFeedback({
        text: 'Not in list',
        tone: 'bad',
      })

      setIsShaking(true)

      window.setTimeout(() => {
        setIsShaking(false)
      }, 200)

      return
    }

    setFoundWords((prev) => [...prev, guess])

    const points =
      guess.length * 100 +
      (guess.length === round.bingo.length ? 1000 : 0)

    setTotalScore((prev) => prev + points)
    setRoundScore((prev) => {
      const next = prev + points
      setBestSingleRound((best) =>
        Math.max(best, next),
      )
      return next
    })

    if (guess === round.bingo) {
      setBingoFound(true)

      const elapsedSeconds = Math.max(
        1,
        ROUND_TIME_SECONDS - timeLeft,
      )

      setBestTimeRaceSeconds((prev) => {
        if (prev == null) {
          return elapsedSeconds
        }

        return Math.min(prev, elapsedSeconds)
      })

      setFeedback({
        text: 'BINGO!',
        tone: 'great',
      })
    } else {
      setFeedback({
        text: `Good! +${points}`,
        tone: 'good',
      })
    }

    setCurrentGuess('')
  }, [
    currentGuess,
    foundSet,
    isRoundOver,
    modalOpen,
    round,
    timeLeft,
  ])

  const onModalContinue = useCallback(() => {
    setModalOpen(false)

    if (modalAction === 'next') {
      const nextLevel = currentLevel + 1

      setCurrentLevel(nextLevel)

      const nextRound = getRandomRound(nextLevel + 1)
      setRound(nextRound)

      return
    }

    if (modalAction === 'retry') {
      startRound()
      return
    }

    if (modalAction === 'restart') {
      setCurrentLevel(0)
      setTotalScore(0)
      setBestSingleRound(0)
      setBestTimeRaceSeconds(null)
      setUsedWords([])

      const firstRound = getRandomRound(1)
      setRound(firstRound)

      startRound()
    }
  }, [
    currentLevel,
    getRandomRound,
    modalAction,
    startRound,
  ])

  const onStartNewGame = () => {
    setNewPlayerName('')
    setNewPlayerError('')
    setDuplicateProfile(null)
    setView('new-game')
  }

  const onCreateProfile = () => {
    const normalized = newPlayerName.trim()

    if (!normalized) {
      setNewPlayerError('Please enter a player name.')
      return
    }

    const existing = findProfileByName(normalized)

    if (existing) {
      setDuplicateProfile(existing)
      setNewPlayerError('')
      return
    }

    const profile = createProfile(normalized)
    setActiveProfileState(profile)
    refreshProfiles()
    hydrateFromProfile(profile)
  }

  const onContinueDuplicate = () => {
    if (!duplicateProfile) {
      return
    }

    activateProfile(duplicateProfile.id)
    setDuplicateProfile(null)
  }

  const onCreateDuplicateWithSuffix = () => {
    const normalized = newPlayerName.trim()

    if (!normalized) {
      return
    }

    const profile = createProfile(normalized, true)
    setActiveProfileState(profile)
    setDuplicateProfile(null)
    refreshProfiles()
    hydrateFromProfile(profile)
  }

  const onOpenLeaderboard = () => {
    refreshProfiles()
    setView('leaderboard')
  }

  const onResetCorruptedStorage = () => {
    resetProfileStore()
    setActiveProfileState(null)
    setProfiles([])
    setCanContinue(false)
    setStorageCorrupted(false)
    setDuplicateProfile(null)
    setNewPlayerError('')
    setView('splash')
  }

  const leaderboardRows = useMemo(
    () => getLeaderboard(leaderboardMetric),
    [leaderboardMetric],
  )

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  const timerText = `${mins
    .toString()
    .padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`

  const bestTimeText =
    bestTimeRaceSeconds == null
      ? '--:--'
      : `${Math.floor(bestTimeRaceSeconds / 60)
          .toString()
          .padStart(2, '0')}:${(bestTimeRaceSeconds % 60)
          .toString()
          .padStart(2, '0')}`

  useEffect(() => {
    if (view !== 'text-twist') return

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase()

      if (modalOpen) {
        if (key === 'ENTER' || key === ' ') {
          event.preventDefault()
          onModalContinue()
        }
        return
      }

      if (key === 'ENTER') {
        if (currentGuess.length > 0) {
          submitWord()
        } else if (bingoFound || isRoundOver) {
          endRound()
        }
        return
      }

      if (key === ' ') {
        event.preventDefault()
        if (currentGuess.length === 0 && (bingoFound || isRoundOver)) {
          endRound()
        } else {
          twistLetters()
        }
        return
      }

      if (isRoundOver) {
        return
      }

      if (key === 'ESCAPE') {
        event.preventDefault()
        clearGuess()
        return
      }

      if (key === 'BACKSPACE' || key === 'DELETE') {
        event.preventDefault()
        setCurrentGuess((prev) => prev.slice(0, -1))
        return
      }

      if (/^[A-Z]$/.test(key)) {
        addLetter(key)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    addLetter,
    bingoFound,
    clearGuess,
    currentGuess,
    endRound,
    isRoundOver,
    modalOpen,
    onModalContinue,
    submitWord,
    twistLetters,
    view,
  ])

  if (view === 'splash') {
    return (
      <div className="game-page">
        <SplashScreen
          onNewGame={onStartNewGame}
          onContinue={() => setView('continue')}
          onLeaderboard={onOpenLeaderboard}
          onResetCorruptedStorage={onResetCorruptedStorage}
          canContinue={canContinue}
          storageCorrupted={storageCorrupted}
        />
      </div>
    )
  }

  if (view === 'continue') {
    return (
      <div className="game-page">
        <PlayerPicker
          players={profiles}
          onSelect={activateProfile}
          onBack={() => setView('splash')}
        />
      </div>
    )
  }

  if (view === 'leaderboard') {
    return (
      <div className="game-page">
        <Leaderboard
          rows={leaderboardRows}
          metric={leaderboardMetric}
          onMetricChange={setLeaderboardMetric}
          onBack={() => setView('splash')}
        />
      </div>
    )
  }

  if (view === 'new-game') {
    return (
      <div className="game-page">
        <main className="menu-shell">
          <section className="menu-card">
            <h1>Create Player</h1>
            <p>
              Name your player profile. This account is
              stored on this device.
            </p>

            <label className="name-label" htmlFor="player-name">
              Player Name
            </label>

            <input
              id="player-name"
              className="name-input"
              value={newPlayerName}
              onChange={(event) => {
                setNewPlayerName(event.target.value)
                setNewPlayerError('')
              }}
              maxLength={24}
              placeholder="Enter name"
            />

            {newPlayerError ? (
              <p className="form-error">{newPlayerError}</p>
            ) : null}

            {duplicateProfile ? (
              <div className="duplicate-card">
                <p>
                  "{duplicateProfile.name}" already exists.
                  Continue this profile or create a new one
                  with a suffix.
                </p>

                <div className="menu-actions">
                  <button
                    className="menu-btn"
                    type="button"
                    onClick={onContinueDuplicate}
                  >
                    Continue Existing
                  </button>
                  <button
                    className="menu-btn menu-btn-primary"
                    type="button"
                    onClick={onCreateDuplicateWithSuffix}
                  >
                    Create New With Suffix
                  </button>
                </div>
              </div>
            ) : null}

            <div className="menu-actions">
              <button
                className="menu-btn menu-btn-primary"
                type="button"
                onClick={onCreateProfile}
              >
                Start Game
              </button>
              <button
                className="menu-btn menu-btn-ghost"
                type="button"
                onClick={() => setView('splash')}
              >
                Back
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'game-select') {
    return (
      <div className="game-page">
        <main className="menu-shell">
          <section className="menu-card">
            <p className="menu-kicker">Welcome, {activeProfile?.name}</p>
            <h1>Select Game</h1>
            <p>Choose your challenge mode</p>

            <div className="menu-actions">
              <button
                className="menu-btn menu-btn-primary"
                type="button"
                onClick={() => setView('text-twist')}
              >
                Text Twist 100
              </button>
              <button
                className="menu-btn"
                type="button"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderColor: 'transparent',
                  color: '#ffffff'
                }}
                onClick={() => setView('hangman')}
              >
                Hangman Pro
              </button>
              <button
                className="menu-btn menu-btn-ghost"
                type="button"
                onClick={() => setView('splash')}
              >
                Logout
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'hangman') {
    return (
      <div className="game-page">
        <HangmanGame 
          playerName={activeProfile?.name || 'Guest'} 
          onExit={() => setView('game-select')} 
        />
      </div>
    )
  }

  return (
    <div className="game-page">
      <main className="game-shell">
        <header className="game-header">
          <div>
            <h1 className="title">
              TEXT TWIST {MAX_LEVELS}
            </h1>

            <p className="sync">
              Randomized Levels Enabled
            </p>

            <p className="active-player">
              Player: {activeProfile?.name ?? 'Guest'}
            </p>
          </div>

          <div className="stats">
            <div>
              <span>Total Score</span>

              <strong>
                {totalScore.toString().padStart(6, '0')}
              </strong>
            </div>

            <div>
              <span>Time Remaining</span>

              <strong className="danger">
                {timerText}
              </strong>
            </div>

            <div>
              <span>Level</span>

              <strong className="ok">
                {currentLevel + 1} / {MAX_LEVELS}
              </strong>
            </div>

            <div>
              <span>Best Time</span>

              <strong>{bestTimeText}</strong>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="small-btn"
              onClick={onOpenLeaderboard}
            >
              Leaderboard
            </button>
            <button
              type="button"
              className="small-btn"
              onClick={() => setView('game-select')}
            >
              Games
            </button>
          </div>
        </header>

        <section className="game-main">
          <div className="word-matrix">
            {allWords.map((word) => {
              const solved = foundSet.has(word)

              return (
                <div className="word-row" key={word}>
                  {word.split('').map((char, index) => (
                    <div
                      className={`word-grid-box ${
                        solved ? 'filled' : ''
                      }`}
                      key={`${word}-${index}`}
                    >
                      {solved ? char : ''}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <aside className="side-panel">
            <div className="hint-box">
              <h2>Goal</h2>

              <p>
                Find the bingo word to unlock the
                next level.
              </p>

              <p>Round Score: {roundScore}</p>
            </div>

            <div
              className={`feedback feedback-${feedback.tone}`}
            >
              {feedback.text}
            </div>

            {bingoFound ? (
              <button
                className="next-now"
                type="button"
                onClick={endRound}
              >
                Next Level Now
              </button>
            ) : null}
          </aside>
        </section>

        <section className="controls">
          <div
            className={`guess-container ${
              isShaking ? 'shake' : ''
            }`}
          >
            {round.bingo.split('').map((_, index) => (
              <div
                className="input-slot"
                key={`slot-${index}`}
              >
                {currentGuess[index] ?? ''}
              </div>
            ))}
          </div>

          <div className="letter-rack">
            {scrambledLetters.map((char, index) => {
              const inGuess = currentGuess
                .split('')
                .filter((letter) => letter === char).length

              const maxAvailable = scrambledLetters.filter(
                (letter) => letter === char,
              ).length

              const used = inGuess >= maxAvailable

              return (
                <button
                  className={`letter-circle ${
                    used ? 'used' : ''
                  }`}
                  key={`${char}-${index}`}
                  onClick={() => addLetter(char)}
                  type="button"
                >
                  {char}
                </button>
              )
            })}
          </div>

          <div className="button-row">
            <button
              className="btn btn-twist"
              onClick={twistLetters}
              type="button"
            >
              Twist
            </button>

            <button
              className="btn btn-enter"
              onClick={submitWord}
              type="button"
            >
              Enter
            </button>

            <button
              className="btn btn-clear"
              onClick={clearGuess}
              type="button"
            >
              Clear
            </button>
          </div>
        </section>

        <footer className="app-footer">
          <p>
            Copyright 
            <a
              href="https://naicatech.com"
              target="_blank"
              rel="noreferrer"
            >
              naicatech.com
            </a>
          </p>
        </footer>
      </main>

      {modalOpen ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modalTitle}</h2>

            <p>{modalBody}</p>

            <button
              type="button"
              onClick={onModalContinue}
            >
              {modalButton}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
