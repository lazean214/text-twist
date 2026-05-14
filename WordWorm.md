<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wordworm Quest</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700&family=MedievalSharp&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    <style>
        :root {
            --parchment: #f4e4bc;
            --ink: #2c1e11;
            --gold: #d4af37;
            --lex-green: #4ade80;
            --enemy-red: #f87171;
        }

        body {
            font-family: 'Crimson Pro', serif;
            background-color: #1a1a1a;
            color: var(--ink);
            overflow: hidden;
            touch-action: manipulation;
        }

        .medieval-font {
            font-family: 'MedievalSharp', cursive;
        }

        .game-container {
            max-width: 800px;
            height: 100vh;
            margin: 0 auto;
            background: url('https://www.transparenttextures.com/patterns/parchment.png'), var(--parchment);
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            position: relative;
            border-left: 8px solid #3d2b1f;
            border-right: 8px solid #3d2b1f;
        }

        .tile {
            aspect-ratio: 1 / 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            background: #fff;
            border: 3px solid #3d2b1f;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
            box-shadow: 0 4px 0 #3d2b1f;
        }

        .tile:hover {
            transform: translateY(-2px);
            background: #fdf6e3;
        }

        .tile:active {
            transform: translateY(2px);
            box-shadow: 0 0 0 #3d2b1f;
        }

        .tile.selected {
            background: var(--gold);
            color: white;
            transform: scale(0.95);
            box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
        }

        .tile.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        .health-bar {
            height: 20px;
            background: #3d2b1f;
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid #000;
        }

        .health-fill {
            height: 100%;
            transition: width 0.5s ease-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .shaking {
            animation: shake 0.2s ease-in-out 3;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .floating {
            animation: float 3s ease-in-out infinite;
        }

        .damage-popup {
            position: absolute;
            color: #ef4444;
            font-weight: bold;
            font-size: 2rem;
            pointer-events: none;
            animation: fadeUp 1s forwards;
            z-index: 100;
        }

        @keyframes fadeUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-50px); }
        }

        .hidden { display: none !important; }

        .btn-medieval {
            background: #3d2b1f;
            color: var(--parchment);
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s;
            border: 2px solid var(--gold);
        }

        .btn-medieval:hover {
            background: #5a4030;
            color: #fff;
        }

        .btn-medieval:disabled {
            background: #ccc;
            border-color: #999;
            cursor: not-allowed;
        }
    </style>
</head>
<body>

    <div class="game-container">
        <!-- HUD / Stats -->
        <div class="p-4 flex justify-between items-start bg-black/5 border-b border-black/10">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-bold text-lg">Lex the Bookworm</span>
                    <span id="player-level" class="text-sm bg-yellow-600 text-white px-2 rounded">LVL 1</span>
                </div>
                <div class="health-bar w-full max-w-[200px]">
                    <div id="player-health-fill" class="health-fill bg-green-500" style="width: 100%;"></div>
                </div>
                <div class="text-xs mt-1"><span id="player-hp-text">100/100</span> HP</div>
            </div>

            <div class="flex-1 text-right flex flex-col items-end">
                <div class="flex items-center gap-2 mb-1 justify-end">
                    <span id="enemy-name" class="font-bold text-lg">Ancient Slime</span>
                </div>
                <div class="health-bar w-full max-w-[200px]">
                    <div id="enemy-health-fill" class="health-fill bg-red-500" style="width: 100%;"></div>
                </div>
                <div class="text-xs mt-1"><span id="enemy-hp-text">50/50</span> HP</div>
            </div>
        </div>

        <!-- Stage Info -->
        <div class="text-center py-2 bg-black/10 medieval-font italic">
            Stage <span id="stage-num">1</span>: <span id="stage-title">The Whispering Woods</span>
        </div>

        <!-- Battle Scene -->
        <div class="flex-1 flex items-center justify-between px-10 relative">
            <div id="player-sprite" class="w-32 h-32 flex items-center justify-center text-6xl floating">
                🐛
            </div>
            
            <div id="enemy-sprite" class="w-32 h-32 flex items-center justify-center text-7xl floating">
                💧
            </div>

            <!-- Effect Layer -->
            <div id="effect-layer" class="absolute inset-0 pointer-events-none"></div>
        </div>

        <!-- Word Building Area -->
        <div class="p-4 bg-black/5 border-t border-black/10">
            <div id="word-display" class="h-12 bg-white/50 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-3xl font-bold tracking-widest uppercase mb-4 medieval-font text-gray-400">
                Type a Word...
            </div>

            <div class="grid grid-cols-4 gap-3 mb-4" id="letter-grid">
                <!-- Tiles generated by JS -->
            </div>

            <div class="flex gap-2">
                <button id="clear-btn" class="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold border-2 border-red-300">
                    CLEAR
                </button>
                <button id="attack-btn" class="flex-[2] py-3 btn-medieval text-xl disabled:opacity-50" disabled>
                    ATTACK!
                </button>
                <button id="scramble-btn" class="flex-1 py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-bold border-2 border-blue-300">
                    SCRAMBLE
                </button>
            </div>
        </div>

        <!-- Overlay Modals -->
        <div id="overlay" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center hidden">
            <div class="bg-white p-8 rounded-xl max-w-sm w-full text-center">
                <h2 id="overlay-title" class="text-3xl medieval-font mb-4">You Won!</h2>
                <p id="overlay-message" class="mb-6">The monster has been defeated.</p>
                <button id="overlay-btn" class="btn-medieval w-full">CONTINUE</button>
            </div>
        </div>
    </div>

    <script>
        const LETTERS = "EEEEEEEEEEEEEEEEEEEEEEEEEEAAAAAAAAAAAAAIIIIIIIIIIIIIOOOOOOOOOOOOONNNNNNNNNNNRRRRRRRRRRRTTTTTTTTTTTTLLLLLLLLSSSSSSSSUUUUUUUUUDDDDDDDGGGGGGGBBBBBCCCCCPPPPPFFFFFHHHHHMMMMMVVVVWWWWYYYYKKKKJJJJQQQQXXXXZZZZ";
        
        // Mock Dictionary - A subset of common English words for validation
        const COMMON_WORDS = new Set(["THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "ANY", "CAN", "HAD", "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET", "HAS", "HIM", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "TWO", "WAY", "WHO", "BOY", "DID", "ITS", "LET", "PUT", "SAY", "SHE", "TOO", "USE", "ACT", "ADD", "AGE", "AIR", "ART", "ASK", "BAD", "BAG", "BAR", "BAT", "BED", "BEE", "BIT", "BOX", "BOY", "BUS", "BYE", "CAR", "CAT", "CUT", "DAD", "DIE", "DOG", "DRY", "EAT", "EGG", "END", "EYE", "FAN", "FAR", "FAT", "FED", "FEW", "FIT", "FLY", "FOR", "FOX", "FUN", "GAS", "GAY", "GET", "GOD", "GOT", "GUY", "HAT", "HEN", "HIT", "HOT", "ICE", "ILL", "INK", "INN", "JET", "JOB", "JOY", "KEY", "KID", "LAP", "LEG", "LET", "LID", "LIE", "LIP", "LOG", "LOW", "MAD", "MAP", "MAT", "MEN", "MET", "MIX", "MUD", "MUG", "NET", "NOD", "NUT", "OFF", "OIL", "OLD", "ONE", "OWN", "PAD", "PAN", "PAT", "PAY", "PEN", "PET", "PIG", "PIN", "POT", "RAT", "RAW", "RED", "RUN", "SAD", "SEA", "SET", "SEW", "SIX", "SKI", "SKY", "SON", "SUN", "TAP", "TAX", "TEA", "TEN", "THE", "TIE", "TIP", "TOE", "TOP", "TOY", "TRY", "TWO", "USE", "VAN", "WAR", "WET", "WHO", "WHY", "WIN", "YES", "YOU", "ZOO", "BOOK", "WORM", "WORD", "TIME", "PLAY", "GAME", "KILL", "DEAD", "LIFE", "FIRE", "WIND", "GOLD", "IRON", "HELL", "WOLF", "ORCS", "MAGE", "DUST", "WAND", "SPELL", "BLADE", "POWER", "MAGIC", "SWORD", "DRAGON", "KNIGHT", "QUEST", "FIGHT", "DEATH", "BLOOD", "GLORY", "BATTLE", "VICTORY", "DEFEAT", "LEVEL", "SKILL", "ENEMY", "STRONG", "BEAST", "MONSTER", "ATTACK", "DEFEND", "HEALTH", "POTION", "SHIELD", "ARMOR", "VALOR", "HERO", "VILLAIN", "CASTLE", "DUNGEON", "CAVERN", "FOREST", "DESERT", "HEAVEN", "MASTER", "STRIKE", "LEGEND", "WISDOM", "SAGE", "THIEF", "CROWN", "KING", "QUEEN", "PRINCE", "THRONE", "CHEST", "LOOT", "TREASURE", "JEWEL", "SILVER", "COPPER", "BRONZE", "GHOST", "DEMON", "ANGEL", "SOUL", "SPIRIT", "BONE", "SKULL", "DARK", "LIGHT", "MOON", "STAR", "SUN", "DAWN", "DUSK", "NIGHT", "PEACE", "TRUTH", "FAITH", "HOPE", "LOVE", "HATE", "FEAR", "DREAM", "WORLD", "SPACE", "EARTH", "WATER", "MOUNTAIN", "VALLEY", "RIVER", "OCEAN", "STORM", "CLOUD", "RAIN", "SNOW", "COLD", "HEAT", "SUMMER", "WINTER", "SPRING", "FALL", "AUTUMN", "LEAF", "TREE", "FLOWER", "PLANT", "GRASS", "ROOT", "SEED", "FRUIT", "BERRY", "APPLE", "BREAD", "MEAT", "WINE", "BEER", "MILK", "CAKE", "SOUP", "SALT", "SUGAR", "SPICE", "KNIFE", "FORK", "SPOON", "PLATE", "BOWL", "CUP", "GLASS", "CHAIR", "TABLE", "DOOR", "GATE", "WALL", "ROOF", "FLOOR", "HOUSE", "HOME", "TOWN", "CITY", "ROAD", "PATH", "BRIDGE", "SHIP", "BOAT", "WHEEL", "TRAIN", "PLANE", "HORSE", "BIRD", "FISH", "SNAKE", "LION", "TIGER", "BEAR", "COW", "SHEEP", "GOAT", "DUCK", "GOOSE", "SWAN", "EAGLE", "HAWK", "OWL", "MOUSE", "RAT", "FROG", "SPIDER", "ANT", "BEE", "WASP", "MOTH", "WORM", "SNAIL", "SHELL", "ROCK", "STONE", "SAND", "CLAY", "METAL", "GLASS", "WOOD", "PAPER", "CLOTH", "SILK", "WOOL", "LEATHER", "ROPE", "CHAIN", "LOCK", "KEY", "TOOL", "HAMMER", "SAW", "NAIL", "SCREW", "BRUSH", "PAINT", "PEN", "INK", "BOOK", "PAGE", "LETTER", "WORD", "NAME", "NOTE", "SONG", "MUSIC", "DANCE", "VOICE", "SOUND", "NOISE", "QUIET", "SILENCE", "TIME", "CLOCK", "HOUR", "MINUTE", "SECOND", "YEAR", "MONTH", "WEEK", "DAY", "NIGHT", "MORNING", "NOON", "EVENING", "NORTH", "SOUTH", "EAST", "WEST", "LEFT", "RIGHT", "UP", "DOWN", "NEAR", "FAR", "HIGH", "LOW", "BIG", "SMALL", "WIDE", "DEEP", "LONG", "SHORT", "FAST", "SLOW", "HOT", "COLD", "NEW", "OLD", "YOUNG", "GOOD", "BAD", "WELL", "SICK", "HARD", "SOFT", "TRUE", "FALSE", "CLEAN", "DIRTY", "RICH", "POOR", "STRONG", "WEAK", "HAPPY", "SAD", "ANGRY", "BRAVE", "WISE", "KIND", "PROUD", "AFRAID", "BUSY", "FREE", "LOST", "SAFE", "SHARP", "BLUNT", "LOUD", "SOFT", "BRIGHT", "DARK", "SWEET", "SOUR", "BITTER", "FRESH", "STALE", "HEAVY", "LIGHT", "THICK", "THIN", "SMOOTH", "ROUGH", "ROUND", "SQUARE", "FLAT", "STEEP", "EMPTY", "FULL", "OPEN", "SHUT", "LEFT", "RIGHT", "BACK", "FRONT", "TOP", "BOTTOM", "SIDE", "CORNER", "EDGE", "CENTER", "MIDDLE", "PART", "WHOLE", "HALF", "BIT", "PIECE", "PAIR", "GROUP", "SET", "TEAM", "CROWD", "FRIEND", "ENEMY", "LOVER", "WIFE", "HUSBAND", "MOTHER", "FATHER", "SISTER", "BROTHER", "DAUGHTER", "SON", "CHILD", "BABY", "ADULT", "PERSON", "PEOPLE", "BODY", "HEAD", "FACE", "EYE", "EAR", "NOSE", "MOUTH", "TOOTH", "HAIR", "NECK", "ARM", "HAND", "FINGER", "LEG", "FOOT", "TOE", "KNEE", "BACK", "BONE", "HEART", "MIND", "SOUL", "LIFE", "DEATH", "SLEEP", "WAKE", "REST", "WORK", "PLAY", "WALK", "RUN", "JUMP", "FALL", "STAND", "SIT", "LIE", "EAT", "DRINK", "SEE", "HEAR", "FEEL", "SMELL", "TASTE", "TOUCH", "KNOW", "THINK", "LEARN", "READ", "WRITE", "SPEAK", "SING", "LAUGH", "CRY", "SMILE", "LOOK", "WATCH", "LISTEN", "SAY", "TELL", "ASK", "ANSWER", "CALL", "SEND", "GIVE", "TAKE", "KEEP", "HOLD", "MAKE", "BUILD", "BREAK", "FIX", "CLEAN", "WASH", "OPEN", "CLOSE", "START", "STOP", "BEGIN", "END", "WAIT", "HELP", "MEET", "FIND", "LOSE", "WIN", "BUY", "SELL", "PAY", "COST", "FREE", "LOVE", "HATE", "LIKE", "WANT", "NEED", "FEAR", "HOPE", "WISH", "TRY", "PLAN", "SHOW", "HIDE", "SAVE", "KILL", "FIGHT", "BEAT", "HIT", "PULL", "PUSH", "THROW", "CATCH", "MOVE", "STAY", "LIVE", "DIE", "GROW", "CHANGE", "SEEM", "BECOME", "HAPPEN", "COME", "GO", "LEAVE", "ARRIVE", "STAY", "FOLLOW", "LEAD", "RIDE", "DRIVE", "FLY", "SWIM", "RUN", "WALK", "STEP", "TURN", "LIFT", "DROP", "CARRY", "HOLD", "PULL", "PUSH", "SHAKE", "WAVE", "STRIKE", "TOUCH", "CATCH", "KEEP", "BRING", "SEND", "TAKE", "FETCH", "BRING", "SAY", "TALK", "SPEAK", "TELL", "CALL", "ASK", "REPLY", "WRITE", "READ", "SING", "PLAY", "WORK", "COOK", "CLEAN", "WASH", "EAT", "DRINK", "FEED", "SLEEP", "REST", "WAKE", "DRESS", "WEAR", "SMILE", "LAUGH", "CRY", "SHOUT", "WHISPER", "DANCE", "JUMP", "RUN", "WALK", "FIGHT", "WIN", "LOSE", "BEAT", "HELP", "SAVE", "KILL", "DIE", "LIVE", "STAY", "GO", "COME", "SIT", "STAND", "LIE", "WAIT", "STOP", "START", "BEGIN", "END", "TRY", "DO", "MAKE", "TAKE", "GET", "GIVE", "PUT", "SET", "KEEP", "LET", "USE", "KNOW", "SEE", "THINK", "FEEL", "WANT", "LOOK", "FIND", "TELL", "ASK", "WORK", "SEEM", "FEEL", "TRY", "LEAVE", "CALL", "THINK", "MEAN", "KEEP", "LET", "BEGIN", "START", "HELP", "SHOW", "HEAR", "PLAY", "RUN", "MOVE", "LIVE", "BELIEVE", "BRING", "HAPPEN", "WRITE", "SIT", "STAND", "LOSE", "PAY", "MEET", "INCLUDE", "CONTINUE", "SET", "LEARN", "CHANGE", "LEAD", "UNDERSTAND", "WATCH", "FOLLOW", "STOP", "CREATE", "SPEAK", "READ", "ALLOW", "ADD", "SPEND", "GROW", "OPEN", "WALK", "WIN", "OFFER", "REMEMBER", "LOVE", "CONSIDER", "APPEAR", "BUY", "WAIT", "SERVE", "DIE", "SEND", "EXPECT", "BUILD", "STAY", "FALL", "CUT", "REACH", "KILL", "REMAIN", "WORDS", "QUEST", "DRAGON", "SWORD", "MAGIC", "POWER", "BATTLE", "VALOR", "LEVEL", "GLORY", "HERO", "WIZARD", "ELVES", "DWARFS", "GOBLIN", "TROLL", "GIANT", "SHADOW", "LIGHT", "FLAME", "FROST", "STORM", "VENOM", "POISON", "POTION", "SHIELD", "ARMOR", "KNIGHT", "BISHOP", "ROOK", "PAWN", "KING", "QUEEN", "CASTLE", "DUNGEON", "TOWER", "WALL", "GATE", "BRIDGE", "RIVER", "FOREST", "CAVE", "MOUNTAIN", "DESERT", "ISLAND", "OCEAN", "SKY", "STAR", "MOON", "SUN", "DAWN", "DUSK", "NIGHT", "DAY", "LIFE", "DEATH", "BLOOD", "BONE", "SOUL", "MIND", "HEART", "DREAM", "HOPE", "FEAR", "LOVE", "HATE", "PEACE", "WAR", "TRUTH", "FAITH", "GRACE", "MERCY", "PRIDE", "SHAME", "JOY", "PAIN", "SMILE", "TEAR", "LAUGH", "CRY", "SIGHT", "SOUND", "TOUCH", "SMELL", "TASTE", "VOICE", "WORD", "NAME", "PATH", "ROAD", "GATE", "KEY", "LOCK", "DOOR", "HOUSE", "HOME", "TOWN", "CITY", "WORLD", "SPACE", "TIME", "FIRE", "WATER", "WIND", "EARTH", "ROCK", "IRON", "GOLD", "SILVER", "COPPER", "BRONZE", "JEWEL", "GEM", "COIN", "LOOT", "CHEST", "BAG", "FOOD", "WINE", "BREAD", "MEAT", "FRUIT", "SEED", "LEAF", "TREE", "PLANT", "FLOWER", "ROSE", "BIRD", "FISH", "BEAST", "WOLF", "LION", "BEAR", "DEER", "HORSE", "DOG", "CAT", "MOUSE", "RAT", "SNAKE", "FROG", "FLY", "BEE", "ANT", "WORM", "BOOK", "PEN", "INK", "PAGE", "NOTE", "SONG", "ART", "HAND", "FOOT", "HEAD", "FACE", "EYE", "EAR", "ARM", "LEG", "BODY", "MAN", "WOMAN", "CHILD", "BABY", "KIND", "GOOD", "BAD", "NEW", "OLD", "BIG", "SMALL", "FAST", "SLOW", "HOT", "COLD", "DARK", "LIGHT", "TRUE", "FALSE", "RICH", "POOR", "WISE", "BRAVE", "STRONG", "WEAK", "HAPPY", "SAD", "ANGRY", "LOST", "SAFE", "FREE", "FULL", "EMPTY", "HARD", "SOFT", "SHARP", "BLUNT", "LOUD", "QUIET", "SWEET", "SOUR", "BITTER", "FRESH", "STALE", "HEAVY", "LIGHT", "THICK", "THIN", "SMOOTH", "ROUGH", "FLAT", "STEEP", "ROUND", "SQUARE", "NEAR", "FAR", "HIGH", "LOW", "LEFT", "RIGHT", "UP", "DOWN", "FRONT", "BACK", "SIDE", "TOP", "BOTTOM", "EDGE", "CENTER", "PART", "WHOLE", "PIECE", "BIT", "PAIR", "SET", "GROUP", "TEAM", "FRIEND", "ENEMY", "LOVER", "WIFE", "MOTHER", "FATHER", "SON", "BABY", "GOD", "KING", "MASTER", "HERO", "LEGEND", "STORY", "FACT", "RULE", "LAW", "ORDER", "POWER", "FORCE", "POINT", "LINE", "SHAPE", "SIZE", "WEIGHT", "SPEED", "HEAT", "SOUND", "LIGHT", "WORK", "PLAY", "REST", "SLEEP", "WALK", "RUN", "JUMP", "FALL", "STAND", "SIT", "LIE", "EAT", "DRINK", "SEE", "HEAR", "FEEL", "TOUCH", "SMELL", "TASTE", "KNOW", "THINK", "DREAM", "HOPE", "FEAR", "LOVE", "HATE", "LIKE", "WANT", "NEED", "PLAN", "TRY", "DO", "MAKE", "BUILD", "FIX", "CLEAN", "WASH", "OPEN", "CLOSE", "START", "STOP", "BEGIN", "END", "WAIT", "HELP", "SAVE", "KILL", "DIE", "LIVE", "STAY", "GO", "COME", "LEAVE", "ARRIVE", "MOVE", "TURN", "STEP", "LIFT", "DROP", "KEEP", "HOLD", "SEND", "GIVE", "TAKE", "GET", "FIND", "LOSE", "WIN", "BUY", "SELL", "PAY", "COST", "USE", "SHOW", "HIDE", "SPEAK", "TELL", "SAY", "TALK", "WRITE", "READ", "SING", "PLAY", "DANCE", "LAUGH", "SMILE", "CRY", "WATCH", "LOOK", "HEAR", "LISTEN", "ASK", "CALL", "NAME", "MEET", "JOIN", "PART", "SHARE", "FIGHT", "BEAT", "HIT", "PUSH", "PULL", "THROW", "CATCH", "BRING", "FETCH", "CARRY", "WEAR", "COOK", "FEED", "SLEEP", "WAKE", "STAY", "GROW", "CHANGE", "SEEM", "BECOME", "HAPPEN", "ALLOW", "LEAD", "FOLLOW", "RUN", "SWIM", "FLY", "RIDE", "DRIVE", "WALK", "CLIMB", "FALL", "JUMP", "TURN", "STOP", "START", "KEEP", "LET", "PUT", "SET", "HOLD", "TAKE", "GIVE", "GET", "DO", "MAKE", "USE", "KNOW", "THINK", "SEE", "FEEL", "WANT", "WISH", "HOPE", "TRY", "LOOK", "FIND", "TELL", "SAY", "SPEAK", "ASK", "ANSWER", "WORK", "PLAY", "REST", "STAY", "GO", "COME", "LEAVE", "LIVE", "DIE", "GROW", "CHANGE", "START", "END", "OPEN", "CLOSE", "HELP", "SAVE", "LOSE", "WIN", "FIGHT", "BEAT", "BREAK", "FIX", "BUILD", "CLEAN", "WASH", "COOK", "EAT", "DRINK", "SLEEP", "WAKE", "SMILE", "LAUGH", "CRY", "SING", "DANCE", "READ", "WRITE", "LEARN", "TEACH", "SHOW", "HIDE", "BUY", "SELL", "PAY", "COST", "FREE", "RICH", "POOR", "STRONG", "WEAK", "BRAVE", "WISE", "KIND", "PROUD", "SAD", "ANGRY", "HAPPY", "AFRAID", "SAFE", "LOST", "TRUE", "FALSE", "GOOD", "BAD", "WELL", "SICK", "NEW", "OLD", "FAST", "SLOW", "HOT", "COLD", "DARK", "LIGHT", "HARD", "SOFT", "SHARP", "BLUNT", "SMOOTH", "ROUGH", "ROUND", "SQUARE", "FLAT", "STEEP", "HIGH", "LOW", "BIG", "SMALL", "LONG", "SHORT", "WIDE", "DEEP", "NEAR", "FAR", "UP", "DOWN", "LEFT", "RIGHT", "BACK", "FRONT", "SIDE", "TOP", "BOTTOM", "INSIDE", "OUTSIDE", "PART", "WHOLE", "PIECE", "BIT", "PAIR", "SET", "GROUP", "TEAM", "FRIEND", "ENEMY", "MAN", "WOMAN", "CHILD", "ADULT", "PERSON", "PEOPLE", "BODY", "HEAD", "FACE", "EYE", "EAR", "NOSE", "MOUTH", "TOOTH", "HAIR", "NECK", "ARM", "HAND", "FINGER", "LEG", "FOOT", "TOE", "BONE", "HEART", "BLOOD", "SOUL", "MIND", "LIFE", "DEATH", "TIME", "WORLD", "SPACE", "SKY", "SUN", "MOON", "STAR", "DAY", "NIGHT", "YEAR", "MONTH", "WEEK", "HOUR", "FIRE", "WATER", "WIND", "EARTH", "ROCK", "STONE", "SAND", "IRON", "GOLD", "SILVER", "METAL", "WOOD", "TREE", "LEAF", "FLOWER", "PLANT", "GRASS", "FRUIT", "SEED", "BIRD", "FISH", "BEAST", "ANIMAL", "WOLF", "LION", "BEAR", "HORSE", "DOG", "CAT", "MOUSE", "BIRD", "SNAKE", "FLY", "BEE", "ANT", "WORM", "SHELL", "SEA", "RIVER", "LAKE", "CAVE", "HILL", "ROAD", "PATH", "GATE", "DOOR", "WALL", "HOUSE", "HOME", "TOWN", "CITY", "SHIP", "BOAT", "CAR", "TOOL", "KEY", "LOCK", "KNIFE", "GUN", "ARMOR", "SWORD", "SHIELD", "BOOK", "PAPER", "PEN", "INK", "PAGE", "WORD", "NAME", "NOTE", "SONG", "ART", "LAW", "RULE", "FACT", "TRUTH", "LOVE", "HATE", "PEACE", "WAR", "HOPE", "FEAR", "JOY", "PAIN", "DREAM", "SOUL", "GOD", "KING", "QUEEN", "HERO", "LORD", "SAGE", "FOOL", "KNAVE", "TROLL", "GIANT", "ORCS", "ELVES", "MAGE", "DRAGON", "WITCH", "BEAST", "MONSTER", "SNAKE", "VIPER", "VENOM", "STING", "FANG", "CLAW", "TEETH", "WINGS", "TAIL", "SCALE", "HORN", "HIDE", "PELT", "FUR", "MANE", "BEAK", "CLAW", "TALON", "HOOF", "PAW", "BITE", "HOWL", "ROAR", "GROWL", "HISS", "BARK", "MEOW", "SING", "SONG", "TALE", "SAGA", "EPIC", "MYTH", "RHYME", "VERSE", "POEM", "PLAY", "DRAMA", "ACT", "SHOW", "MIME", "MASK", "FACE", "GUISE", "FORM", "SHAPE", "VIBE", "AURA", "SOUL", "GHOST", "SHADE", "SHADOW", "DARK", "LIGHT", "GLOW", "BEAM", "RAY", "SPARK", "FIRE", "FLAME", "HEAT", "COLD", "ICE", "FROST", "SNOW", "HAIL", "RAIN", "MIST", "FOG", "CLOUD", "WIND", "GALE", "STORM", "WAVE", "TIDE", "SURF", "DEEP", "BLUE", "GREEN", "RED", "GOLD", "WHITE", "BLACK", "GREY", "BROWN", "PINK", "CLEAR", "PURE", "TRUE", "REAL", "DREAM", "FAKE", "LOST", "FOUND", "SAFE", "KEPT", "FREE", "HELD", "TIGHT", "LOOSE", "FAST", "SLOW", "QUICK", "SWIFT", "SURE", "FINE", "DEAR", "HIGH", "LONG", "WIDE", "DEEP", "HUGE", "VIBE", "LIFE", "GAME"]);

        const ENEMIES = [
            { name: "Ancient Slime", hp: 40, attack: 5, sprite: "💧", stage: "The Whispering Woods" },
            { name: "Forest Goblin", hp: 60, attack: 8, sprite: "👺", stage: "The Whispering Woods" },
            { name: "Cursed Tree", hp: 80, attack: 10, sprite: "🌳", stage: "The Whispering Woods" },
            { name: "Stone Golem", hp: 120, attack: 15, sprite: "🗿", stage: "The Deep Caverns" },
            { name: "Lava Elemental", hp: 150, attack: 20, sprite: "🔥", stage: "The Deep Caverns" },
            { name: "Shadow Dragon", hp: 300, attack: 35, sprite: "🐉", stage: "The Final Spire" }
        ];

        let state = {
            playerHP: 100,
            playerMaxHP: 100,
            playerLevel: 1,
            playerXP: 0,
            currentEnemyIndex: 0,
            enemyHP: 40,
            enemyMaxHP: 40,
            grid: [],
            selectedIndices: [],
            currentWord: "",
            isProcessing: false
        };

        // DOM Elements
        const letterGrid = document.getElementById('letter-grid');
        const wordDisplay = document.getElementById('word-display');
        const attackBtn = document.getElementById('attack-btn');
        const clearBtn = document.getElementById('clear-btn');
        const scrambleBtn = document.getElementById('scramble-btn');
        const playerHPFill = document.getElementById('player-health-fill');
        const playerHPText = document.getElementById('player-hp-text');
        const enemyHPFill = document.getElementById('enemy-health-fill');
        const enemyHPText = document.getElementById('enemy-hp-text');
        const enemyName = document.getElementById('enemy-name');
        const enemySprite = document.getElementById('enemy-sprite');
        const stageNum = document.getElementById('stage-num');
        const stageTitle = document.getElementById('stage-title');
        const playerLevelText = document.getElementById('player-level');
        const overlay = document.getElementById('overlay');
        const overlayTitle = document.getElementById('overlay-title');
        const overlayMessage = document.getElementById('overlay-message');
        const overlayBtn = document.getElementById('overlay-btn');

        function generateGrid() {
            state.grid = [];
            for (let i = 0; i < 16; i++) {
                const char = LETTERS[Math.floor(Math.random() * LETTERS.length)];
                state.grid.push(char);
            }
            renderGrid();
        }

        function renderGrid() {
            letterGrid.innerHTML = '';
            state.grid.forEach((char, index) => {
                const tile = document.createElement('div');
                tile.className = `tile medieval-font ${state.selectedIndices.includes(index) ? 'selected' : ''}`;
                tile.textContent = char;
                tile.onclick = () => selectTile(index);
                letterGrid.appendChild(tile);
            });
        }

        function selectTile(index) {
            if (state.isProcessing) return;
            
            const alreadySelectedPos = state.selectedIndices.indexOf(index);
            if (alreadySelectedPos > -1) {
                // If it's the last one, remove it
                if (alreadySelectedPos === state.selectedIndices.length - 1) {
                    state.selectedIndices.pop();
                } else {
                    // In Bookworm, you usually can't just click mid-word to remove, 
                    // but for simplicity, we allow clearing the whole word or the last letter.
                    return;
                }
            } else {
                state.selectedIndices.push(index);
            }
            
            updateWordDisplay();
            renderGrid();
        }

        function updateWordDisplay() {
            state.currentWord = state.selectedIndices.map(i => state.grid[i]).join('');
            if (state.currentWord.length > 0) {
                wordDisplay.textContent = state.currentWord;
                wordDisplay.classList.remove('text-gray-400');
                wordDisplay.classList.add('text-ink');
                
                // Validate Word
                const isValid = validateWord(state.currentWord);
                attackBtn.disabled = !isValid;
                if (isValid) {
                    const dmg = calculateDamage(state.currentWord);
                    attackBtn.innerHTML = `ATTACK! (${dmg} DMG)`;
                } else {
                    attackBtn.innerHTML = `ATTACK!`;
                }
            } else {
                wordDisplay.textContent = "Type a Word...";
                wordDisplay.classList.add('text-gray-400');
                wordDisplay.classList.remove('text-ink');
                attackBtn.disabled = true;
                attackBtn.innerHTML = `ATTACK!`;
            }
        }

        function validateWord(word) {
            return word.length >= 3 && COMMON_WORDS.has(word.toUpperCase());
        }

        function calculateDamage(word) {
            // Damage = Base Length * Length Multiplier + Rarity Bonus
            let base = word.length * 5;
            if (word.length > 4) base += (word.length - 4) * 10;
            if (word.length > 6) base += 25;
            
            // Letter rarity bonus
            const rarities = { 'Q': 20, 'Z': 20, 'X': 15, 'J': 15, 'K': 10 };
            for (let char of word) {
                if (rarities[char]) base += rarities[char];
            }

            return base;
        }

        async function performAttack() {
            if (state.isProcessing) return;
            state.isProcessing = true;
            
            const damage = calculateDamage(state.currentWord);
            
            // Player Attack Animation
            const playerSprite = document.getElementById('player-sprite');
            playerSprite.style.transform = 'translateX(50px) scale(1.2)';
            setTimeout(() => playerSprite.style.transform = '', 200);

            // Damage Popup on Enemy
            showDamage(damage, 'enemy-sprite');
            
            // Update Enemy HP
            state.enemyHP -= damage;
            if (state.enemyHP < 0) state.enemyHP = 0;
            updateHPBars();

            // Clear Word
            replaceUsedTiles();
            state.selectedIndices = [];
            updateWordDisplay();

            if (state.enemyHP <= 0) {
                await wait(800);
                victory();
            } else {
                await wait(1000);
                enemyTurn();
            }
        }

        async function enemyTurn() {
            const enemy = ENEMIES[state.currentEnemyIndex];
            const dmg = enemy.attack + Math.floor(Math.random() * 5);
            
            // Enemy Attack Animation
            const enemySprite = document.getElementById('enemy-sprite');
            enemySprite.classList.add('shaking');
            setTimeout(() => enemySprite.classList.remove('shaking'), 500);

            // Damage Popup on Player
            showDamage(dmg, 'player-sprite');
            
            state.playerHP -= dmg;
            if (state.playerHP < 0) state.playerHP = 0;
            updateHPBars();

            if (state.playerHP <= 0) {
                gameOver();
            } else {
                state.isProcessing = false;
            }
        }

        function replaceUsedTiles() {
            state.selectedIndices.forEach(idx => {
                state.grid[idx] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            });
            renderGrid();
        }

        function showDamage(amt, targetId) {
            const target = document.getElementById(targetId);
            const rect = target.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.className = 'damage-popup';
            popup.textContent = `-${amt}`;
            popup.style.left = `${rect.left + rect.width/2}px`;
            popup.style.top = `${rect.top}px`;
            document.getElementById('effect-layer').appendChild(popup);
            setTimeout(() => popup.remove(), 1000);
        }

        function updateHPBars() {
            playerHPFill.style.width = `${(state.playerHP / state.playerMaxHP) * 100}%`;
            playerHPText.textContent = `${state.playerHP}/${state.playerMaxHP}`;
            
            enemyHPFill.style.width = `${(state.enemyHP / state.enemyMaxHP) * 100}%`;
            enemyHPText.textContent = `${state.enemyHP}/${state.enemyMaxHP}`;
        }

        function victory() {
            state.currentEnemyIndex++;
            if (state.currentEnemyIndex >= ENEMIES.length) {
                showOverlay("Quest Complete!", "You are the ultimate Wordworm! Every monster has been defeated.");
            } else {
                const next = ENEMIES[state.currentEnemyIndex];
                showOverlay("Enemy Defeated!", `Lex grows stronger! Next up: ${next.name}`);
                
                // Level up logic
                state.playerLevel++;
                state.playerMaxHP += 20;
                state.playerHP = state.playerMaxHP;
                playerLevelText.textContent = `LVL ${state.playerLevel}`;
            }
        }

        function gameOver() {
            showOverlay("Game Over", "Your vocabulary wasn't enough this time. Try again?", "RESTART");
        }

        function showOverlay(title, msg, btnText = "CONTINUE") {
            overlayTitle.textContent = title;
            overlayMessage.textContent = msg;
            overlayBtn.textContent = btnText;
            overlay.classList.remove('hidden');
        }

        function nextEnemy() {
            const enemy = ENEMIES[state.currentEnemyIndex];
            state.enemyHP = enemy.hp;
            state.enemyMaxHP = enemy.hp;
            enemyName.textContent = enemy.name;
            enemySprite.textContent = enemy.sprite;
            stageNum.textContent = state.currentEnemyIndex + 1;
            stageTitle.textContent = enemy.stage;
            
            updateHPBars();
            overlay.classList.add('hidden');
            state.isProcessing = false;
        }

        function restartGame() {
            state.playerHP = 100;
            state.playerMaxHP = 100;
            state.playerLevel = 1;
            state.currentEnemyIndex = 0;
            playerLevelText.textContent = `LVL 1`;
            generateGrid();
            nextEnemy();
        }

        function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

        // Event Listeners
        attackBtn.onclick = performAttack;
        
        clearBtn.onclick = () => {
            if (state.isProcessing) return;
            state.selectedIndices = [];
            updateWordDisplay();
            renderGrid();
        };

        scrambleBtn.onclick = () => {
            if (state.isProcessing) return;
            // Scramble deals small damage to player as penalty
            state.playerHP -= 5;
            if (state.playerHP < 1) state.playerHP = 1;
            updateHPBars();
            generateGrid();
            state.selectedIndices = [];
            updateWordDisplay();
        };

        overlayBtn.onclick = () => {
            if (overlayBtn.textContent === "RESTART") {
                restartGame();
            } else if (state.currentEnemyIndex >= ENEMIES.length) {
                location.reload();
            } else {
                nextEnemy();
            }
        };

        // Initialize Game
        window.onload = () => {
            generateGrid();
            nextEnemy();
        };

    </script>
</body>
</html>