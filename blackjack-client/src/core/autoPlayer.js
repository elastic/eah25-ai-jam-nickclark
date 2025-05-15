const NetworkModule = require('./network');
const GameStateManager = require('./gameState');
const StrategyModule = require('./strategy');

// For IPC communication with renderer process (main process to renderer)
let sendToRenderer = null;

// Delay constants (in milliseconds)
const DELAYS = {
    DECISION: 1500,        // Delay before making a decision
    ROUND_START: 2000,     // Delay at the start of a new round
    AFTER_ACTION: 1000,    // Delay after taking an action
    RECONNECT: 5000        // Delay between reconnect attempts
};

class AutoPlayer {
    constructor(host, port, username, password, ipcSender) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        sendToRenderer = ipcSender; // Function to send messages to renderer

        this.network = new NetworkModule();
        this.gameState = new GameStateManager();
        this.strategy = new StrategyModule();

        this.isStopped = false;
        this.reconnectDelay = DELAYS.RECONNECT; // ms
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    start() {
        this.isStopped = false;
        this.gameState.resetAll();
        this._logToUI('Attempting to connect...', 'info');
        this._connect();
    }

    _connect() {
        if (this.isStopped) return;
        this.network.connect(
            this.host, 
            this.port, 
            (data) => this._onData(data),
            (err) => this._onError(err),
            () => this._onClose()
        );
    }

    stop() {
        this.isStopped = true;
        this._logToUI('AutoPlayer stopped.', 'info');
        this.network.disconnect();
    }

    _logToUI(message, type = 'info') {
        console.log(`AutoPlayer (${type}): ${message}`);
        if (sendToRenderer) {
            sendToRenderer('log-message', { message, type });
        }
    }

    _updateUiGameState() {
        if (sendToRenderer) {
            sendToRenderer('update-game-state', this.gameState.getState());
        }
    }

    _onData(message) {
        this._logToUI(`Received: ${message}`, 'server');
        const oldBalance = this.gameState.balance;
        this.gameState.updateStateFromMessage(message);
        this._updateUiGameState();

        if (this.gameState.balance === 0 && oldBalance > 0) {
            this._logToUI('Balance has reached 0.', 'warning');
            if (!this.gameState.isRoundInProgress) {
                this._logToUI('Balance is 0 and round is not in progress. Forcing reconnect to attempt re-login.', 'info');
                this.network.disconnect(); // This will trigger _onClose, which handles reconnect and re-login
                return;
            } else {
                this._logToUI('Balance is 0, but a round is still in progress. Waiting for round end.', 'info');
            }
        }

        if (this.gameState.isAwaitingInput) {
            // Add a longer delay before making decisions
            setTimeout(() => this._makeDecision(), DELAYS.DECISION);
        }
    }

    _onError(err) {
        this._logToUI(`Network Error: ${err.message}`, 'error');
        // More sophisticated error handling (e.g. specific reconnect logic) can be added.
        // _onClose will handle generic reconnect attempts
    }

    _onClose() {
        this._logToUI('Connection closed.', 'info');

        if (this.isStopped) return;

        if (this.gameState.balance === 0) {
            this._logToUI('Disconnected with zero balance. Resetting game state and attempting to reconnect for balance refresh.', 'info');
            this.gameState.resetAll(); // Reset the entire game state to mimic a fresh start
            this._updateUiGameState(); // Update UI to reflect the cleared state
            this.reconnectAttempts = 0; // Reset attempts for balance refresh scenario
            setTimeout(() => this._connect(), this.reconnectDelay);
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this._logToUI(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
            // For non-zero balance disconnects, only reset minimal state necessary for reconnection
            this.gameState.isAwaitingInput = false;
            this.gameState.isRoundInProgress = false;
            this._updateUiGameState();
            setTimeout(() => this._connect(), this.reconnectDelay);
        } else {
            this._logToUI('Max reconnect attempts reached. AutoPlayer stopping.', 'error');
            this.stop();
        }
    }

    _makeDecision() {
        if (this.isStopped || !this.gameState.isAwaitingInput) {
            return;
        }

        this.gameState.isAwaitingInput = false; // Assume we will send a command
        let command = null;

        if (!this.gameState.playerId) { // Not logged in yet
            command = `LOGIN ${this.username} ${this.password}`;
        } else if (!this.gameState.isRoundInProgress) {
            // Add delay before starting a new round
            setTimeout(() => {
                const betAmount = this.strategy.getBetAmount(this.gameState.balance);
                if (betAmount > 0) {
                    command = `BET ${betAmount}`;
                    this.gameState.currentBet = betAmount;
                    this._sendCommandWithDelay(command);
                } else if (this.gameState.balance === 0) {
                    this._logToUI('Balance is 0. Proactively disconnecting to attempt re-login for balance refresh.', 'info');
                    this.network.disconnect();
                } else {
                    this._logToUI('Not in round, positive balance, but no clear signal to BET. Waiting for next AWAITING INPUT.', 'info');
                    this.gameState.isAwaitingInput = true;
                }
            }, DELAYS.ROUND_START);
            return;
        } else {
            // Round is in progress, player's turn
            const { playerHandTotal, playerHandIsSoft, dealerUpCard, playerHand } = this.gameState;
            const canDouble = playerHand.length === 2 && (this.gameState.balance >= this.gameState.currentBet);
            
            if (!dealerUpCard) {
                this._logToUI('Error: Dealer up card is unknown. Cannot make decision.', 'error');
                this.gameState.isAwaitingInput = true;
                return;
            }

            command = this.strategy.determineBestAction(
                playerHandTotal,
                playerHandIsSoft,
                dealerUpCard,
                canDouble
            );
        }

        if (command) {
            this._sendCommandWithDelay(command);
        } else {
            this.gameState.isAwaitingInput = true;
        }
    }

    _sendCommandWithDelay(command) {
        setTimeout(() => {
            this._logToUI(`Sending: ${command}`, 'client');
            this.network.sendCommand(command);
            if (sendToRenderer) {
                sendToRenderer('last-action', command);
            }
        }, DELAYS.AFTER_ACTION);
    }
}

module.exports = AutoPlayer; 