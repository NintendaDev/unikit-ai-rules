---
version: 1.0.0
---

# LiteNetLib

> **Scope**: LiteNetLib reliable UDP networking library usage in Godot 4 .NET — NetManager initialization, connection lifecycle, delivery method selection, NetPacketProcessor for typed packets, raw binary serialization with NetDataWriter/NetDataReader, NetManager configuration, and Godot-specific integration patterns.
> **Load when**: implementing multiplayer networking, setting up client/server communication, sending game state over the network, choosing a delivery method, using NetPacketProcessor for packet serialization, writing INetSerializable types, configuring network simulation for testing, debugging connection or receive issues, integrating LiteNetLib into Godot node lifecycle.

---

## Core Concepts

LiteNetLib is a lightweight, reliable UDP networking library for .NET. Key properties relevant to Godot 4 .NET:

- UDP-based with optional reliability, ordering, and sequencing layers
- Automatic packet fragmentation and MTU detection
- Minimal per-packet overhead: 1 byte (unreliable), 4 bytes (reliable)
- All user events are dispatched **synchronously** during `PollEvents()` — no background callbacks unless `UnsyncedEvents = true`
- Ships as a NuGet package: `LiteNetLib`

**Key classes:**

| Class | Purpose |
|---|---|
| `NetManager` | Main entry point — acts as both server and client |
| `NetPeer` | Represents a connected remote endpoint |
| `EventBasedNetListener` | Convenience implementation of `INetEventListener` using C# events |
| `INetEventListener` | Interface for all network callbacks (implement on a node or manager) |
| `NetPacketProcessor` | Automatic serialization/deserialization for typed packet classes |
| `NetDataWriter` | Manual binary packet builder |
| `NetDataReader` | Manual binary packet reader |
| `DeliveryMethod` | Enum of send reliability/ordering strategies |

---

## Setup

### Server

```csharp
var listener = new EventBasedNetListener();
var server = new NetManager(listener) { AutoRecycle = true };
server.Start(9050);

listener.ConnectionRequestEvent += request =>
{
    if (server.ConnectedPeersCount < 16)
        request.AcceptIfKey("MyGameV1");
    else
        request.Reject();
};

listener.PeerConnectedEvent += peer =>
{
    GD.Print($"Client connected: {peer.Address}:{peer.Port}");
};

listener.PeerDisconnectedEvent += (peer, info) =>
{
    GD.Print($"Client disconnected: {info.Reason}");
};

listener.NetworkReceiveEvent += (peer, reader, channel, method) =>
{
    // process incoming data
    // reader is auto-recycled if AutoRecycle = true
};
```

### Client (Godot AutoLoad)

```csharp
// Register as AutoLoad "NetworkManager" in Godot project settings
public partial class NetworkManager : Node, INetEventListener
{
    public static NetworkManager Instance { get; private set; }

    private NetManager _netManager;
    private NetPeer _server;

    public override void _Ready()
    {
        Instance = this;
        _netManager = new NetManager(this) { AutoRecycle = true };
    }

    public override void _Process(double delta)
    {
        _netManager?.PollEvents(); // REQUIRED: dispatch all queued events
    }

    public void Connect(string host, int port)
    {
        _netManager.Start();
        _netManager.Connect(host, port, "MyGameV1");
    }

    public override void _ExitTree()
    {
        _netManager?.Stop();
    }

    // --- INetEventListener ---
    public void OnPeerConnected(NetPeer peer)         { _server = peer; }
    public void OnPeerDisconnected(NetPeer peer, DisconnectInfo info) { _server = null; }
    public void OnNetworkReceive(NetPeer peer, NetPacketReader reader, byte channel, DeliveryMethod method) { }
    public void OnNetworkError(IPEndPoint endPoint, SocketError error) { }
    public void OnNetworkLatencyUpdate(NetPeer peer, int latency) { }
    public void OnConnectionRequest(ConnectionRequest request) { }
    public void OnNetworkReceiveUnconnected(IPEndPoint endPoint, NetPacketReader reader, UnconnectedMessageType type) { }
}
```

---

## Connection Lifecycle

1. Client: `netManager.Connect(host, port, key)` — initiates handshake
2. Server: `ConnectionRequestEvent` fires — call `request.Accept()` or `request.AcceptIfKey(key)` or `request.Reject()`
3. Both sides: `PeerConnectedEvent` fires with the connected `NetPeer`
4. Disconnect: `peer.Disconnect()` (graceful) or `manager.DisconnectPeerForce(peer)` (immediate)
5. Both sides: `PeerDisconnectedEvent` fires with `DisconnectInfo.Reason`

Use `peer.Id` or a `Dictionary<int, NetPeer>` keyed by `peer.Id` to track clients server-side. Never rely on `peer.Tag` being set automatically.

---

## Sending Data

### DeliveryMethod Selection

| Method | Delivery | Order | Use for |
|---|---|---|---|
| `ReliableOrdered` | Guaranteed | Strict FIFO | Join/leave events, ability activations, chat |
| `ReliableUnordered` | Guaranteed | None | Item pickups, damage events (order irrelevant) |
| `ReliableSequenced` | Latest only | In-sequence | Health snapshots (only newest matters) |
| `Sequenced` | Latest only | In-sequence | Position when delta-compressed snapshots overlap |
| `Unreliable` | Best-effort | None | High-frequency position updates, audio levels |

Default to `Unreliable` for position/rotation updates and `ReliableOrdered` for game events.

### NetDataWriter (Manual Binary Serialization)

Reuse a single `NetDataWriter` instance per sender — call `.Reset()` between sends to avoid per-frame allocations.

```csharp
// Declare once (field on the node/manager)
private readonly NetDataWriter _writer = new NetDataWriter();

public void SendPosition(Vector3 pos)
{
    _writer.Reset();
    _writer.Put(pos.X);
    _writer.Put(pos.Y);
    _writer.Put(pos.Z);
    _peer.Send(_writer, DeliveryMethod.Unreliable);
}
```

Supported `Put` / `Get` types: `byte, sbyte, short, ushort, int, uint, long, ulong, float, double, bool, char, string, Guid, IPEndPoint`, arrays of all above, raw bytes via `PutBytesWithLength` / `GetBytesWithLength`.

Read in **the same order** as written. Use `reader.AvailableBytes` and `reader.EndOfData` to guard safe reads with `TryGetInt` / `TryGetFloat` etc.

Always call `dataReader.Recycle()` when done — unless `AutoRecycle = true` on the `NetManager` (recommended for Godot).

### NetPacketProcessor (Typed Packets)

Use for typed, structured packets. Adds 8-byte hash overhead per packet; trade-off is acceptable for most game messages.

**Packet definition rules:**
- Properties must be `public` with `get; set;`
- Supported property types: primitives, `string`, enums, `INetSerializable` structs/classes, `List<T>` of the above
- Share packet classes in a common assembly (or identical namespace) between client and server — the processor hashes `Namespace.ClassName`, mismatches silently fail to deserialize

```csharp
// Shared packet definitions
public class PlayerJoinPacket
{
    public string Username { get; set; }
    public int ClientVersion { get; set; }
}

public class PlayerStatePacket
{
    public int PlayerId { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
}
```

```csharp
// Setup (once, during _Ready or constructor)
private readonly NetPacketProcessor _packetProcessor = new NetPacketProcessor();

// Register Godot types that aren't natively supported
_packetProcessor.RegisterNestedType(
    (w, v) => { w.Put(v.X); w.Put(v.Y); w.Put(v.Z); },
    r => new Vector3(r.GetFloat(), r.GetFloat(), r.GetFloat())
);

// Subscribe — use SubscribeReusable to avoid GC allocations
_packetProcessor.SubscribeReusable<PlayerJoinPacket, NetPeer>(OnPlayerJoin);
_packetProcessor.SubscribeReusable<PlayerStatePacket>(OnPlayerState);

void OnPlayerJoin(PlayerJoinPacket pkt, NetPeer peer) { /* ... */ }
void OnPlayerState(PlayerStatePacket pkt) { /* ... */ }
```

```csharp
// Receive (forward all reads to the processor)
public void OnNetworkReceive(NetPeer peer, NetPacketReader reader, byte channel, DeliveryMethod method)
{
    _packetProcessor.ReadAllPackets(reader, peer);
}

// Send
_packetProcessor.Send(_peer, new PlayerJoinPacket { Username = "Alice", ClientVersion = 1 },
    DeliveryMethod.ReliableOrdered);
```

### INetSerializable (Custom Nested Types)

Implement for struct/class types used as properties in packet classes or written manually.

```csharp
public struct NetworkVector2 : INetSerializable
{
    public float X, Y;

    public void Serialize(NetDataWriter writer) { writer.Put(X); writer.Put(Y); }
    public void Deserialize(NetDataReader reader) { X = reader.GetFloat(); Y = reader.GetFloat(); }
}

// Register before subscribing
_packetProcessor.RegisterNestedType<NetworkVector2>();
```

Prefer structs over classes for `INetSerializable` to avoid heap allocations in hot paths.

---

## Configuration

Set on `NetManager` before or after `Start()` (most settings take effect immediately):

```csharp
var manager = new NetManager(listener)
{
    AutoRecycle        = true,    // Auto-recycle NetPacketReader — always enable in Godot
    UpdateTime         = 15,      // Internal socket update interval (ms); 15 is the default
    PingInterval       = 1000,    // Latency detection interval (ms)
    DisconnectTimeout  = 5000,    // Inactivity timeout (ms) before peer is dropped
    ReconnectDelay     = 500,     // Delay between connection retries (ms)
    MaxConnectAttempts = 10,      // Max retries before giving up
    ChannelsCount      = 1,       // Number of independent channels (1–64); default is 1
    ReuseAddress       = true,    // Helps with quick restarts in development
    IPv6Enabled        = false,   // Enable dual-stack IPv6 (separate socket)
    EnableStatistics   = false,   // Collect per-peer and global traffic stats
};

// Network simulation — wrap in #if DEBUG or check at runtime
manager.SimulateLatency          = true;
manager.SimulationMinLatency     = 50;   // ms round-trip
manager.SimulationMaxLatency     = 150;
manager.SimulatePacketLoss       = true;
manager.SimulationPacketLossChance = 5; // percent

// Start variants
manager.Start(9050);                        // Server: bind port, pick OS IPv4 address
manager.Start("0.0.0.0", "::", 9050);       // Explicit IPv4 + IPv6 bind addresses
manager.Start();                            // Client: OS picks ephemeral port
```

Do not set `UnsyncedEvents = true` in Godot — event callbacks would run on a background thread, which is unsafe when calling any Godot API.

---

## Godot Integration Patterns

### AutoLoad Singleton (Recommended)

Register a `Node` subclass as AutoLoad so `_Process` runs every frame and `PollEvents` is always called. Exposes `[Signal]` delegates to decouple networking from game logic.

```csharp
public partial class NetworkManager : Node
{
    [Signal] public delegate void ConnectedEventHandler();
    [Signal] public delegate void DisconnectedEventHandler(string reason);

    private EventBasedNetListener _listener;
    private NetManager _manager;

    public override void _Ready()
    {
        _listener = new EventBasedNetListener();
        _manager  = new NetManager(_listener) { AutoRecycle = true };

        _listener.PeerConnectedEvent    += _ => EmitSignal(SignalName.Connected);
        _listener.PeerDisconnectedEvent += (_, info) =>
            EmitSignal(SignalName.Disconnected, info.Reason.ToString());
    }

    public override void _Process(double delta) => _manager?.PollEvents();
    public override void _ExitTree()            => _manager?.Stop();
}
```

### Godot-Type Extension Methods

Register Godot vector types with the packet processor or use extension methods for manual writes.

```csharp
public static class LiteNetExtensions
{
    public static void Put(this NetDataWriter w, Vector2 v)  { w.Put(v.X); w.Put(v.Y); }
    public static void Put(this NetDataWriter w, Vector3 v)  { w.Put(v.X); w.Put(v.Y); w.Put(v.Z); }
    public static Vector2 GetVector2(this NetDataReader r)   => new(r.GetFloat(), r.GetFloat());
    public static Vector3 GetVector3(this NetDataReader r)   => new(r.GetFloat(), r.GetFloat(), r.GetFloat());
}
```

### Dedicated Server Scene

To run client and server simultaneously during development, create a separate scene and launch it with:

```
godot --main-pack res://Server.pck
```

Or detect headless mode via `DisplayServer.GetName() == "headless"` and branch at startup.

---

## Best Practices

- **Always call `PollEvents()` in `_Process` or `_PhysicsProcess`.** Events are queued internally and never fire otherwise.
- **Set `AutoRecycle = true`** on every `NetManager` in Godot to avoid manual `reader.Recycle()` calls and eliminate leak risk.
- **Reuse `NetDataWriter`** — keep one as a field, call `.Reset()` before each use instead of `new NetDataWriter()` per frame.
- **Use `SubscribeReusable`** (not `Subscribe`) in `NetPacketProcessor` — it avoids heap allocation on each deserialized packet. Never store the packet reference after the callback returns; it is reused.
- **Share packet definitions** in a common class library project referenced by both client and server to guarantee namespace/classname hash consistency.
- **Use a connection key** in production builds — version it with the game (`"MyGame_v1.2"`). `request.AcceptIfKey(key)` rejects mismatched clients automatically.
- **Prefer multiple channels** over a single channel for mixing priorities — e.g., channel 0 for game state (Unreliable), channel 1 for important events (ReliableOrdered).
- **Enable `SimulateLatency` and `SimulatePacketLoss`** in debug builds to test network resilience locally before deploying.
- **Stop the `NetManager` in `_ExitTree`** to ensure clean socket shutdown when the node is freed.

---

## Anti-patterns

- **Missing `PollEvents()`** — the single most common mistake. If nothing arrives and no events fire, this is almost always the cause.
- **Creating `new NetDataWriter()` every frame** — causes continuous heap allocations and GC pressure. Keep a shared instance and call `.Reset()`.
- **Calling `Send()` or any peer method from a background thread** — LiteNetLib's socket I/O is threaded internally (safe), but user-facing peer API is not thread-safe. All sends must happen on the main thread.
- **Storing packet references from `SubscribeReusable` callbacks** — the packet object is pooled and reused after the callback returns. Copy the data you need immediately.
- **Mismatched namespaces for packet classes** — `NetPacketProcessor` identifies packets by `Namespace.ClassName` hash. Define packets once in a shared project; never duplicate them in separate namespaces on client and server.
- **Setting `UnsyncedEvents = true` in Godot** — fires callbacks from LiteNetLib's internal thread, making all Godot API calls inside those callbacks unsafe (engine is single-threaded).
- **Forgetting `AutoRecycle = true`** with manual listener implementations — every `NetPacketReader` that is not recycled leaks a buffer. Either set `AutoRecycle = true` or call `reader.Recycle()` at the end of every `NetworkReceiveEvent` handler.
- **Very large packets (> ~1200 bytes)** sent as a single call — triggers automatic fragmentation, increasing latency and buffer usage. Split large payloads into multiple smaller messages manually.
