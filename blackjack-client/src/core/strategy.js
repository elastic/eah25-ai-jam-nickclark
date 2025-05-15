class StrategyModule {
    constructor() {
        // Basic Strategy Table (Hard Totals)
        // Key: PlayerTotal_DealerUpCard
        // Value: H (Hit), S (Stand), D (Double if allowed, otherwise Hit)
        this.hardStrategy = {
            // Player 4-8: Always Hit (not explicitly listed, as it's always H)
            // Player 9
            '9_2': 'H', '9_3': 'D', '9_4': 'D', '9_5': 'D', '9_6': 'D', '9_7': 'H', '9_8': 'H', '9_9': 'H', '9_10': 'H', '9_A': 'H',
            // Player 10
            '10_2': 'D', '10_3': 'D', '10_4': 'D', '10_5': 'D', '10_6': 'D', '10_7': 'D', '10_8': 'D', '10_9': 'D', '10_10': 'H', '10_A': 'H',
            // Player 11
            '11_2': 'D', '11_3': 'D', '11_4': 'D', '11_5': 'D', '11_6': 'D', '11_7': 'D', '11_8': 'D', '11_9': 'D', '11_10': 'D', '11_A': 'D', // Some strategies hit 11 vs A
            // Player 12
            '12_2': 'H', '12_3': 'H', '12_4': 'S', '12_5': 'S', '12_6': 'S', '12_7': 'H', '12_8': 'H', '12_9': 'H', '12_10': 'H', '12_A': 'H',
            // Player 13
            '13_2': 'S', '13_3': 'S', '13_4': 'S', '13_5': 'S', '13_6': 'S', '13_7': 'H', '13_8': 'H', '13_9': 'H', '13_10': 'H', '13_A': 'H',
            // Player 14
            '14_2': 'S', '14_3': 'S', '14_4': 'S', '14_5': 'S', '14_6': 'S', '14_7': 'H', '14_8': 'H', '14_9': 'H', '14_10': 'H', '14_A': 'H',
            // Player 15
            '15_2': 'S', '15_3': 'S', '15_4': 'S', '15_5': 'S', '15_6': 'S', '15_7': 'H', '15_8': 'H', '15_9': 'H', '15_10': 'H', '15_A': 'H', // Some surrender 15v10
            // Player 16
            '16_2': 'S', '16_3': 'S', '16_4': 'S', '16_5': 'S', '16_6': 'S', '16_7': 'H', '16_8': 'H', '16_9': 'H', '16_10': 'H', '16_A': 'H', // Some surrender 16v9,10,A
            // Player 17-21: Always Stand (not explicitly listed)
        };

        // Basic Strategy Table (Soft Totals)
        // Key: PlayerTotal_DealerUpCard (PlayerTotal here is Ace + other card(s), e.g., A,7 = 18)
        this.softStrategy = {
            // Soft 13 (A,2)
            '13_2': 'H', '13_3': 'H', '13_4': 'D', '13_5': 'D', '13_6': 'D', '13_7': 'H', '13_8': 'H', '13_9': 'H', '13_10': 'H', '13_A': 'H',
            // Soft 14 (A,3)
            '14_2': 'H', '14_3': 'H', '14_4': 'D', '14_5': 'D', '14_6': 'D', '14_7': 'H', '14_8': 'H', '14_9': 'H', '14_10': 'H', '14_A': 'H',
            // Soft 15 (A,4)
            '15_2': 'H', '15_3': 'H', '15_4': 'D', '15_5': 'D', '15_6': 'D', '15_7': 'H', '15_8': 'H', '15_9': 'H', '15_10': 'H', '15_A': 'H',
            // Soft 16 (A,5)
            '16_2': 'H', '16_3': 'H', '16_4': 'D', '16_5': 'D', '16_6': 'D', '16_7': 'H', '16_8': 'H', '16_9': 'H', '16_10': 'H', '16_A': 'H',
            // Soft 17 (A,6)
            '17_2': 'H', '17_3': 'D', '17_4': 'D', '17_5': 'D', '17_6': 'D', '17_7': 'H', '17_8': 'H', '17_9': 'H', '17_10': 'H', '17_A': 'H',
            // Soft 18 (A,7)
            '18_2': 'S', '18_3': 'DS', '18_4': 'DS', '18_5': 'DS', '18_6': 'DS', '18_7': 'S', '18_8': 'S', '18_9': 'H', '18_10': 'H', '18_A': 'S', // DS = Double if allowed, else Stand
            // Soft 19 (A,8): Always Stand (S or DS vs 6)
            '19_2': 'S', '19_3': 'S', '19_4': 'S', '19_5': 'S', '19_6': 'DS', '19_7': 'S', '19_8': 'S', '19_9': 'S', '19_10': 'S', '19_A': 'S',
            // Soft 20 (A,9): Always Stand
            // Soft 21 (A,10): Always Stand
        };

        // Note: Pair splitting is not supported by the protocol, so not included.
        // Surrender is also not in protocol, so 'H' is used where surrender might be optimal.
        // 'D' means Double if possible, else Hit.
        // 'DS' means Double if possible, else Stand.
    }

    getCardValue(cardRank) {
        // Card rank can be '2'-'9', 'T', 'J', 'Q', 'K', 'A'
        const rank = cardRank.toUpperCase();
        if (['K', 'Q', 'J', 'T'].includes(rank)) {
            return 10;
        }
        if (rank === 'A') {
            return 11; // Aces are 11 for dealer's upcard value consideration, hand calculator handles player Ace value
        }
        return parseInt(rank);
    }

    determineBestAction(playerHandTotal, playerHandIsSoft, dealerUpCardString, canDouble) {
        // Convert dealerUpCardString (e.g., 'AS', '10H', '7D') to its value
        let dealerRank;
        if (dealerUpCardString.startsWith('10')) { // Handle '10'
            dealerRank = '10';
        } else {
            dealerRank = dealerUpCardString.substring(0, 1);
        }
        const dealerUpCardValue = this.getCardValue(dealerRank);

        let action = 'H'; // Default to Hit

        if (playerHandIsSoft) {
            if (playerHandTotal >= 20) { // A,9 (20) or A,10 (21)
                action = 'S';
            } else if (playerHandTotal === 19) { // A,8
                 action = (dealerUpCardValue === 6 && canDouble) ? 'DS' : 'S';
            } else {
                const key = `${playerHandTotal}_${dealerUpCardValue}`;
                action = this.softStrategy[key] || 'H'; // Fallback to Hit if not in simple table
            }
        } else { // Hard total
            if (playerHandTotal >= 17) {
                action = 'S';
            } else if (playerHandTotal <= 8) {
                action = 'H';
            } else {
                const key = `${playerHandTotal}_${dealerUpCardValue}`;
                action = this.hardStrategy[key] || 'H'; // Fallback to Hit
            }
        }

        // Process action modifications (D/DS)
        if (action === 'D') {
            return canDouble ? 'DOUBLE' : 'HIT';
        }
        if (action === 'DS') {
            return canDouble ? 'DOUBLE' : 'STAND';
        }

        // Map H to HIT, S to STAND
        if (action === 'H') return 'HIT';
        if (action === 'S') return 'STAND';

        return 'HIT'; // Should be covered, but as a final fallback
    }

    getBetAmount(balance, baseBet = 10) {
        // Simple fixed betting strategy for now
        if (balance === 0) return 0; // Cannot bet if no balance
        // If balance is less than baseBet, bet all remaining balance
        return Math.min(balance, baseBet); 
    }
}

module.exports = StrategyModule; 