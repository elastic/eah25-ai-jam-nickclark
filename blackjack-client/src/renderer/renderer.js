import './style.css';

// DOM Elements
const connectionStatusEl = document.getElementById('connection-status');
const dealerHandEl = document.getElementById('dealer-hand');
const dealerScoreEl = document.getElementById('dealer-score');
const playerHandEl = document.getElementById('player-hand');
const playerScoreEl = document.getElementById('player-score');
const playerBalanceEl = document.getElementById('player-balance');
const currentBetEl = document.getElementById('current-bet');
const lastActionEl = document.getElementById('last-action');
const messageLogEl = document.getElementById('message-log');

// --- Helper to map server card string to image filename ---
function mapCardStringToFilename(cardString) {
    const VALID_RANKS = ['A', 'K', 'Q', 'J', 'T', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const SUITS = ['S', 'H', 'D', 'C'];

    if (!cardString || cardString === '?') {
        return 'back.png';
    }

    // Normalize: make uppercase, remove spaces. Expects format like "AS", "10H", "QD", "7C"
    const normalizedCard = cardString.toUpperCase().replace(/\s+/g, '');

    let rankStr;
    let suitChar;

    // Check if the normalized card is just a rank (e.g., "8", "K")
    if (VALID_RANKS.includes(normalizedCard)) {
        rankStr = normalizedCard;
        suitChar = SUITS[Math.floor(Math.random() * SUITS.length)];
        console.info(`No suit provided for card '${cardString}'. Randomly assigned suit '${suitChar}'. Proceeding with '${rankStr}${suitChar}'.`);
    } else if (normalizedCard.length === 3 && normalizedCard.startsWith('10')) { // Handle "10S", "10H", etc.
        rankStr = normalizedCard.slice(0, 2);
        suitChar = normalizedCard.slice(2,3);
    } else if (normalizedCard.length === 2) { // Handle "AS", "KH", "7D"
        rankStr = normalizedCard.slice(0, -1);
        suitChar = normalizedCard.slice(-1);
    } else {
        console.error(`Invalid card string format for image mapping: ${cardString}`);
        return 'back.png'; // Fallback for unexpected format
    }

    let rankFilename;
    switch (rankStr) {
        case 'A': rankFilename = 'ace'; break;
        case 'K': rankFilename = 'king'; break;
        case 'Q': rankFilename = 'queen'; break;
        case 'J': rankFilename = 'jack'; break;
        case 'T': rankFilename = '10'; break; // Assuming server sends 'T' for Ten
        case '10': rankFilename = '10'; break;
        case '9': rankFilename = '9'; break;
        case '8': rankFilename = '8'; break;
        case '7': rankFilename = '7'; break;
        case '6': rankFilename = '6'; break;
        case '5': rankFilename = '5'; break;
        case '4': rankFilename = '4'; break;
        case '3': rankFilename = '3'; break;
        case '2': rankFilename = '2'; break;
        default: 
            console.error(`Unknown rank for image mapping: ${rankStr} from ${cardString}`);
            return 'back.png'; // Fallback
    }

    let suitFilename;
    switch (suitChar) {
        case 'S': suitFilename = 'spades'; break;
        case 'H': suitFilename = 'hearts'; break;
        case 'D': suitFilename = 'diamonds'; break;
        case 'C': suitFilename = 'clubs'; break;
        default:
            console.error(`Unknown suit for image mapping: ${suitChar} from ${cardString}`);
            return 'back.png'; // Fallback
    }
    // Check for your specific filenames like king_of_clubs2.png if needed
    // For now, standard names like king_of_clubs.png are assumed.
    // If you have variants like 'king_of_clubs2.png', the logic here needs to accommodate that choice.
    // For simplicity, this example assumes primary card names like 'king_of_clubs.png'.
    // You mentioned files like king_of_clubs2.png. If these are preferred, the logic would need to change.
    // The current directory listing shows both, e.g. king_of_clubs.png AND king_of_clubs2.png
    // Let's assume for now we use the names WITHOUT the trailing '2' for standard cards.

    return `${rankFilename}_of_${suitFilename}.png`;
}

// --- UI Update Functions ---

function updateConnectionStatus(status) {
    connectionStatusEl.textContent = `Status: ${status}`;
    if (status === 'Connected') {
        connectionStatusEl.style.color = '#4CAF50'; // Green
    } else if (status === 'Disconnected' || status === 'Error') {
        connectionStatusEl.style.color = '#F44336'; // Red
    } else {
        connectionStatusEl.style.color = '#ffeb3b'; // Yellow for intermediate statuses
    }
}

function updatePlayerBalance(balance) {
    playerBalanceEl.textContent = String(balance);
}

function updateCurrentBet(betAmount) {
    currentBetEl.textContent = String(betAmount);
}

function updateLastAction(action) {
    lastActionEl.textContent = action;
}

function addLogMessage({ message, type = 'info' }) {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;

    switch (type) {
        case 'server':
            logEntry.classList.add('server-msg');
            break;
        case 'client':
            logEntry.classList.add('client-action');
            break;
        case 'error':
            logEntry.classList.add('error-msg');
            break;
        case 'info': // General info messages from AutoPlayer
        default:
            logEntry.classList.add('info-msg'); // Add a general style for info if not covered
            break;
    }
    // Ensure only a certain number of log messages are kept to avoid performance issues
    const maxLogEntries = 100;
    while (messageLogEl.childNodes.length >= maxLogEntries) {
        messageLogEl.removeChild(messageLogEl.firstChild);
    }
    messageLogEl.appendChild(logEntry);
    messageLogEl.scrollTop = messageLogEl.scrollHeight; // Auto-scroll to bottom
}

function clearHandsAndScores() {
    dealerHandEl.innerHTML = '';
    playerHandEl.innerHTML = '';
    dealerScoreEl.textContent = 'Score: 0';
    playerScoreEl.textContent = 'Score: 0';
}

function createCardElement(cardString) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');

    const filename = mapCardStringToFilename(cardString);
    let imgSrc;
    try {
      imgSrc = require(`./assets/cards/${filename}`);
    } catch (e) {
      console.error(`Failed to require card image: ${filename}`, e);
      imgSrc = require('./assets/cards/back.png'); // Fallback to back if specific card not found
    }

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = cardString === '?' ? 'Hidden Card' : cardString;
    img.className = 'card-img';

    cardDiv.appendChild(img);

    // Animation (optional)
    cardDiv.style.opacity = '0';
    cardDiv.style.transform = 'translateY(-20px)';
    requestAnimationFrame(() => {
        cardDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        cardDiv.style.opacity = '1';
        cardDiv.style.transform = 'translateY(0)';
    });

    return cardDiv;
}

function renderHand(handElement, scoreElement, cards, score, isPlayerHand) {
    handElement.innerHTML = ''; // Clear previous cards
    if (cards && cards.length > 0) {
        cards.forEach(cardStr => {
            const cardEl = createCardElement(cardStr);
            handElement.appendChild(cardEl);
        });
    } else if (isPlayerHand) {
        // Optionally display a placeholder if player hand is empty after a round clear
        // handElement.textContent = 'Waiting for deal...'; 
    }
    scoreElement.textContent = `Score: ${score}`;
}

// --- IPC Event Handlers ---
if (window.electronAPI) {
    // Helper to get card value for dealer's score (assuming 'A'=11, T,J,Q,K=10)
    // This is a simplified version for UI display only.
    const getUiCardValue = (cardRankChar) => {
        const rank = cardRankChar.toUpperCase();
        if (['K', 'Q', 'J', 'T'].includes(rank)) return 10;
        if (rank === 'A') return 11;
        return parseInt(rank) || 0;
    };

    window.electronAPI.onUpdateGameState((gameState) => {
        console.log('Renderer received game state:', gameState);
        updatePlayerBalance(gameState.balance);
        updateCurrentBet(gameState.currentBet !== null ? gameState.currentBet : '---');
        
        renderHand(playerHandEl, playerScoreEl, gameState.playerHand, gameState.playerHandTotal, true);
        
        if (gameState.isRoundInProgress && gameState.dealerUpCard) {
            dealerHandEl.innerHTML = ''; 
            dealerHandEl.appendChild(createCardElement(gameState.dealerUpCard));
            dealerHandEl.appendChild(createCardElement('?')); 
            // Display score of only the upcard
            const dealerUpCardRank = gameState.dealerUpCard.length === 2 ? gameState.dealerUpCard.substring(0,1) : gameState.dealerUpCard.substring(0,2);
            dealerScoreEl.textContent = `Score: ${getUiCardValue(dealerUpCardRank)}`; 
        } else if (!gameState.isRoundInProgress && gameState.dealerHand && gameState.dealerHand.length > 0) {
            // If round is over and server revealed dealer's full hand (hypothetical, gameStateManager needs to support this)
             renderHand(dealerHandEl, dealerScoreEl, gameState.dealerHand, gameState.dealerHandTotal, false);
        } else if (!gameState.isRoundInProgress && gameState.playerHand.length === 0) {
            clearHandsAndScores(); 
        } 
        // else: if not in round and dealer hand was revealed, it would be part of a log message currently.
        // A more complete solution would have gameState store revealed dealer hand too.

        // Connection status is often part of log messages for finer detail
        // updateConnectionStatus can be called from onLogMessage if specific keywords appear
    });

    window.electronAPI.onLogMessage((log) => {
        addLogMessage(log); // log is an object { message, type }
        // Update connection status based on log messages for more dynamic feedback
        if (log.message.includes('Connected to')) {
            updateConnectionStatus('Connected');
        } else if (log.message.includes('Connection closed') || log.message.includes('Network Error')) {
            updateConnectionStatus('Disconnected');
        } else if (log.message.includes('Attempting to connect')) {
            updateConnectionStatus('Connecting...');
        }
    });

    window.electronAPI.onLastAction((action) => {
        updateLastAction(action);
    });

} else {
    console.error('electronAPI not found. Preload script might have failed.');
    addLogMessage({ message: 'Error: Preload script failed. UI cannot receive updates.', type: 'error' });
}


// --- Initialization ---
function initializeUI() {
    addLogMessage({ message: 'UI Initialized. Waiting for main process...', type: 'info' });
    updateConnectionStatus('Initializing');
    clearHandsAndScores();
    updatePlayerBalance('---');
    updateCurrentBet('---');
    updateLastAction('None');
}

document.addEventListener('DOMContentLoaded', initializeUI);

console.log('renderer.js loaded and initializing UI listeners.'); 