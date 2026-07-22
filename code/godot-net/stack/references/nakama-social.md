# Nakama — Social Features

> See also: [nakama-gameplay.md](nakama-gameplay.md)

---

## Friends

```csharp
// Add by username or user ID
await client.AddFriendsAsync(session,
    ids: null,
    usernames: new[] { "alice", "bob" });
await client.AddFriendsAsync(session,
    ids: new[] { "<userId>" },
    usernames: null);

// List friends by state
// state: 0=mutual, 1=outgoing request, 2=incoming request, 3=blocked
var result = await client.ListFriendsAsync(session, state: 0, limit: 100);
foreach (var f in result.Friends)
    GD.Print(f.User.Username);

// Paginate
if (result.Cursor != null)
    result = await client.ListFriendsAsync(session, state: 0, limit: 100, cursor: result.Cursor);

// Accept an incoming friend request — re-add with their ID
await client.AddFriendsAsync(session, ids: new[] { incomingFriend.User.Id });

// Remove
await client.DeleteFriendsAsync(session,
    ids: null,
    usernames: new[] { "alice" });

// Block (moves to state 3; prevents interaction)
await client.BlockFriendsAsync(session, ids: new[] { "<userId>" });
```

### Friend State Values

| State | Meaning |
|-------|---------|
| 0 | Mutual friends |
| 1 | Outgoing request (you sent) |
| 2 | Incoming request (they sent) |
| 3 | Blocked |

---

## Groups & Clans

```csharp
// Create (open=true → anyone can join; open=false → join request required)
var group = await client.CreateGroupAsync(session,
    name: "AlphaSquad",
    description: "Top players",
    open: true,
    maxCount: 100);

// Join (immediate for open groups; creates join request for closed groups)
await client.JoinGroupAsync(session, group.Id);

// List with wildcard filter
var groups = await client.ListGroupsAsync(session, name: "Alpha%", limit: 20);

// List members — state: null=all, 0=superadmin, 1=admin, 2=member, 3=join request
var members = await client.ListGroupUsersAsync(session, groupId, state: null, limit: 100);

// Accept a join request (admin promotes the user from state 3 → 2)
await client.AddGroupUsersAsync(session, groupId, new[] { pendingUserId });

// Admin-only management
await client.PromoteGroupUsersAsync(session, groupId, new[] { userId }); // member → admin
await client.DemoteGroupUsersAsync(session, groupId, new[] { userId });  // admin → member
await client.KickGroupUsersAsync(session, groupId, new[] { userId });
await client.BanGroupUsersAsync(session, groupId, new[] { userId });

// Update group info (admins only)
await client.UpdateGroupAsync(session, groupId,
    name: "BetaSquad",
    description: "Updated",
    open: false);

// Leave group
await client.LeaveGroupAsync(session, groupId);

// Delete group (superadmin only)
await client.DeleteGroupAsync(session, groupId);
```

### Group Membership States

| State | Role |
|-------|------|
| 0 | Superadmin |
| 1 | Admin |
| 2 | Member |
| 3 | Join request pending |

**Group metadata** can only be updated server-side via RPC — client writes are rejected.

---

## Chat

```csharp
// Join a dynamic room (non-persistent — messages lost when all users leave)
var channel = await socket.JoinChatAsync(
    roomName, ChannelType.Room, persistence: false, hidden: false);

// Join group chat (persistent — messages survive disconnection)
var channel = await socket.JoinChatAsync(
    groupId, ChannelType.Group, persistence: true, hidden: false);

// Join direct messages between two users
var channel = await socket.JoinChatAsync(
    otherUserId, ChannelType.DirectMessage, persistence: true, hidden: false);

// Send message (content must be a JSON string)
var content = JsonSerializer.Serialize(new { text = "Hello!" });
var ack = await socket.WriteChatMessageAsync(channel.Id, content);

// Update a sent message
await socket.UpdateChatMessageAsync(channel.Id, ack.MessageId,
    JsonSerializer.Serialize(new { text = "Edited!" }));

// Remove a message
await socket.RemoveChatMessageAsync(channel.Id, ack.MessageId);

// List message history (HTTP — works without socket)
var messages = await client.ListChannelMessagesAsync(
    session, channel.Id, limit: 100, forward: true);
// Paginate with cursor
if (messages.NextCursor != null)
    messages = await client.ListChannelMessagesAsync(
        session, channel.Id, limit: 100, forward: true, cursor: messages.NextCursor);

// Subscribe to incoming real-time messages (socket)
socket.ReceivedChannelMessage += msg =>
{
    var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(msg.Content);
    GD.Print($"{msg.Username}: {parsed["text"]}");
};

// Leave channel
await socket.LeaveChatAsync(channel.Id);
```

### Channel Types

| Type | Persistent | Description |
|------|-----------|-------------|
| `ChannelType.Room` | No | Dynamic room — messages lost when all users leave |
| `ChannelType.Group` | Yes | Group-scoped persistent chat |
| `ChannelType.DirectMessage` | Yes | 1-on-1 persistent messages |

---

## Status & Presence

```csharp
// Follow users — subscribes to their status changes
await socket.FollowUsersAsync(new[] { userId1, userId2 });

// Unfollow
await socket.UnfollowUsersAsync(new[] { userId1 });

// Set own visible status (string — JSON or plain text)
await socket.UpdateStatusAsync("In main menu");

// Clear status (appear offline to followers)
await socket.UpdateStatusAsync(null);

// Receive status events
socket.ReceivedStatusPresence += e =>
{
    foreach (var join in e.Joins)
        GD.Print($"{join.Username} is now online: {join.Status}");
    foreach (var leave in e.Leaves)
        GD.Print($"{leave.Username} went offline");
};
```

Connect the socket with `appearOnline: false` to suppress your own presence broadcast.
