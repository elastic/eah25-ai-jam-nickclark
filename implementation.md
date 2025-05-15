## Implementation Plan: Automated Blackjack Client

This document outlines the plan to create an automated Blackjack client using Electron Forge. The client will feature a graphical user interface, connect to a Blackjack server using a specified text-based protocol, and employ an optimal strategy to play autonomously.

### I. Project Setup (Electron Forge)
1.  **Initialize Electron Forge Project:**
    *   Use `npx create-electron-app blackjack-client --template=webpack` (or `yarn create electron-app blackjack-client --template=webpack`) to initialize a new project with Webpack pre-configured. This aids in managing front-end assets and JavaScript modules.
    *   Alternatively, a simpler vanilla JavaScript template can be used if preferred, with manual setup for any desired build process.
2.  **Install Core Dependencies:**
    *   No specific UI framework (like React or Vue) is mandated, so initial development will use vanilla HTML, CSS, and JavaScript for the renderer process.
    *   Consider a lightweight animation library (e.g., GSAP or Anime.js) later if CSS animations/transitions become too complex for "pleasing animations".
    *   The Node.js built-in `net` module will be used for TCP socket communication in the main process or a preload script.
3.  **Define Project Structure:**
    *   `src/main.js`: Electron main process. Handles window creation, network communication, and core automation logic.
    *   `src/preload.js`: Exposes Node.js functionalities (like IPC and potentially parts of the network module) securely to the renderer process.
    *   `src/renderer/index.html`: Main HTML file for the GUI.
    *   `src/renderer/style.css`: CSS for styling the GUI.
    *   `src/renderer/renderer.js`: JavaScript for the renderer process, handling UI updates and interactions.
    *   `src/core/network.js`: Module for TCP communication and protocol parsing.
    *   `src/core/gameState.js`: Module for managing the client-side game state.
    *   `src/core/strategy.js`: Module for Blackjack basic strategy decisions.
    *   `src/core/autoPlayer.js`: Module orchestrating the autonomous play.
4.  **Setup IPC (Inter-Process Communication):**
    *   Define channels for communication between the main process (handling game logic, network) and the renderer process (displaying UI).
        *   Example channels: `update-game-state`, `log-message`, `request-action`.

### II. Core Modules Development
1.  **Networking Module (`src/core/network.js`):**
    *   **`connect(host, port, onDataCallback, onErrorCallback, onCloseCallback)`:** Establishes TCP connection to the Blackjack server.
    *   **`sendCommand(commandString)`:** Sends a command string (e.g., `LOGIN user pass`) to the server, ensuring it's newline-terminated (`\\n`).
    *   **Protocol Parser (within `onDataCallback`):**
        *   Handles incoming data chunks, splits them by newline characters.
        *   Parses each line according to `protocol.md` (e.g., `OK user:... balance:...`, `ERROR ...`, `AWAITING INPUT`, game events).
        *   Emits structured events or calls specific handlers based on parsed messages.
    *   Manages connection state (connected, disconnected).
2.  **UI Module (`src/renderer/` files):**
    *   **HTML Structure (`index.html`):**
        *   Main container.
        *   Dealer area: display dealer's visible card and eventually full hand.
        *   Player area: display player's cards and hand total.
        *   Game Info area: display balance, current bet, game status messages/logs.
        *   Connection status indicator.
    *   **CSS Styling (`style.css`):**
        *   "Pleasing GUI interface with animations and nice colors":
            *   Color Palette: Choose a modern and clean theme. Dark themes often work well for game interfaces (e.g., dark greens, greys, with vibrant accents for calls to action or important info).
            *   Card Design: Style divs to represent cards. Include suit and rank. Consider using SVG icons for suits.
            *   Layout: Use CSS Flexbox or Grid for a responsive and organized layout.
            *   Typography: Choose readable fonts.
    *   **Renderer Logic (`renderer.js`):**
        *   Listens for IPC messages from the main process (e.g., `update-game-state`).
        *   Updates the DOM dynamically to reflect the current game state (dealer/player hands, balance, messages).
        *   Manages UI animations for:
            *   Card dealing (e.g., cards sliding from a point to the hand).
            *   Chip movements (visual representation of betting and winning/losing).
            *   Status updates fading in/out.
            *   Use CSS transitions and animations primarily.
3.  **Game State Manager (`src/core/gameState.js`):**
    *   **Data Store:**
        *   `playerId`: string
        *   `balance`: number
        *   `currentBet`: number
        *   `playerHand`: array of card objects (e.g., `{rank: 'A', suit: 'S', value: 11}`)
        *   `playerHandTotal`: number
        *   `playerHandIsSoft`: boolean
        *   `dealerUpCard`: card object
        *   `dealerHand`: array of card objects (revealed at end of round)
        *   `isRoundInProgress`: boolean
        *   `isAwaitingInput`: boolean (critical for command timing)
        *   `lastServerMessage`: string (for logging/debugging)
        *   `availableActions`: array (e.g., `['HIT', 'STAND', 'DOUBLE']`)
    *   **Functions:**
        *   `updateStateFromMessage(parsedMessage)`: Modifies state based on messages from the server.
        *   `calculateHandValue(hand)`: Calculates blackjack hand value, correctly handling Aces (1 or 11). Determines if hand is soft.
        *   `resetForNewRound()`: Clears hand data, sets `isRoundInProgress` appropriately.
        *   `setPlayerCards(cardsString)`: Parses card strings like `[9 3]` from `BET` response.
        *   `addPlayerCard(cardString)`: Parses card string like `5` from `HIT` response.
4.  **Blackjack Strategy Module (`src/core/strategy.js`):**
    *   **`getCardValue(cardRank)`:** Converts card rank ('2'-'9', 'T', 'J', 'Q', 'K', 'A') to its numerical game value. 'A' initially 11.
    *   **`determineBestAction(playerHandTotal, playerHandIsSoft, dealerUpCardValue)`:**
        *   Implements standard Blackjack Basic Strategy tables.
        *   Input: Player's current hand total, whether it's a soft total (contains an Ace counted as 11), and the dealer's visible card value.
        *   Output: Action string (`'HIT'`, `'STAND'`, `'DOUBLE'`).
        *   Strategy decisions will depend on common rules (e.g., dealer stands on soft 17) as `protocol.md` doesn't specify these. Assume no splitting as it's not in the protocol.
    *   **Betting Strategy:**
        *   Initial fixed bet (e.g., a small percentage of balance, or a constant like 10 units).
        *   Consider the "balance refresh on 0" rule: if balance becomes 0 and client reconnects, it gets a new base amount. The strategy could involve a more aggressive first bet after such a refresh.

### III. Automation Logic (`src/core/autoPlayer.js`)
1.  **Initialization:**
    *   `start(username, password, host, port)`:
        *   Stores credentials and server info.
        *   Initializes `GameStateManager`.
        *   Initializes `NetworkModule` and attempts connection.
2.  **Event-Driven Automation Loop (primarily reacting to `NetworkModule` events and `GameStateManager` updates):**
    *   **On Connected:** Send `LOGIN <username> <password>`.
    *   **On `AWAITING INPUT` received (via `NetworkModule` -> `main.js` -> `AutoPlayer`):**
        *   Set `gameState.isAwaitingInput = true`.
        *   Consult `GameStateManager` and `StrategyModule` to decide next action.
        *   If `!gameState.isRoundInProgress` and `gameState.balance > 0` (and a "BET to play" type message was received):
            *   Determine `betAmount` using `StrategyModule.bettingStrategy()`.
            *   `NetworkModule.sendCommand(\`BET \${betAmount}\`)`.
            *   `gameState.isAwaitingInput = false`.
        *   Else if `gameState.isRoundInProgress` and it's player's turn:
            *   `action = StrategyModule.determineBestAction(...)`.
            *   If `action === 'DOUBLE'` and it's a valid move (first two cards, sufficient balance):
                *   `NetworkModule.sendCommand('DOUBLE')`.
            *   Else if `action === 'HIT'`:
                *   `NetworkModule.sendCommand('HIT')`.
            *   Else (`action === 'STAND'`):
                *   `NetworkModule.sendCommand('STAND')`.
            *   `gameState.isAwaitingInput = false`.
        *   Else (e.g., game ended, waiting for "BET to play", or just logged in):
            *   Potentially send `STATUS` if unsure, or wait for next prompt that allows `BET`.
    *   **On Server Message Parsed (e.g., `OK user:...`, `DEALER HIT ...`, `BUST ...`):**
        *   `GameStateManager.updateStateFromMessage(parsedMessage)`.
        *   Main process receives this updated state and forwards relevant parts to renderer for UI update via IPC.
        *   If the message indicates the round ended (e.g., `YOU WIN`, `BUST`), update `gameState.isRoundInProgress = false`.
        *   If message is `ERROR ...`, log it. Implement basic error handling (e.g., retry on some errors, display critical errors in UI).
    *   **On Disconnected:**
        *   Log disconnection.
        *   If `gameState.balance === 0`, attempt reconnect to trigger balance refresh.
        *   Implement a general auto-reconnect strategy with backoff.
3.  **Synchronization with `AWAITING INPUT`:**
    *   Crucially, ensure no command is sent until `AWAITING INPUT` is received AND processed, and `gameState.isAwaitingInput` allows sending a command.

### IV. Integration in Main Process (`src/main.js`)
1.  **Window Creation:** Create `BrowserWindow` loading `index.html`. Pass `preload.js`.
2.  **Module Instantiation:**
    *   Create instances of `AutoPlayer`, `NetworkModule` (or `AutoPlayer` manages `NetworkModule`), `GameStateManager`.
3.  **IPC Handling:**
    *   Listen for any requests from Renderer (e.g., manual start/stop of automation if implemented).
    *   Send game state updates, logs, and status changes to Renderer using `mainWindow.webContents.send(...)`.
4.  **Starting Automation:**
    *   Provide a mechanism to start the `AutoPlayer` (e.g., on app load, or via a UI button if manual start is desired for testing). The user request implies fully autonomous from the start.

### V. UI Polish and Enhancements
1.  **Refine Animations:** Ensure smooth and visually appealing animations for card movements, bet placements, and result announcements.
2.  **Visual Feedback:** Clearly indicate current game phase, whose turn it is, and results of strategy decisions.
3.  **Log Display:** Show a running log of server messages and client actions in a scrollable area in the UI for transparency and debugging.
4.  **Aesthetics:** Iterate on colors, fonts, and layout to achieve a "pleasing" look and feel. Test on different screen sizes if broad compatibility is desired (though less critical for a fixed-window Electron app).

### VI. Testing and Packaging
1.  **Manual Testing:**
    *   Connect to the actual Blackjack server.
    *   Verify `LOGIN` sequence.
    *   Observe autonomous betting, hitting, standing, doubling.
    *   Check if balance updates correctly based on game outcomes.
    *   Verify handling of Blackjack, Push, Bust scenarios.
    *   Test the "balance refresh on 0" by intentionally losing all chips and observing reconnect behavior.
    *   Monitor strict adherence to `AWAITING INPUT` before sending commands.
2.  **Strategy Verification:**
    *   Cross-reference a few key decisions made by the `StrategyModule` with standard basic strategy charts.
    *   Log decisions and reasons if helpful during debugging.
3.  **Error Handling Testing:**
    *   Simulate network interruptions to test reconnect logic.
    *   Test with invalid server responses (if possible to simulate) or malformed commands.
4.  **Packaging:**
    *   Use Electron Forge commands (`npm run make` or `yarn make`) to create distributable application packages for the target OS (e.g., Windows, macOS, Linux).

This plan provides a structured approach to developing the automated Blackjack client. Each phase builds upon the previous one, leading to a functional and aesthetically pleasing application that meets the specified requirements. 