---
version: 1.0.0
---

# ENet

> **Scope**: ENet transport layer usage in Godot 4 — ENetMultiplayerPeer lifecycle for server/client/mesh topologies, low-level ENetConnection event service loop, per-peer packet control via ENetPacketPeer, channel isolation strategies, bandwidth and timeout tuning, DTLS encryption setup, and mesh network configuration.
> **Load when**: implementing multiplayer networking with ENet, setting up a dedicated server or client with ENetMultiplayerPeer, using the low-level ENetConnection API, configuring transfer channels or bandwidth limits, enabling DTLS encryption, building mesh peer-to-peer networks, debugging ENet connection or disconnect issues.

---

## Core Concepts

- **ENetMultiplayerPeer** — high-level `MultiplayerPeer` implementation; integrates with Godot's RPC and Synchronizer system. Assign to `Multiplayer.MultiplayerPeer` after initialization.
- **ENetConnection** — low-level wrapper around an ENet host. Exposes the service loop and host-level statistics. Access via `((ENetMultiplayerPeer)peer).Host`.
- **ENetPacketPeer** — low-level wrapper around a single ENet peer. Exposes per-peer statistics, timeouts, and direct packet sending. Retrieve via `GetPeer(id)`.
- **Channel** — a logical lane within a connection. Packet delivery order and loss are isolated per channel; a blocked channel never stalls another. Default: 2 channels (0 = reliable, 1 = unreliable in high-level mode).
- **TransferMode** — three delivery guarantees: `Unreliable`, `UnreliableOrdered`, `Reliable`. Set via `Multiplayer.TransferMode` before sending.

## API / Interface

### ENetMultiplayerPeer — C# method signatures

```csharp
// Create server (call before assigning to Multiplayer.MultiplayerPeer)
Error CreateServer(int port, int maxClients = 32, int maxChannels = 0,
                   int inBandwidth = 0, int outBandwidth = 0)

// Create client
Error CreateClient(string address, int port, int channelCount = 0,
                   int inBandwidth = 0, int outBandwidth = 0, int localPort = 0)

// Mesh topology
Error CreateMesh(int uniqueId)
Error AddMeshPeer(int peerId, ENetConnection host) // host must have exactly 1 Connected peer

// Per-peer and host access
ENetPacketPeer GetPeer(int id)
ENetConnection Host { get; }

// Bind to a specific network interface (call BEFORE Create*)
void SetBindIP(string ip) // "*" = all interfaces (default)
```

### TransferMode — choosing the right delivery guarantee

| Mode | ACK | Resend | Order | Use for |
|------|-----|--------|-------|---------|
| `TransferModeEnum.Unreliable` | No | No | Any | Non-critical fire-and-forget data |
| `TransferModeEnum.UnreliableOrdered` | No | No | In-order | Movement, input snapshots |
| `TransferModeEnum.Reliable` | Yes | Yes | In-order | Game events, ability triggers, chat |

Set immediately before the RPC call:
```csharp
Multiplayer.TransferMode = MultiplayerPeer.TransferModeEnum.UnreliableOrdered;
Multiplayer.TransferChannel = 1;
Rpc(MethodName.SyncPosition, position);
```

### ENetPacketPeer — key methods

```csharp
// Statistics — PeerStatistic enum values include RoundTripTime, PacketLoss, etc.
double rtt  = peer.GetStatistic(ENetPacketPeer.PeerStatistic.RoundTripTime);
double loss = peer.GetStatistic(ENetPacketPeer.PeerStatistic.PacketLoss);

// Timeout tuning (all values in milliseconds)
// limit: RTT multiplier for timeout, minTimeout: floor, maxTimeout: hard ceiling
peer.SetTimeout(32, 200, 10000);

// Disconnect variants
peer.Disconnect();         // graceful — sends disconnect packet, waits for ACK
peer.DisconnectNow(0);     // immediate — no ACK, use when the process is about to exit

// Peer state check
ENetPacketPeer.PeerState state = peer.GetState(); // e.g. Connected, Disconnected
```

### ENetConnection — service loop (low-level mode only)

When using `ENetConnection` directly, you are responsible for driving the event queue every frame:

```csharp
// Call in _Process(double delta) — use timeout = 0 for non-blocking
while (true)
{
    ENetConnection.EventType type = host.Service(0,
        out ENetPacketPeer sender,
        out int channel,
        out byte[] payload);

    if (type == ENetConnection.EventType.None)
        break;

    switch (type)
    {
        case ENetConnection.EventType.Connect:
            OnPeerConnected(sender);
            break;
        case ENetConnection.EventType.Receive:
            OnPacketReceived(sender, channel, payload);
            break;
        case ENetConnection.EventType.Disconnect:
            OnPeerDisconnected(sender);
            break;
    }
}
```

## Patterns & Examples

### High-level server and client (recommended for most games)

```csharp
public void StartServer(int port, int maxClients = 32)
{
    var enet = new ENetMultiplayerPeer();
    Error err = enet.CreateServer(port, maxClients);
    if (err != Error.Ok)
    {
        GD.PrintErr($"[Net] CreateServer failed: {err}");
        return;
    }
    Multiplayer.MultiplayerPeer = enet;
    GD.Print($"[Net] Server listening on port {port}");
}

public void JoinServer(string address, int port)
{
    var enet = new ENetMultiplayerPeer();
    Error err = enet.CreateClient(address, port);
    if (err != Error.Ok)
    {
        GD.PrintErr($"[Net] CreateClient failed: {err}");
        return;
    }
    Multiplayer.MultiplayerPeer = enet;
}

// Always destroy the host on disconnect to release the UDP port
public void CloseConnection()
{
    if (Multiplayer.MultiplayerPeer is ENetMultiplayerPeer enet)
    {
        enet.Close();
        enet.Host?.Destroy(); // releases the port immediately
    }
    Multiplayer.MultiplayerPeer = null;
}
```

### Channel isolation pattern

Assign channels at creation time and stick to them throughout the session:

```csharp
// 3 explicit channels:
//   0 — reliable game events (default high-level channel)
//   1 — unreliable-ordered position updates
//   2 — reliable chat messages
var enet = new ENetMultiplayerPeer();
enet.CreateServer(7777, 32, maxChannels: 3);
Multiplayer.MultiplayerPeer = enet;

// Send position on channel 1 with unreliable-ordered mode
Multiplayer.TransferChannel = 1;
Multiplayer.TransferMode = MultiplayerPeer.TransferModeEnum.UnreliableOrdered;
Rpc(MethodName.SyncPosition, transform.Origin);

// Send game event on channel 0 with reliable mode
Multiplayer.TransferChannel = 0;
Multiplayer.TransferMode = MultiplayerPeer.TransferModeEnum.Reliable;
Rpc(MethodName.TriggerAbility, abilityId);
```

### DTLS encryption setup (production)

```csharp
// Server — requires a private key and an X.509 certificate
public void StartSecureServer(int port, CryptoKey key, X509Certificate cert)
{
    var enet = new ENetMultiplayerPeer();
    enet.UseDtls = true;
    enet.SetDtlsKey(key);
    enet.SetDtlsCertificate(cert);
    enet.CreateServer(port, 32);
    Multiplayer.MultiplayerPeer = enet;
}

// Client — only needs the server's certificate; never needs the private key
public void JoinSecureServer(string address, int port, X509Certificate serverCert)
{
    var enet = new ENetMultiplayerPeer();
    enet.UseDtls = true;
    enet.DtlsVerify = true;          // always true in production
    enet.SetDtlsCertificate(serverCert);
    enet.CreateClient(address, port);
    Multiplayer.MultiplayerPeer = enet;
}
```

### Mesh (peer-to-peer) networking

```csharp
// Each peer calls CreateMesh with a unique ID agreed upon via external signaling
var enet = new ENetMultiplayerPeer();
enet.CreateMesh(myUniqueNetworkId);
Multiplayer.MultiplayerPeer = enet;

// To connect to a remote peer after signaling exchange:
// 1. Create a raw connection and connect to the remote endpoint
var rawConn = new ENetConnection();
rawConn.CreateHostBound("*", 0, 1); // 1 peer slot
ENetPacketPeer rawPeer = rawConn.ConnectToHost(remoteAddress, remotePort, 0, 0);
// 2. Wait for rawPeer.GetState() == ENetPacketPeer.PeerState.Connected, then:
enet.AddMeshPeer(remotePeerId, rawConn);
// Note: rawConn must have exactly 1 peer in Connected state at the time of AddMeshPeer
```

### Monitor RTT and adapt tick rate

```csharp
// Call in a timer (e.g. every 1 second)
private void MonitorPeerLatency(int peerId)
{
    if (Multiplayer.MultiplayerPeer is not ENetMultiplayerPeer enet)
        return;

    ENetPacketPeer peer = enet.GetPeer(peerId);
    double rtt = peer.GetStatistic(ENetPacketPeer.PeerStatistic.RoundTripTime);
    double loss = peer.GetStatistic(ENetPacketPeer.PeerStatistic.PacketLoss);

    if (rtt > 200 || loss > 0.05)
        AdaptSimulationTickRate(rtt, loss);
}
```

## Configuration

| Parameter | Default | Valid range | Notes |
|-----------|---------|-------------|-------|
| `maxClients` | 32 | 1–4095 | Hard limit enforced by ENet |
| `maxChannels` | 0 | 0–255 | 0 = max (255); channels 0/1 used by default |
| `inBandwidth` / `outBandwidth` | 0 | ≥ 0 bytes/sec | 0 = unlimited; also controls reliable window size |
| `localPort` | 0 | 0–65535 | 0 = OS-assigned; set for NAT traversal |
| `UseDtls` | false | — | Enables DTLS transport encryption |
| `DtlsVerify` | true | — | Validate server certificate; disable only for local testing |
| `SetTimeout(limit, min, max)` | 32, 5000, 30000 | ms | Increase `max` to avoid spurious disconnects when debugging |

## Best Practices

- Always check the `Error` return value from `CreateServer` / `CreateClient` before assigning to `Multiplayer.MultiplayerPeer`. Log and abort on failure.
- Use separate channels for data with different delivery requirements. Channel isolation prevents head-of-line blocking: a reliable game-event queue doesn't block unreliable position updates.
- Set `Multiplayer.TransferMode` and `Multiplayer.TransferChannel` immediately before every RPC call that deviates from the session default. The values persist until changed.
- Call `peer.SetTimeout(32, 200, 15000)` in debug builds to raise the hard disconnect limit and prevent spurious timeouts caused by debugger breakpoints.
- Enable DTLS (`UseDtls = true`) for any game that transmits login credentials or user-identifiable information, even over a LAN.
- In low-level (`ENetConnection`) mode, drain the entire event queue in a `while` loop every `_Process` frame — a single `Service()` call processes only one event.
- Set `Multiplayer.RefuseNewConnections = true` once the session is full to reject connection attempts cleanly rather than silently dropping them.
- Use `SetBindIP("127.0.0.1")` for servers that should only accept LAN connections, preventing accidental internet exposure.

## Anti-patterns

- **Not calling `Host.Destroy()` after disconnect.** Without it, the UDP port remains occupied. Subsequent `CreateServer()` calls on the same port return `AlreadyInUse` until the process restarts. Always call `enet.Host?.Destroy()` after `enet.Close()`.
- **Using `TransferModeReliable` for position updates.** Reliable delivery ACKs and resends stale movement packets, inflating latency. Use `UnreliableOrdered` — dropped position packets are simply superseded by the next update.
- **Setting `DtlsVerify = false` in production.** Disabling certificate verification removes MITM protection entirely. Acceptable only for local / offline testing.
- **Using channel index 0 in low-level `ENetConnection` mode.** Channel 0 is reserved internally. Start user-defined channels at index 1.
- **Connecting to an IPv6 server with vanilla Godot.** The default bundled ENet does not support IPv6 client connections. Recompile Godot with the bundled ENet module enabled to add IPv6 support.
- **Debugging multi-client scenes in the remote debugger view.** The remote scene inspector may not reflect all spawned nodes correctly when multiple clients connect rapidly. Test with multiple exported builds or separate editor instances.
- **Ignoring `ENetConnection.PopStatistic()` during development.** Host-level statistics expose packet loss and bandwidth spikes early; skipping them makes network problems harder to diagnose.
