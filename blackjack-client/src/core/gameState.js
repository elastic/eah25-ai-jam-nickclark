class GameStateManager {
    constructor() {
        this.resetAll();
    }

    resetAll() {
        this.playerId = null;
        this.balance = 0;
        this.currentBet = 0;
        this.playerHand = []; // Array of card strings, e.g., 'AS', '10H'
        this.playerHandTotal = 0;
        this.playerHandIsSoft = false;
        this.dealerUpCard = null; // Single card string
        this.dealerHand = []; // Array of card strings (fully revealed at end)
        this.dealerHandTotal = 0; // Calculated at end or as dealer plays
        this.isRoundInProgress = false;
        this.isAwaitingInput = false;
        this.lastServerMessage = '';
        // availableActions might be derived or set based on game rules/state
        // For now, it's not explicitly managed here but by the autoPlayer
    }

    resetForNewRound() {
        this.currentBet = 0;
        this.playerHand = [];
        this.playerHandTotal = 0;
        this.playerHandIsSoft = false;
        this.dealerUpCard = null;
        this.dealerHand = [];
        this.dealerHandTotal = 0;
        this.isRoundInProgress = false;
        // isAwaitingInput is controlled by server messages
    }

    // Helper to get numerical value of a card rank
    _getCardValue(cardRank) {
        if (['K', 'Q', 'J', 'T'].includes(cardRank.toUpperCase())) {
            return 10;
        }
        if (cardRank.toUpperCase() === 'A') {
            return 11; // Ace is initially 11
        }
        return parseInt(cardRank);
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        let isSoft = false;

        for (const cardStr of hand) {
            // Assuming cardStr is like 'AS', '10H', '7D'. First char(s) for rank.
            let rank;
            if (cardStr.startsWith('10')) { // Handle '10'
                rank = '10';
            } else {
                rank = cardStr.substring(0, 1);
            }

            const cardValue = this._getCardValue(rank);
            if (rank.toUpperCase() === 'A') {
                aces++;
            }
            value += cardValue;
        }

        // Adjust for Aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        // Check if soft (an Ace is counted as 11)
        // Recalculate with one Ace as 11 if possible without busting to confirm soft status
        if (aces === 0) {
            isSoft = false;
        } else {
            let tempValue = 0;
            let tempAces = 0;
            for (const cardStr of hand) {
                let rank = cardStr.startsWith('10') ? '10' : cardStr.substring(0, 1);
                tempValue += this._getCardValue(rank);
                if (rank.toUpperCase() === 'A') tempAces++;
            }
            // If one ace is 11 and others are 1, is it soft?
            // A hand is soft if an Ace can be 11 without busting.
            // If all aces must be 1 to stay <= 21, it's hard.
            let potentialValueWithOneAceAs11 = (tempValue - (tempAces * 11)) + 11 + (tempAces -1);
            if (potentialValueWithOneAceAs11 <= 21 && tempAces > 0) {
                 isSoft = true;
            } else {
                isSoft = false;
            }
        }

        return { total: value, isSoft };
    }

    updatePlayerHandState() {
        const handState = this.calculateHandValue(this.playerHand);
        this.playerHandTotal = handState.total;
        this.playerHandIsSoft = handState.isSoft;
    }

    setPlayerCards(cardsArray) { // e.g., ['9S', '3D']
        this.playerHand = [...cardsArray];
        this.updatePlayerHandState();
    }

    addPlayerCard(cardString) { // e.g., '5H'
        this.playerHand.push(cardString);
        this.updatePlayerHandState();
    }

    // updateStateFromMessage will be complex and parse various server messages.
    // This is a placeholder for its structure.
    // Actual parsing logic will be added iteratively based on protocol.md.
    updateStateFromMessage(message) {
        this.lastServerMessage = message;
        console.log(`GameStateManager: Processing message: ${message}`);

        if (message.startsWith('OK user:')) { // LOGIN or STATUS response
            const parts = message.split(' ');
            parts.forEach(part => {
                if (part.startsWith('user:')) {
                    this.playerId = part.split(':')[1];
                }
                if (part.startsWith('balance:')) {
                    this.balance = parseInt(part.split(':')[1]);
                }
                if (part.startsWith('bet:')) { // Only in STATUS during game
                    this.currentBet = parseInt(part.split(':')[1]);
                    this.isRoundInProgress = true; // Implied if bet is present
                }
                // dealer: and you: from STATUS will be handled if needed for more detail
            });
        } else if (message.startsWith('OK balance:')) { // BET response
            // OK balance:<remaining_balance> dealer:<dealer_card> you:<player_total> [<player_card_1> <player_card_2>]
            const balanceMatch = message.match(/balance:(\d+)/);
            if (balanceMatch) this.balance = parseInt(balanceMatch[1]);

            const dealerCardMatch = message.match(/dealer:([^\s]+)/);
            if (dealerCardMatch) this.dealerUpCard = dealerCardMatch[1];

            const playerCardsMatch = message.match(/\[([^\]]+)\]/);
            if (playerCardsMatch) {
                this.playerHand = playerCardsMatch[1].split(' ');
                this.updatePlayerHandState();
            }
            // player_total from message is also available, can be used for verification
            // const playerTotalMatch = message.match(/you:(\d+)/);
            // if (playerTotalMatch && parseInt(playerTotalMatch[1]) !== this.playerHandTotal) {
            // console.warn('Player total from server differs from calculation!');
            // }
            this.isRoundInProgress = true;

        } else if (message.startsWith('OK <new card> total:')) { // HIT response (Incorrect format in plan, actual: OK <new card> total:<hand_value>)
            // Example: OK 5 total:17
            const parts = message.split(' '); // e.g. ['OK', '5', 'total:17']
            const newCard = parts[1];
            // const totalFromServer = parseInt(parts[2].split(':')[1]); // Not parts[2], it is parts[3]
            const totalFromServer = parseInt(parts[parts.length-1].split(':')[1]); 

            this.addPlayerCard(newCard);
            // Optional: verify totalFromServer with this.playerHandTotal
            if (this.playerHandTotal !== totalFromServer) {
                console.warn(`HIT Response: Server total ${totalFromServer}, client calculated ${this.playerHandTotal}. Trusting client calc for now.`);
            }
            if (this.playerHandTotal >= 21) {
                // Round might end, AutoPlayer will handle logic based on subsequent messages (BUST, etc.)
            }
        } else if (message.startsWith('OK <new card> <total>')) { // DOUBLE response (Incorrect format in plan, actual: OK <new card> <total>)
             // Example: OK Q 20 (assuming Q is new card, 20 is total)
            const parts = message.split(' '); // ['OK', 'Q', '20']
            const newCard = parts[1];
            const totalFromServer = parseInt(parts[2]);
            this.addPlayerCard(newCard);
            if (this.playerHandTotal !== totalFromServer) {
                console.warn(`DOUBLE Response: Server total ${totalFromServer}, client calculated ${this.playerHandTotal}. Trusting client calc for now.`);
            }
            // Double implies player's turn ends. AutoPlayer handles this.

        } else if (message === 'PUSH BOTH BLACKJACK' || message === 'BLACKJACK' || message === 'DEALER BLACKJACK' || 
                   message.startsWith('BUST') || message === 'PUSH' || message.startsWith('DEALER BUST') || 
                   message === 'DEALER WINS' || message === 'YOU WIN') {
            this.isRoundInProgress = false; // Round definitely ends
            // Balance updates are typically not in these messages but implied or follow via STATUS/BET
        } else if (message === 'BET to play') {
            this.isRoundInProgress = false; // Ensure state is ready for new bet
        }

        // AWAITING INPUT is handled by AutoPlayer to gate commands
        if (message.includes('AWAITING INPUT')) {
            this.isAwaitingInput = true;
        } else {
            // Most commands will make server busy, so set to false unless it's a simple status
            // This is a simplification; autoplayer should manage this more strictly.
            // this.isAwaitingInput = false;
        }
        return this.getState(); // Return a snapshot of the current state
    }

    getState() {
        return {
            playerId: this.playerId,
            balance: this.balance,
            currentBet: this.currentBet,
            playerHand: [...this.playerHand],
            playerHandTotal: this.playerHandTotal,
            playerHandIsSoft: this.playerHandIsSoft,
            dealerUpCard: this.dealerUpCard,
            // dealerHand: [...this.dealerHand], // Only send if revealed
            // dealerHandTotal: this.dealerHandTotal,
            isRoundInProgress: this.isRoundInProgress,
            isAwaitingInput: this.isAwaitingInput,
            lastServerMessage: this.lastServerMessage
        };
    }
}

module.exports = GameStateManager; 