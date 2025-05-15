## Plan
1.  **Modify `mapCardStringToFilename` in `blackjack-client/src/renderer/renderer.js`:**
    *   Define an array of valid card ranks (e.g., `['A', 'K', 'Q', 'J', 'T', '10', '9', ..., '2']`) and an array of suits (`['S', 'H', 'D', 'C']`).
    *   After normalizing the input `cardString`, check if the `normalizedCard` itself is one of the valid ranks (meaning it's a rank-only string like "8" or "K").
        *   If it is a rank-only string:
            *   Set `rankStr` to this `normalizedCard`.
            *   Randomly select a `suitChar` from the defined suits array.
            *   Add a `console.info` message indicating that a suit was randomly assigned.
        *   Else (if the `normalizedCard` is not a recognized rank-only string):
            *   Use the existing logic to parse `rankStr` and `suitChar` from `normalizedCard` (checking lengths 2 for general cards and 3 for '10' cards).
            *   If this parsing fails, log the "Invalid card string format" error and return `'back.png'`.
    *   Proceed with the existing `switch` statements to convert `rankStr` and `suitChar` to `rankFilename` and `suitFilename`.
    *   Ensure existing error fallbacks within switch statements for unknown ranks/suits remain.
2.  **Identify Balance Update Location:** *Completed*
    *   `GameStateManager.balance` in `blackjack-client/src/core/gameState.js` is the primary source.
    *   Updated by `GameStateManager.updateStateFromMessage()` based on server responses (e.g., `OK user: balance:X`, `OK balance:X`).
    *   `AutoPlayer` reads this balance.
3.  **Implement Re-login Logic:** *Completed*
    *   Modified `AutoPlayer._onData` in `blackjack-client/src/core/autoPlayer.js`:
        *   If balance *transitions* to 0 (was >0, now 0) and no round is in progress, force a disconnect.
        *   This triggers `_onClose` for reconnect/re-login.
    *   Modified `AutoPlayer._makeDecision` in `blackjack-client/src/core/autoPlayer.js` (based on testing feedback):
        *   If it's time to bet (not in a round) and `gameState.balance` is 0, proactively call `this.network.disconnect()`.
        *   This also triggers the `_onClose` handler, ensuring a re-login attempt even if balance was already zero after a previous login.
    *   Modified `AutoPlayer._onClose` in `blackjack-client/src/core/autoPlayer.js` (based on further testing feedback):
        *   When `gameState.balance === 0` and a reconnect is triggered, call `this.gameState.resetAll()` *before* `this._connect()`.
        *   This ensures the client attempts re-login from a completely fresh game state, similar to an app restart, which should allow the server to grant new tokens/balance if that's its behavior.
4.  **Testing:**
    *   Manually test the scenario by playing until the balance is zero to ensure the re-login and game continuation works as expected.

## Log
- Investigated `renderer.js` and `gameState.js`.
- Identified potential issue in `mapCardStringToFilename` related to card image filename generation.
- Current logic generates filenames like `ace_of_spades.png`.
- Comments suggest `ace_of_spades2.png` might be the intended/available assets.
- If `require` fails to find the generated filename, it falls back to `back.png`.
- This fallback mechanism is the likely reason for seeing only card backs.
- Proposed plan to modify `mapCardStringToFilename` to generate `...2.png` filenames.
- User approved the plan.
- Modified `blackjack-client/src/renderer/renderer.js` to append `2` to the image filenames in `mapCardStringToFilename`.
- User reports removing `_2` suffixed cards. Need to revert the filename generation to not include `2`.
- User approved the plan to revert the filename generation.
- Modified `blackjack-client/src/renderer/renderer.js` to remove `2` from image filenames in `mapCardStringToFilename`.
- User provided console logs showing "Invalid card string format for image mapping: 8" and "9".
- Analyzed `renderer.js` (`mapCardStringToFilename`) and `gameState.js` (`updateStateFromMessage`).
- Determined `mapCardStringToFilename` receives single-character card strings (e.g., "8") because `gameState.js` stores them when parsing server messages (e.g., HIT responses like "OK 8 total:17").
- `mapCardStringToFilename` cannot map a card image without suit information, correctly logs an error, and returns `back.png`.
- Concluded the root cause is likely the server not sending full card strings (rank + suit) for all cards.
- User requested that if a suit is missing, one should be made up randomly.
- User approved the plan to randomly assign suits.
- Modified `mapCardStringToFilename` in `blackjack-client/src/renderer/renderer.js` to implement random suit assignment for rank-only card strings.
- User wants to implement auto re-login if balance hits 0.
- Plan approved.
- Investigated `gameState.js`, `autoPlayer.js`, and `renderer.js`.
- Identified that `GameStateManager.balance` is updated by server messages.
- Identified that `AutoPlayer._makeDecision()` handles login, and `_onClose()` handles reconnects which can lead to re-login if balance is zero.
- Implemented re-login logic in `AutoPlayer._onData` by forcing a disconnect if balance hits zero when no round is in progress, leveraging existing reconnect/login mechanisms.
- User testing feedback: Bot gets stuck logging "Waiting for balance refresh or disconnect." when balance is 0 after a re-login, before eventually disconnecting and retrying.
- Analysis: `_onData` change only handles initial transition to zero. If balance is still zero after re-login, `_makeDecision` would stall. Plan to make `_makeDecision` proactively disconnect if balance is 0 when a bet is due.
- Implemented change in `_makeDecision`.
- User testing feedback: Still not working. Tokens/balance are received after a manual app restart, but not with the automated re-login. This suggests the client state is not fully reset during auto re-login.
- Analysis: The `GameStateManager` (`this.gameState`) is not being fully reset in `_onClose` during the zero-balance reconnect sequence. Plan to call `this.gameState.resetAll()` in `_onClose` when balance is 0 before attempting to reconnect.

## State
Status: COMPLETED
*Current Plan Step: 4. Testing - Iterating based on feedback* 