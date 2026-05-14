import React, { useState, useCallback, useRef } from 'react'
import './WordwormGame.css'

const LETTERS = "EEEEEEEEEEEEEEEEEEEEEEEEEEAAAAAAAAAAAAAIIIIIIIIIIIIIOOOOOOOOOOOOONNNNNNNNNNNRRRRRRRRRRRTTTTTTTTTTTTLLLLLLLLSSSSSSSSUUUUUUUUUDDDDDDDGGGGGGGBBBBBCCCCCPPPPPFFFFFHHHHHMMMMMVVVVWWWWYYYYKKKKJJJJQQQQXXXXZZZZ"

type Enemy = {
  name: string
  hp: number
  attack: number
  sprite: string
  stage: string
}

const ENEMIES: Enemy[] = [
  { name: "Ancient Slime", hp: 40, attack: 5, sprite: "💧", stage: "The Whispering Woods" },
  { name: "Forest Goblin", hp: 60, attack: 8, sprite: "👺", stage: "The Whispering Woods" },
  { name: "Cursed Tree", hp: 80, attack: 10, sprite: "🌳", stage: "The Whispering Woods" },
  { name: "Stone Golem", hp: 120, attack: 15, sprite: "🗿", stage: "The Deep Caverns" },
  { name: "Lava Elemental", hp: 150, attack: 20, sprite: "🔥", stage: "The Deep Caverns" },
  { name: "Shadow Dragon", hp: 300, attack: 35, sprite: "🐉", stage: "The Final Spire" }
]

type DamagePopup = {
  id: number
  amount: number
  x: number
  y: number
}

type WordwormGameProps = {
  playerName: string
  dictionary: Set<string>
  onExit: () => void
}

const WordwormGame: React.FC<WordwormGameProps> = ({ playerName, dictionary, onExit }) => {
  const [playerHP, setPlayerHP] = useState(100)
  const [playerMaxHP, setPlayerMaxHP] = useState(100)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [enemyIndex, setEnemyIndex] = useState(0)
  const [enemyHP, setEnemyHP] = useState(ENEMIES[0].hp)
  const [enemyMaxHP, setEnemyMaxHP] = useState(ENEMIES[0].hp)
  
  const [grid, setGrid] = useState<string[]>(() => {
    const initialGrid = []
    for (let i = 0; i < 16; i++) {
      initialGrid.push(LETTERS[Math.floor(Math.random() * LETTERS.length)])
    }
    return initialGrid
  })
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([])
  const [modal, setModal] = useState<{ title: string, message: string, btn: string } | null>(null)
  
  const [playerAnim, setPlayerAnim] = useState('')
  const [enemyAnim, setEnemyAnim] = useState('')
  
  const playerSpriteRef = useRef<HTMLDivElement>(null)
  const enemySpriteRef = useRef<HTMLDivElement>(null)

  const generateGrid = useCallback(() => {
    const newGrid = []
    for (let i = 0; i < 16; i++) {
      newGrid.push(LETTERS[Math.floor(Math.random() * LETTERS.length)])
    }
    setGrid(newGrid)
  }, [])

  // Remove the useEffect for initial generateGrid as it is now in useState initializer

  const currentWord = selectedIndices.map(i => grid[i]).join('')
  const isValidWord = currentWord.length >= 3 && dictionary.has(currentWord.toUpperCase())

  const calculateDamage = (word: string) => {
    let base = word.length * 5
    if (word.length > 4) base += (word.length - 4) * 10
    if (word.length > 6) base += 25
    
    const rarities: Record<string, number> = { 'Q': 20, 'Z': 20, 'X': 15, 'J': 15, 'K': 10 }
    for (const char of word) {
      if (rarities[char]) base += rarities[char]
    }
    return base
  }

  const showDamage = (amount: number, target: 'player' | 'enemy') => {
    const ref = target === 'player' ? playerSpriteRef : enemySpriteRef
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const id = Date.now() + Math.random()
    
    setDamagePopups(prev => [...prev, {
      id,
      amount,
      x: rect.left + rect.width / 2,
      y: rect.top
    }])
    
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id))
    }, 1000)
  }

  const handleAttack = async () => {
    if (isProcessing || !isValidWord) return
    setIsProcessing(true)
    
    const damage = calculateDamage(currentWord)
    
    // Player Attack Anim
    setPlayerAnim('translateX(50px) scale(1.2)')
    setTimeout(() => setPlayerAnim(''), 200)
    
    showDamage(damage, 'enemy')
    
    const newEnemyHP = Math.max(0, enemyHP - damage)
    setEnemyHP(newEnemyHP)
    
    // Replace used tiles
    setGrid(prev => {
      const next = [...prev]
      selectedIndices.forEach(idx => {
        next[idx] = LETTERS[Math.floor(Math.random() * LETTERS.length)]
      })
      return next
    })
    setSelectedIndices([])
    
    if (newEnemyHP === 0) {
      setTimeout(() => victory(), 800)
    } else {
      setTimeout(() => enemyTurn(), 1000)
    }
  }

  const enemyTurn = () => {
    const enemy = ENEMIES[enemyIndex]
    const dmg = enemy.attack + Math.floor(Math.random() * 5)
    
    setEnemyAnim('shaking')
    setTimeout(() => setEnemyAnim(''), 500)
    
    showDamage(dmg, 'player')
    
    setPlayerHP(prev => {
      const next = Math.max(0, prev - dmg)
      if (next === 0) {
        setTimeout(() => gameOver(), 500)
      } else {
        setIsProcessing(false)
      }
      return next
    })
  }

  const victory = () => {
    if (enemyIndex + 1 >= ENEMIES.length) {
      setModal({
        title: "Quest Complete!",
        message: "You are the ultimate Wordworm! Every monster has been defeated.",
        btn: "FINISH"
      })
    } else {
      const next = ENEMIES[enemyIndex + 1]
      setModal({
        title: "Enemy Defeated!",
        message: `${playerName} grows stronger! Next up: ${next.name}`,
        btn: "CONTINUE"
      })
    }
  }

  const gameOver = () => {
    setModal({
      title: "Game Over",
      message: "Your vocabulary wasn't enough this time. Try again?",
      btn: "RESTART"
    })
  }

  const handleModalBtn = () => {
    if (modal?.btn === "RESTART") {
      restartGame()
    } else if (modal?.btn === "FINISH") {
      onExit()
    } else {
      nextEnemy()
    }
    setModal(null)
  }

  const nextEnemy = () => {
    const nextIdx = enemyIndex + 1
    setEnemyIndex(nextIdx)
    const next = ENEMIES[nextIdx]
    setEnemyHP(next.hp)
    setEnemyMaxHP(next.hp)
    
    setPlayerLevel(prev => prev + 1)
    setPlayerMaxHP(prev => prev + 20)
    setPlayerHP(prev => prev + 20 + (playerMaxHP - prev)) // Heal to full basically
    
    setIsProcessing(false)
  }

  const restartGame = () => {
    setPlayerHP(100)
    setPlayerMaxHP(100)
    setPlayerLevel(1)
    setEnemyIndex(0)
    setEnemyHP(ENEMIES[0].hp)
    setEnemyMaxHP(ENEMIES[0].hp)
    generateGrid()
    setIsProcessing(false)
    setSelectedIndices([])
  }

  const toggleTile = (index: number) => {
    if (isProcessing) return
    
    const pos = selectedIndices.indexOf(index)
    if (pos > -1) {
      if (pos === selectedIndices.length - 1) {
        setSelectedIndices(prev => prev.slice(0, -1))
      }
    } else {
      setSelectedIndices(prev => [...prev, index])
    }
  }

  const scramble = () => {
    if (isProcessing) return
    setPlayerHP(prev => Math.max(1, prev - 5))
    generateGrid()
    setSelectedIndices([])
  }

  return (
    <div className="wordworm-container">
      {/* HUD */}
      <div className="ww-hud">
        <div className="ww-hud-section">
          <div className="ww-label-row">
            <span className="font-bold">{playerName}</span>
            <span className="ww-level-badge">LVL {playerLevel}</span>
          </div>
          <div className="ww-health-bar">
            <div 
              className="ww-health-fill player" 
              style={{ width: `${(playerHP / playerMaxHP) * 100}%` }}
            />
          </div>
          <div className="ww-hp-text">{playerHP}/{playerMaxHP} HP</div>
        </div>

        <div className="ww-hud-section right">
          <div className="ww-label-row">
            <span className="font-bold">{ENEMIES[enemyIndex].name}</span>
          </div>
          <div className="ww-health-bar">
            <div 
              className="ww-health-fill enemy" 
              style={{ width: `${(enemyHP / enemyMaxHP) * 100}%` }}
            />
          </div>
          <div className="ww-hp-text">{enemyHP}/{enemyMaxHP} HP</div>
        </div>
      </div>

      <div className="ww-stage-info medieval-font">
        Stage {enemyIndex + 1}: {ENEMIES[enemyIndex].stage}
      </div>

      {/* Battle Scene */}
      <div className="ww-battle-scene">
        <div 
          ref={playerSpriteRef}
          className={`ww-sprite player floating`}
          style={{ transform: playerAnim, transition: 'transform 0.2s' }}
        >
          🐛
        </div>
        
        <div 
          ref={enemySpriteRef}
          className={`ww-sprite enemy floating ${enemyAnim}`}
        >
          {ENEMIES[enemyIndex].sprite}
        </div>

        {/* Damage Popups */}
        {damagePopups.map(p => (
          <div 
            key={p.id} 
            className="ww-damage-popup"
            style={{ left: p.x, top: p.y }}
          >
            -{p.amount}
          </div>
        ))}
      </div>

      {/* Word Building */}
      <div className="ww-word-area">
        <div className={`ww-word-display medieval-font ${currentWord ? 'active' : ''}`}>
          {currentWord || "Type a Word..."}
        </div>

        <div className="ww-grid">
          {grid.map((char, i) => (
            <div 
              key={i}
              className={`ww-tile medieval-font ${selectedIndices.includes(i) ? 'selected' : ''}`}
              onClick={() => toggleTile(i)}
            >
              {char}
            </div>
          ))}
        </div>

        <div className="ww-controls">
          <button 
            className="ww-btn ww-btn-clear" 
            onClick={() => setSelectedIndices([])}
            disabled={isProcessing}
          >
            CLEAR
          </button>
          <button 
            className="ww-btn ww-btn-attack" 
            disabled={!isValidWord || isProcessing}
            onClick={handleAttack}
          >
            ATTACK! {isValidWord ? `(${calculateDamage(currentWord)})` : ''}
          </button>
          <button 
            className="ww-btn ww-btn-scramble" 
            onClick={scramble}
            disabled={isProcessing}
          >
            SCRAMBLE
          </button>
        </div>
      </div>

      <footer className="ww-footer">
        <button className="ww-exit-btn" onClick={onExit}>Save & Exit</button>
      </footer>

      {modal && (
        <div className="ww-modal-overlay">
          <div className="ww-modal-content">
            <h2 className="medieval-font">{modal.title}</h2>
            <p>{modal.message}</p>
            <button className="ww-btn-modal" onClick={handleModalBtn}>
              {modal.btn}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WordwormGame
