---
version: 1.0.0
---

# ENet

> **Scope**: ENet transport layer in Godot 4 — ENetMultiplayerPeer server/client lifecycle, low-level ENetConnection event service loop, ENetPacketPeer direct packet control, transfer channel isolation, timeout and bandwidth tuning, DTLS encryption, and mesh networking setup.
> **Load when**: configuring ENet server or client transport, accessing ENetConnection or ENetPacketPeer API directly, tuning per-peer timeouts or bandwidth limits, implementing DTLS encryption over ENet, debugging ENet connectivity or packet loss, setting up peer-to-peer mesh networking, choosing and assigning transfer channels for RPCs.

---

## Core Concepts

- **ENet** — a reliable UDP library. Godot 4 exposes it at two levels:
  - **High-level** (`ENetMultiplayerPeer`) — integrates with `MultiplayerAPI`, RPC, `MultiplayerSpawner`, and `MultiplayerSynchronizer`. See `multiplayer.md` for the high-level API patterns.
  - **Low-level** (`ENetConnection` + `ENetPacketPeer`) — direct host/peer control, used when bypassing the RPC system or accessing ENet-specific diagnostics and configuration.
- **Transport is UDP** — when port-forwarding for public servers, forward the server port as **UDP only**, not TCP.
- **Server ID** — the server peer always has ID `1` in the high-level API. Clients receive random positive integers.
- **Channels** — independent packet streams within a single connection. Different channels do not block each other, preventing high-frequency updates from starving reliable event packets.

## ENetMultiplayerPeer (High-Level Setup)

```gdscript
# Server
var peer := ENetMultiplayerPeer.new()
var err := peer.create_server(PORT, MAX_CLIENTS)
if err != OK:
    push_error("Server creation failed: %s" % error_string(err))
    return
multiplayer.multiplayer_peer = peer

# Client
var peer := ENetMultiplayerPeer.new()
var err := peer.create_client(SERVER_IP, PORT)
if err != OK:
    push_error("Client creation failed: %s" % error_string(err))
    return
multiplayer.multiplayer_peer = peer
```

Both `create_server` and `create_client` return an `Error` enum — always check for `OK (0)`. A non-OK result leaves the peer uninitialized; the multiplayer system will silently malfunction.

**Tearing down cleanly:**
```gdscript
# Replace with OfflineMultiplayerPeer to close connections and reset state.
multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
players.clear()
```

**Accessing the underlying ENet host:**
```gdscript
# Available after create_server / create_client.
var host: ENetConnection = peer.get_host()

# Access a specific connected peer by its multiplayer ID.
var enet_peer: ENetPacketPeer = peer.get_peer(peer_id)
```

## ENetConnection (Low-Level API)

`ENetConnection` wraps an ENet host. It is accessible via `ENetMultiplayerPeer.get_host()` for diagnostics and tuning, or created standalone when the high-level RPC system is not needed.

**Event service loop** — call every frame when using the low-level API (ENet has no internal thread):

```gdscript
func _process(_delta: float) -> void:
    var event := host.service(0)  # 0 = non-blocking
    match event[0]:               # event[0] is EventType
        ENetConnection.EVENT_CONNECT:
            var remote: ENetPacketPeer = event[1]
            _on_connected(remote)
        ENetConnection.EVENT_RECEIVE:
            var remote: ENetPacketPeer = event[1]
            var channel: int = event[2]
            var packet: PackedByteArray = remote.get_packet()
            _on_packet(remote, channel, packet)
        ENetConnection.EVENT_DISCONNECT:
            var remote: ENetPacketPeer = event[1]
            var disconnect_data: int = event[2]
            _on_disconnected(remote, disconnect_data)
        ENetConnection.EVENT_ERROR:
            push_error("ENet host error — tear down and recreate the host")
        ENetConnection.EVENT_NONE:
            pass
```

**EventType constants:**

| Constant | Value | Meaning |
|----------|-------|---------|
| `EVENT_NONE` | `0` | No event this tick |
| `EVENT_CONNECT` | `1` | Peer successfully connected |
| `EVENT_RECEIVE` | `3` | Packet received and queued to the peer |
| `EVENT_DISCONNECT` | `2` | Peer disconnected (graceful, timed out, or request timeout) |
| `EVENT_ERROR` | `-1` | Host-level error — the host state is corrupted; recreate it |

**Bandwidth limits** (host-wide):
```gdscript
# Both values in bytes/sec; 0 = unlimited.
host.bandwidth_limit(incoming_bandwidth, outgoing_bandwidth)
```

**Host-level statistics:**
```gdscript
var total_sent := host.pop_statistic(ENetConnection.HOST_TOTAL_SENT_DATA)
var total_recv := host.pop_statistic(ENetConnection.HOST_TOTAL_RECEIVED_DATA)
# pop_statistic resets the counter after reading.
```

## ENetPacketPeer (Per-Peer Control)

`ENetPacketPeer` represents a single remote peer. It cannot be instantiated directly — obtain it from `service()` event data or `host.get_peers()`.

**Check state before sending:**
```gdscript
if peer.get_state() == ENetPacketPeer.STATE_CONNECTED:
    peer.send(channel, data_bytes, ENetPacketPeer.FLAG_RELIABLE)
```

**PeerState values:**

| Constant | Meaning |
|----------|---------|
| `STATE_DISCONNECTED` | Not connected |
| `STATE_CONNECTING` | Handshake in progress |
| `STATE_CONNECTED` | Fully connected — safe to send/receive |
| `STATE_DISCONNECT_LATER` | Will disconnect after flushing pending sends |
| `STATE_DISCONNECTING` | Disconnect in progress |
| `STATE_ZOMBIE` | Connection timed out; host has not yet removed the peer |

**Send flags:**

| Flag | Behavior |
|------|----------|
| `FLAG_RELIABLE` | Guaranteed delivery, ordered within the channel |
| `FLAG_UNSEQUENCED` | Unordered, no sequencing overhead — fastest |
| `FLAG_UNRELIABLE_FRAGMENT` | Enables fragmentation of large unreliable packets |

**Graceful disconnect:**
```gdscript
# Graceful — flushes pending reliable sends before closing.
peer.peer_disconnect(optional_user_data_int)
# Confirm with EVENT_DISCONNECT from service().

# Immediate — no drain, remote is notified.
peer.peer_disconnect_now(optional_user_data_int)

# Hard reset — no notification to remote peer.
peer.reset()
```

**Timeout tuning** (all values in milliseconds):
```gdscript
# timeout      — RTT multiplier for per-packet timeout
# timeout_min  — minimum before the peer is dropped
# timeout_max  — absolute cap: peer dropped if any packet unacknowledged this long
peer.set_timeout(3000, 5000, 10000)  # aggressive for competitive games
```

**Per-peer statistics:**
```gdscript
var rtt   := peer.get_statistic(ENetPacketPeer.PEER_ROUND_TRIP_TIME)         # ms
var loss  := peer.get_statistic(ENetPacketPeer.PEER_PACKET_LOSS)              # out of 65536
var sent  := peer.get_statistic(ENetPacketPeer.PEER_TOTAL_DATA_SENT)          # bytes
var recvd := peer.get_statistic(ENetPacketPeer.PEER_TOTAL_DATA_RECEIVED)      # bytes
```

## Transfer Channels

ENet channels are independent queues — traffic on channel 1 cannot block traffic on channel 0, and vice versa. Assign channels in `@rpc` annotations to prevent head-of-line blocking.

**@rpc channel assignment:**
```gdscript
@rpc("authority", "reliable", 0)               # channel 0 — game events
func apply_damage(amount: int) -> void:
    pass

@rpc("any_peer", "unreliable_ordered", 1)      # channel 1 — high-frequency position
func sync_position(pos: Vector3) -> void:
    pass

@rpc("any_peer", "reliable", 2)                # channel 2 — chat
func send_chat(message: String) -> void:
    pass
```

**Recommended channel layout:**

| Channel | Transfer mode | Use for |
|---------|--------------|---------|
| `0` | `reliable` | Game events: kills, pickups, score, state changes |
| `1` | `unreliable_ordered` | High-frequency state: position, rotation, animation index |
| `2+` | any | Independent subsystems: chat, minimap pings, debug |

Never send heterogeneous packet types on the same `unreliable_ordered` channel — a large packet arriving after a small one causes ENet to discard the small one as stale. Use separate channels for separate data streams.

## DTLS Encryption

ENet supports DTLS for encrypted UDP via the underlying `ENetConnection`. Configure it immediately after creating the peer, before any connections are made.

```gdscript
# Server
var enet_peer := ENetMultiplayerPeer.new()
enet_peer.create_server(PORT, MAX_CLIENTS)
multiplayer.multiplayer_peer = enet_peer
enet_peer.get_host().dtls_server_setup(TlsOptions.server(private_key, x509_cert))

# Client
var enet_peer := ENetMultiplayerPeer.new()
enet_peer.create_client(SERVER_IP, PORT)
multiplayer.multiplayer_peer = enet_peer
enet_peer.get_host().dtls_client_setup(SERVER_HOSTNAME, TlsOptions.client(cert))
```

Note: ~50% of initial DTLS handshake attempts fail due to cookie exchange — this is normal ENet behavior, not a bug. The peer retries automatically.

## Mesh Networking

ENet supports peer-to-peer meshes where all participants connect directly to each other without a central game server.

```gdscript
var peer := ENetMultiplayerPeer.new()
peer.create_mesh(unique_peer_id)
multiplayer.multiplayer_peer = peer

# Add each remote peer using an existing ENetConnection to them.
peer.add_mesh_peer(remote_peer_id, enet_connection_to_remote)
```

Mesh networking requires a signaling server to exchange connection addresses. Use UPNP or a STUN/TURN service for NAT traversal — direct port forwarding alone does not work across all peer topologies.

## Best Practices

- **Always check `create_server` / `create_client` return values** — a non-`OK` result leaves the peer in an uninitialized state that produces silent failures later.
- **Call `host.service(0)` every `_process` frame** when using the low-level API — ENet has no background thread; packets accumulate until `service()` drains them.
- **Guard `peer.send()` with `get_state() == STATE_CONNECTED`** — sending to a zombie or disconnecting peer silently drops the packet.
- **Prefer `peer_disconnect()` over `peer_disconnect_now()`** — the graceful version flushes pending reliable packets first, preventing message loss on the remote side.
- **Reduce `timeout_max` for competitive games** — default ENet timeouts can keep a ghost peer "connected" for 30+ seconds. Set `timeout_max` to 5000–10000 ms to fail fast.
- **Forward UDP only** — ENet is UDP-based. Instructing players to forward TCP is a common support error and does nothing.
- **Expose RTT and packet loss in debug overlays** — `PEER_ROUND_TRIP_TIME` and `PEER_PACKET_LOSS` from `get_statistic()` are essential for diagnosing network issues during playtesting.
- **Assign transfer channels explicitly for each traffic type** — do not rely on the default channel 0 for all RPCs in games with more than one stream of data.

## Anti-patterns

- **Ignoring `EVENT_ERROR`** — a host-level error means internal ENet state is corrupted. Continuing to call `service()` after this produces undefined behavior. Tear down and recreate the host.
- **Mixing traffic types on `unreliable_ordered` channel 0** — large and small packets compete on the same ordered queue; large packets arriving after small ones cause ENet to discard the smaller ones as stale. Use separate channels.
- **Calling `peer_disconnect_now()` on an already-disconnecting peer** — check `get_state()` first. Calling disconnect methods on a `STATE_ZOMBIE` or `STATE_DISCONNECTED` peer is a no-op at best and may crash in edge cases.
- **Instantiating `ENetPacketPeer` directly** — `ENetPacketPeer` has no public constructor. Always obtain instances from `service()` event data or `host.get_peers()`.
- **Forwarding TCP instead of UDP** — ENet uses UDP exclusively. TCP forwarding does nothing and causes connection failures that are difficult to diagnose.
- **Skipping `service()` during scene transitions** — if the scene is paused or changed without a dedicated network node continuing to call `service()`, incoming packets queue indefinitely and connection timeouts fire.
- **Accessing `get_host()` before `create_server` / `create_client`** — `ENetMultiplayerPeer.get_host()` returns `null` until the peer is initialized. Calling it too early crashes with a null reference.
