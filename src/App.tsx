
import { useCallback, useEffect, useMemo, useState } from 'react'
import roundsData from './data/rounds.json'
import './App.css'

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
const SUBWORD_LIMITS: Record<Difficulty, number> = {
  simple: 15,
  hard: 20,
  hardest: 30,
}

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

const ROUND_LIBRARY = (roundsData.wordPool || roundsData) as RoundSource[]

const ROUNDS: Round[] = ROUND_LIBRARY.map((round) => {
  const bingo = round.bingo.trim().toUpperCase()
  const difficulty = round.difficulty

  const words = Array.isArray(round.subWords)
    ? round.subWords
    : Array.isArray(round.sub)
      ? round.sub
      : []

  const normalized = sortByLengthThenAlpha(
    Array.from(
      new Set(
        words
          .map((word) => word.trim().toUpperCase())
          .filter((word) => /^[A-Z]{3,5}$/.test(word) && word !== bingo),
      ),
    ),
  )

  const sub = normalized.slice(0, SUBWORD_LIMITS[difficulty])

  const valid = new Set<string>([...sub, bingo])

  return {
    bingo,
    difficulty,
    sub,
    valid,
  }
})

const SIMPLE_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'simple')
const HARD_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'hard')
const HARDEST_ROUNDS = ROUNDS.filter((r) => r.difficulty === 'hardest')

type ModalAction = 'next' | 'retry' | 'restart' | null

function App() {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
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

  const getDifficultyPool = (level: number) => {
    if (level <= 30) return SIMPLE_ROUNDS
    if (level <= 70) return HARD_ROUNDS
    return HARDEST_ROUNDS
  }

  const getRandomRound = useCallback(
    (level: number) => {
      const pool = getDifficultyPool(level)

      const unused = pool.filter(
        (round) => !usedWords.includes(round.bingo),
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
    setBingoFound(false)
    setIsRoundOver(false)
    setFeedback({ text: '', tone: 'neutral' })
    setScrambledLetters(shuffleLetters(round.bingo.split('')))
  }, [round])

  useEffect(() => {
    startRound()
  }, [startRound])

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

    if (guess === round.bingo) {
      setBingoFound(true)

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
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalOpen || isRoundOver) {
        return
      }

      const key = event.key.toUpperCase()

      if (key === 'ENTER') {
        submitWord()
        return
      }

      if (key === 'BACKSPACE' || key === 'DELETE') {
        event.preventDefault()
        setCurrentGuess((prev) => prev.slice(0, -1))
        return
      }

      if (key === ' ') {
        event.preventDefault()
        twistLetters()
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
    isRoundOver,
    modalOpen,
    submitWord,
    twistLetters,
  ])

  const onModalContinue = () => {
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
      setUsedWords([])

      const firstRound = getRandomRound(1)
      setRound(firstRound)

      startRound()
    }
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  const timerText = `${mins
    .toString()
    .padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`

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
