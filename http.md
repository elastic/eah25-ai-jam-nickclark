# Blackjack HTTP API

This document describes the available HTTP API endpoints for the Blackjack service.

---

## GET /api/v0/leaderboard

Returns the current leaderboard of players. Supports sorting and pagination.

### Method
`GET`

### Query Parameters
- `order` (optional): Field to sort by (e.g `chips`, `max_chips`, `game_count`).
- `offset` (optional): Integer offset for pagination. Defaults to 0 if not specified or invalid.
- `limit` (optional): Maximum number of entries to return. Defaults to 20 if not specified or invalid.

### Response
- **Content-Type:** `application/json`
- **Status 200 OK:**

```json
{
  "entries": [
    {
      "player_id": "string",
      "chips": 123,
      "max_chips": 456,
      "epoch": 789,
      "game_count": 10
    },
    ...
  ]
}
```
- Each entry represents a player on the leaderboard.

### Error Responses
- **Status 500 Internal Server Error:**
  - On database or encoding errors, returns:
```json
{ "error": "failed to fetch leaderboard" }
```
    or
```json
{ "error": "failed to encode leaderboard" }
```

### Example Request
```
GET /api/v0/leaderboard?order=chips&limit=10&offset=0
```

---
