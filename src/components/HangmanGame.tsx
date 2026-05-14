import React, { useState, useEffect, useCallback } from 'react'
import './HangmanGame.css'

type Difficulty = 'easy' | 'medium' | 'hard'

type WordData = {
  word: string
  hint: string
  category: string
}

const WORD_DATABASE: Record<Difficulty, WordData[]> = {
  easy: [
    { word: "APPLE", hint: "A red fruit you eat", category: "Fruit" },
    { word: "OCEAN", hint: "Large body of saltwater", category: "Nature" },
    { word: "PIZZA", hint: "Italian cheesy food", category: "Food" },
    { word: "TIGER", hint: "Orange striped big cat", category: "Animal" },
    { word: "SPACE", hint: "Where stars and planets are", category: "Astronomy" },
    { word: "LEMON", hint: "Sour yellow citrus fruit", category: "Fruit" },
    { word: "BREAD", hint: "Baked grain food", category: "Food" },
    { word: "RIVER", hint: "Flowing water body", category: "Nature" },
    { word: "SNAKE", hint: "Reptile with no legs", category: "Animal" },
    { word: "MUSIC", hint: "Organized sound and melody", category: "Art" },
  ],
  medium: [
    { word: "GUITAR", hint: "String musical instrument", category: "Music" },
    { word: "PLANET", hint: "Celestial body orbiting a star", category: "Space" },
    { word: "COFFEE", hint: "Popular hot beverage", category: "Drink" },
    { word: "WIZARD", hint: "Magic spell caster", category: "Fantasy" },
    { word: "JUNGLE", hint: "Dense tropical forest", category: "Nature" },
    { word: "PALACE", hint: "Royal residence", category: "Architecture" },
    { word: "DRAGON", hint: "Mythical fire-breathing creature", category: "Fantasy" },
    { word: "ROCKET", hint: "Spacecraft for space travel", category: "Technology" },
    { word: "DIAMOND", hint: "Precious sparkling gemstone", category: "Gem" },
    { word: "CRYSTAL", hint: "Clear transparent mineral", category: "Mineral" },
  ],
  hard: [
    { word: "ASTRONAUT", hint: "Space explorer", category: "Space" },
    { word: "LABYRINTH", hint: "Complex maze structure", category: "Structure" },
    { word: "SPAGHETTI", hint: "Long pasta noodles", category: "Food" },
    { word: "MICROPHONE", hint: "Device that amplifies sound", category: "Technology" },
    { word: "TELEVISION", hint: "Broadcasting entertainment device", category: "Technology" },
    { word: "LIGHTHOUSE", hint: "Beacon for ships at sea", category: "Navigation" },
    { word: "HURRICANE", hint: "Powerful tropical storm", category: "Weather" },
    { word: "BUTTERFLY", hint: "Colorful flying insect", category: "Insect" },
    { word: "ALGORITHM", hint: "Step-by-step problem solving procedure", category: "Computing" },
    { word: "ADVENTURE", hint: "Exciting journey or experience", category: "Experience" },
  ]
}

const MAX_GUESSES: Record<Difficulty, number> = { easy: 8, medium: 6, hard: 4 }

type HangmanGameProps = {
  playerName: string
  onExit: () => void
}

const HangmanGame: React.FC<HangmanGameProps> = ({ playerName, onExit }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [wrongGuesses, setWrongGuesses] = useState(0)
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set())
  const [hintUsed, setHintUsed] = useState(false)
  const [currentWordData, setCurrentWordData] = useState<WordData>(WORD_DATABASE.easy[0])
  
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'difficulty-select'>('playing')
  const [pointsEarned, setPointsEarned] = useState(0)

  const selectNewWord = useCallback((diff: Difficulty) => {
    const words = WORD_DATABASE[diff]
    const randomIndex = Math.floor(Math.random() * words.length)
    setCurrentWordData(words[randomIndex])
    setWrongGuesses(0)
    setGuessedLetters(new Set())
    setHintUsed(false)
    setGameState('playing')
  }, [])

  // Initial load or difficulty change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    selectNewWord(difficulty)
  }, [difficulty, selectNewWord])

  const handleGuess = useCallback((letter: string) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return

    const newGuessed = new Set(guessedLetters)
    newGuessed.add(letter)
    setGuessedLetters(newGuessed)

    const word = currentWordData.word.toUpperCase()
    let newWrong = wrongGuesses

    if (!word.includes(letter)) {
      newWrong = wrongGuesses + 1
      setWrongGuesses(newWrong)
    }

    // Check status
    const isWon = word.split('').every(l => newGuessed.has(l))
    const isLost = newWrong >= MAX_GUESSES[difficulty]

    if (isWon) {
      const basePoints = 50
      const diffMultiplier = { easy: 1, medium: 2, hard: 3 }
      const totalPoints = basePoints + (basePoints * diffMultiplier[difficulty]) + (level * 10) + (streak * 5)
      
      setPointsEarned(totalPoints)
      setScore(prev => prev + totalPoints)
      setStreak(prev => prev + 1)
      setLevel(prev => prev + 1)
      setGameState('won')
    } else if (isLost) {
      setPointsEarned(0)
      setStreak(0)
      setGameState('lost')
    }
  }, [gameState, guessedLetters, currentWordData.word, wrongGuesses, difficulty, level, streak])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toUpperCase()
      if (/^[A-Z]$/.test(char)) {
        handleGuess(char)
      } else if (e.key === 'Enter' && gameState !== 'playing') {
        if (gameState === 'won') {
          selectNewWord(difficulty)
        } else if (gameState === 'lost') {
          selectNewWord(difficulty)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleGuess, gameState, selectNewWord, difficulty])

  const renderHangman = () => {
    return (
      <svg viewBox="0 0 100 120" className="hangman-svg">
        <path d="M10,110 L90,110 M25,110 L25,15 L75,15 L75,30" className="hangman-gallows" strokeWidth="4" fill="none" />
        {wrongGuesses > 0 && <line x1="75" y1="30" x2="75" y2="45" className="hangman-part" strokeWidth="2" />}
        {wrongGuesses > 1 && <circle cx="75" cy="55" r="10" className="hangman-part" fill="none" strokeWidth="3" />}
        {wrongGuesses > 2 && <line x1="75" y1="65" x2="75" y2="85" className="hangman-part" strokeWidth="3" />}
        {wrongGuesses > 3 && <line x1="75" y1="72" x2="55" y2="65" className="hangman-part" strokeWidth="3" />}
        {wrongGuesses > 4 && <line x1="75" y1="72" x2="95" y2="65" className="hangman-part" strokeWidth="3" />}
        {wrongGuesses > 5 && <line x1="75" y1="85" x2="60" y2="105" className="hangman-part" strokeWidth="3" />}
        {wrongGuesses > 6 && <line x1="75" y1="85" x2="90" y2="105" className="hangman-part" strokeWidth="3" />}
      </svg>
    )
  }

  return (
    <div className="hangman-container">
      <header className="hangman-header">
        <div className="hangman-stats-hud">
          <div className="stat-box">
            <span>Difficulty</span>
            <strong>{difficulty.toUpperCase()}</strong>
          </div>
          <div className="stat-box">
            <span>Level</span>
            <strong>{level}</strong>
          </div>
          <div className="stat-box">
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div className="stat-box">
            <span>Streak</span>
            <strong>🔥 {streak}</strong>
          </div>
        </div>
        <div className="player-info">Player: {playerName}</div>
      </header>

      <main className="hangman-main">
        <div className="stage-area">
          {renderHangman()}
          <div className="hearts-display">
            {Array.from({ length: Math.max(0, MAX_GUESSES[difficulty] - wrongGuesses) }).map((_, i) => (
              <span key={i}>❤️</span>
            ))}
          </div>
        </div>

        <div className="hint-section">
          <div className="hint-header">
            <span>💡 Category: {currentWordData.category}</span>
            <button 
              className={`hint-btn ${hintUsed ? 'used' : ''}`} 
              onClick={() => !hintUsed && setHintUsed(true)}
              disabled={hintUsed}
            >
              {hintUsed ? 'HINT USED' : 'USE HINT'}
            </button>
          </div>
          <p className="hint-text">{hintUsed ? currentWordData.hint : 'Hint hidden...'}</p>
        </div>

        <div className="word-display">
          {currentWordData.word.split('').map((char, i) => (
            <div key={i} className="letter-slot">
              {guessedLetters.has(char.toUpperCase()) ? char : ''}
            </div>
          ))}
        </div>

        <div className="hangman-keyboard">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
            const used = guessedLetters.has(l)
            const correct = currentWordData.word.toUpperCase().includes(l)
            return (
              <button
                key={l}
                onClick={() => handleGuess(l)}
                disabled={used || gameState !== 'playing'}
                className={`key-btn ${used ? (correct ? 'correct' : 'wrong') : ''}`}
              >
                {l}
              </button>
            )
          })}
        </div>
      </main>

      <footer className="hangman-footer">
        <button className="exit-btn" onClick={onExit}>Save & Exit</button>
        <button className="restart-btn" onClick={() => {
          setLevel(1)
          setScore(0)
          setStreak(0)
          selectNewWord(difficulty)
        }}>Restart</button>
      </footer >

      {gameState !== 'playing' && gameState !== 'difficulty-select' && (
        <div className="hangman-modal-overlay">
          <div className={`hangman-modal-content ${gameState}`}>
            <div className="modal-emoji">{gameState === 'won' ? '🎉' : '😢'}</div>
            <h2>{gameState === 'won' ? 'PERFECT!' : 'GAME OVER'}</h2>
            <p>
              {gameState === 'won' 
                ? `You cleared Level ${level - 1}` 
                : `The word was ${currentWordData.word.toUpperCase()}`}
            </p>
            <div className="points-display">
              <span>Points Earned</span>
              <strong>+{pointsEarned}</strong>
            </div>
            <div className="modal-actions">
              <button onClick={() => setGameState('difficulty-select')}>Change Difficulty</button>
              <button className="primary" onClick={() => selectNewWord(difficulty)}>
                {gameState === 'won' ? 'Next Game' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'difficulty-select' && (
        <div className="hangman-modal-overlay">
          <div className="hangman-modal-content difficulty-select">
            <h2>Select Difficulty</h2>
            <div className="difficulty-options">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <button 
                  key={diff} 
                  className={`diff-opt ${diff}`}
                  onClick={() => {
                    setDifficulty(diff)
                    selectNewWord(diff)
                  }}
                >
                  {diff.toUpperCase()} - {MAX_GUESSES[diff]} Guesses
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HangmanGame
