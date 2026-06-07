# Nakama — Gameplay Features

> See also: [nakama-social.md](nakama-social.md)

---

## Storage Engine

```csharp
// Read objects
var readIds = new[]
{
    new StorageObjectId
    {
        Collection = "player",
        Key        = "loadout",
        UserId     = session.UserId
    }
};
var result = await client.ReadStorageObjectsAsync(session, readIds);
var loadout = JsonSerializer.Deserialize<MyLoadout>(result.Objects.First().Value);

// Write objects
var write = new WriteStorageObject
{
    Collection      = "player",
    Key             = "loadout",
    Value           = JsonSerializer.Serialize(myLoadout),
    PermissionRead  = 1,   // 0=private, 1=owner+server, 2=public
    PermissionWrite = 1
};
await client.WriteStorageObjectsAsync(session, new[] { write });

// Conditional write — prevent overwrite if server changed the object
// Version comes from a previously read StorageObject
write.Version = previousObject.Version; // throws 409 Conflict on mismatch

// Delete objects
var deleteId = new StorageObjectId
{
    Collection = "player",
    Key        = "loadout",
    UserId     = session.UserId
};
await client.DeleteStorageObjectsAsync(session, new[] { deleteId });

// List objects in a collection (paginated)
var list = await client.ListStorageObjectsAsync(session, "player", limit: 20);
if (list.Cursor != null)
    list = await client.ListStorageObjectsAsync(session, "player",
        limit: 20, cursor: list.Cursor);
```

### Storage Permissions

| Value | Effect on Reads | Effect on Writes |
|-------|----------------|-----------------|
| 0 | Server only | Server only |
| 1 | Owner and server | Owner and server |
| 2 | Public (any player can read) | — (write-2 not supported) |

Use **conditional writes** (provide `Version`) whenever both the client and server can update the same key. A `409 Conflict` means the server version changed — re-read and retry.

---

## Remote Procedure Calls (RPCs)

```csharp
// HTTP RPC — works without a socket, suitable for non-latency-sensitive operations
var payload = JsonSerializer.Serialize(new { item = "sword", quantity = 1 });
var response = await client.RpcAsync(session, "reward_item", payload);
var result = JsonSerializer.Deserialize<RewardResult>(response.Payload);

// Socket RPC — lower latency, requires an active socket connection
var response = await socket.RpcAsync("process_action", payload);
```

- Use **HTTP RPC** for item grants, save data, stat updates — anything that can tolerate some latency.
- Use **socket RPC** for in-game real-time operations where the socket is already open.
- RPC payloads **must be JSON strings** — wrap primitive values in an object (`{ "value": 5 }` not `"5"`).
- Empty payloads must be sent as `"{}"` or `null` depending on server function signature.

---

## Matchmaking

```csharp
// Add to matchmaker queue
socket.ReceivedMatchmakerMatched += async matched =>
{
    var match = await socket.JoinMatchAsync(matched);
    foreach (var p in match.Presences)
        SpawnPlayer(p.SessionId);
};

var ticket = await socket.AddMatchmakerAsync(
    query: "*",
    minCount: 2,
    maxCount: 4,
    stringProperties:  new Dictionary<string, string>  { { "mode", "ranked" } },
    numericProperties: new Dictionary<string, double>  { { "rank", 1200.0 } });

// Cancel matchmaking before a match is found
await socket.RemoveMatchmakerAsync(ticket.Ticket);

// Create a relayed (peer-to-peer) match
var match = await socket.CreateMatchAsync();

// Create a named match
var match = await socket.CreateMatchAsync("MyMatchName");

// Join by match ID
var match = await socket.JoinMatchAsync(matchId);

// Join from matchmaker result (preferred over raw matchId)
var match = await socket.JoinMatchAsync(matchmakerMatched);

// List joinable matches
var matches = await client.ListMatchesAsync(session,
    minSize: 2, maxSize: 10, limit: 20,
    authoritative: false, label: "", query: "");

// Send match state (all bytes, opCode identifies message type)
var data = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(stateObj));
await socket.SendMatchStateAsync(match.Id, opCode: 1L, data);

// Receive match state from other players
socket.ReceivedMatchState += state =>
{
    var json = System.Text.Encoding.UTF8.GetString(state.State);
    switch (state.OpCode)
    {
        case 1: HandlePosition(json); break;
        case 2: HandleAction(json);   break;
    }
};

// Track players joining and leaving
socket.ReceivedMatchPresence += e =>
{
    foreach (var join  in e.Joins)  SpawnPlayer(join.SessionId);
    foreach (var leave in e.Leaves) DespawnPlayer(leave.SessionId);
};

// Leave match
await socket.LeaveMatchAsync(matchId);
```

### Match OpCode Convention

Define named constants for `opCode` to distinguish message types:

```csharp
private const long OpCodePosition = 1;
private const long OpCodeState    = 2;
private const long OpCodeAction   = 3;
```

---

## Leaderboards

```csharp
// Submit or update a score for the current user
await client.WriteLeaderboardRecordAsync(session,
    leaderboardId: "weekly_score",
    score:    9500,
    subscore: 3,
    metadata: JsonSerializer.Serialize(new { map = "level1" }));

// List top records (first page)
var records = await client.ListLeaderboardRecordsAsync(session,
    leaderboardId: "weekly_score", limit: 100);
foreach (var r in records.Records)
    GD.Print($"{r.Username}: {r.Score}");

// List records centered around the current user's rank
var around = await client.ListLeaderboardRecordsAroundOwnerAsync(session,
    leaderboardId: "weekly_score",
    ownerId: session.UserId,
    limit: 5);

// Paginate
if (records.NextCursor != null)
    records = await client.ListLeaderboardRecordsAsync(session,
        leaderboardId: "weekly_score",
        limit: 100,
        cursor: records.NextCursor);

// List records for specific users (social leaderboard)
var social = await client.ListLeaderboardRecordsAsync(session,
    leaderboardId: "weekly_score",
    ownerIds: friendIds,
    limit: 100);

// Delete own record
await client.DeleteLeaderboardRecordAsync(session, "weekly_score");
```

---

## Notifications

```csharp
// List notifications (first batch, no cursor)
var result = await client.ListNotificationsAsync(session, limit: 100, cacheableCursor: null);
foreach (var n in result.Notifications)
    GD.Print($"[{n.Code}] {n.Subject}: {n.Content}");

// Persist cursor — next call returns only NEW notifications since last fetch
config.SetValue("notifications", "cursor", result.CacheableCursor);
config.Save("user://nakama.cfg");

// Subsequent poll (only returns new ones)
var cursor = config.GetValue("notifications", "cursor", null) as string;
var next = await client.ListNotificationsAsync(session, limit: 100, cacheableCursor: cursor);

// Delete specific notifications
await client.DeleteNotificationsAsync(session, new[] { notificationId1, notificationId2 });

// Receive real-time notifications via socket
socket.ReceivedNotification += n =>
{
    switch (n.Code)
    {
        case 100: // custom reward notification
            GD.Print("Reward received: " + n.Content);
            break;
        default:
            GD.Print($"Notification [{n.Code}]: {n.Subject}");
            break;
    }
};
```

### Notification Code Ranges

| Code range | Owner |
|------------|-------|
| `< 0` | Reserved by Nakama (e.g., `-1` = friend request received) |
| `≥ 0` | User-defined custom codes |

Define constants for custom notification codes to avoid magic numbers:

```csharp
private const int NotifReward         = 100;
private const int NotifMatchInvite    = 101;
private const int NotifSeasonComplete = 102;
```
