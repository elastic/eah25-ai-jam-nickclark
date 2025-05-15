# Blackjack Protocol

## Protocol Overview

The protocol is a relatively simple line based text protocol, each line ends with a newline character `\n`.

## Connection

- Users connect to the server to play blackjack.
- Whenever the server is ready to process input, it will send an `AWAITING INPUT` message. Only a single command is accepted after this message. If the client wants to perform multiple commands, it must wait for the next `AWAITING INPUT` message before sending the next command.
- The first command sent by the client must be a `LOGIN` command.
- Multiple rounds can be played via the same connection.
- The balance is stored on the server and persists between connections.
- Simultaneous connections for the same user are not supported.
- If the balance is 0 when reconnecting, the balance is refreshed to a base amount.
- Any disconnection will cause an in-progress bet to be forfeit.

## Commands
1. `LOGIN`
  - **Purpose**: Authenticate or create a new user. Once per connection. This *MUST* be the first command sent by a client.
  - **Syntax**: `LOGIN <username> <password>`
    - `<username>`: The username to authenticate or create.
    - `<password>`: The password for the user.
    - The server will register a new account or login an existing account.
  - **Response**:
    - `OK user:<user_id> balance:<balance>`: Successful connection.
    - `ERROR <message>`: Connection failed.

2. `BET`
  - **Purpose**: Place a bet for the current game. Starts a new round. Can only be sent if a round is not already in progress. You can check this using `STATUS` command/response or parse the events.
  - **Syntax**: `BET <amount>`
    - `<amount>`: The amount to bet.
  - **Responses**:
    - `OK balance:<remaining_balance> dealer:<dealer_card> you:<player_total> [<player_card_1> <player_card_2>]`: Bet accepted, cards dealt.
    - `ERROR <message>`: Bet failed.
    - If there is a blackjack, the round ends after one of the following is sent:
      - `PUSH BOTH BLACKJACK`: Dealer and client were dealt blackjack.
      - `BLACKJACK`: Client was dealt blackjack, server was not.
      - `DEALER BLACKJACK`: Dealer was dealt blackjack, client was not.

3. `HIT`
  - **Purpose**: Request another card. Only available during a round.
  - **Syntax**: `HIT`
  - **Response**:
    - `OK <new card> total:<hand_value>`: Card dealt. If the hand value is 21 or over, the round ends.
    - `ERROR <message>`: Action failed.

4. `STAND`
  - **Purpose**: End the player's turn. Only available during a round.
  - **Syntax**: `STAND`
  - **Response**:
    - `OK <final_hand_value>`: Turn ended.
    - `ERROR <message>`: Action failed.

5. `DOUBLE`
  - **Purpose**: Double your bet after seeing the initial deal.  Exactly one more card will be dealt. Only available during a round.
  - **Syntax**: `DOUBLE`
  - **Response**:
    - `OK <new card> <total>`: Current hand status.

6. `STATUS`
  - **Purpose**: Query status. Available any time after a successful `LOGIN`
  - **Syntax**: `STATUS`
  - **Response**:
    - `OK user:<user_id> balance:<balance>`: Status if game not in progress.
    - `OK user:<user_id> balance:<balance> bet:<amount> dealer:<dealer card showing> you:<your hand total>`: Status if game in progress.

7. `QUIT`
  - **Purpose**: Disconnect from the server. Always available.
  - **Syntax**: `QUIT`
  - **Response**:
    - `OK`: Disconnection successful.

## Events

During a connection, the following events may occur:

1. `AWAITING INPUT`
  - The server is waiting for input from the client. This will always be the first message sent to a connecting client.
2. `ERROR <message>`
  - There has been an error. If it's fatal, the connection will be closed by the server.
3. `PUSH BOTH BLACKJACK`
  - Both the player and dealer have blackjack, happens after a `BET` command.
  - The round ends and the player's bet is returned.
4. `BLACKJACK`
  - The player has blackjack, happens after a `BET` command.
  - The round ends and the player's bet is doubled.
5. `DEALER BLACKJACK`
  - The dealer has blackjack, happens after a `BET` command.
  - The round ends and the player's bet is returned.  
6. `BUST dealer:<dealer_hand_value>`
  - The player has busted. 
7. `PUSH`
  - The round ends and the player's bet is returned.
8. `DEALER HIT <card>`
  - The dealer has drawn a card.
9. `DEALER BUST`
  - The dealer has busted, happens after a `BET` command.
  - The round ends and the player's bet is returned.
10.  `DEALER WINS`
  - The dealer wins, happens after a `BET` command.
  - The round ends and the player's bet is returned.
11.  `YOU WIN`
  - The player wins, happens after a `BET` command.
  - The round ends and the player's bet is doubled.
12.  `BET to play`
  - Indicates you may start a new round by using the `BET` command.
 
## Example Session

Empty lines and comments have been added for readability

```
$ telnet localhost 8081
Trying ::1...
Connected to localhost.
Escape character is '^]'.
AWAITING INPUT

# we start by logging in:
LOGIN foo bar
OK user:foo balance:100
BET to play
AWAITING INPUT

# start a game by betting
BET 50
OK balance:50 dealer:7 you:12 [9 3]
AWAITING INPUT

# we have 12, so we hit
HIT
OK 5 total:17

# standing on 17:
STAND
OK dealer:13 [7 6] you:17
DEALER HIT 10
DEALER BUST
BET to play
AWAITING INPUT

# yay, dealer busted so we won, lets play another round
BET 40
OK balance:110 dealer:9 you:20 [10 10]
AWAITING INPUT

# we have 20, so we stand
STAND
OK dealer:18 [9 9] you:20
DEALER HIT 4
DEALER BUST
BET to play
AWAITING INPUT

# again a victory! let's play more
BET 20
OK balance:170 dealer:10 you:17 [10 7]
AWAITING INPUT

#checking our status
STATUS
OK user:foo balance:170 bet:20 dealer:10 you:17
AWAITING INPUT

# 17 is risky, but lets hit it
HIT
OK 2 total:19
AWAITING INPUT

# 19 is pretty good, lets stand
STAND
OK dealer:16 [10 6] you:19
DEALER HIT 1
DEALER HIT 5
DEALER BUST
BET to play
AWAITING INPUT

# we keep winning, let's check our balance and go home
STATUS
OK user:foo balance:210
BET to play
AWAITING INPUT

QUIT
OK Goodbye
Connection closed by foreign host
```

That was fun, let's go all in:

````
$ telnet localhost 8081
Trying ::1...
Connected to localhost.
Escape character is '^]'.
AWAITING INPUT
LOGIN foo bar
OK user:foo balance:210
BET to play
AWAITING INPUT

# note our balance is kept from above, we we can bet high here:
BET 210
OK balance:0 dealer:10 you:15 [10 5]
AWAITING INPUT

HIT
OK 7 total:22
BUST dealer: 20
BET to play
AWAITING INPUT

# time to reflect on our poor choice:
STATUS
OK user:foo balance:0
BET to play
AWAITING INPUT

# we're out of chips, so we quit (we'll get reset to 100 when we reconnect)
QUIT
OK Goodbye
Connection closed by foreign host.
```
