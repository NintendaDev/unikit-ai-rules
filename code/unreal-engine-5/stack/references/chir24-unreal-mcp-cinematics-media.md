# ChiR24 Unreal MCP — Cinematics, rendering and media

| Task | Capability families through `manage_sequence` |
|---|---|
| Sequence/bindings/tracks | `sequence.create`, `edit_sequence_bindings`, `edit_sequence_tracks`, `get_properties` |
| Rate/range/metadata | `sequence.set_properties`, `set_metadata` |
| Camera and specialized tracks | `sequence.cinematic.create_cinematic_asset`, `configure_cinematic`, `add_cinematic_track` |
| Shot planning | `sequence.planner.frame_shot`, `fly_through`, `auto_edit` |
| Render jobs | `sequence.mrq.create_render_job`, `configure_render_job` |
| Media | `sequence.media.create_media_asset`, `play_media` |
| Recording/replay | `sequence.take.configure_take_recorder`, `sequence.replay.play_demo`, `configure_demo_settings` |

## Shoot a short sequence first

```json
{"operation":"search","query":"create level sequence","tool":"manage_sequence","limit":2}
```

Resolve the map, sequence, actors and camera. Bind the intended actors, choose spawnable versus possessable intentionally, then add sections/tracks/keys using actual returned binding ids. Inspect display rate versus tick resolution and frame/time units; do not mix seconds and frame numbers.

Add a camera-cut track and verify its active camera over the whole playback range. Camera transforms alone do not make that camera render. Inspect the sequence readback before evaluating its visual result.

For planners, use supported `dryRun` to preview framing/path/cuts. A fly-through needs clearance, and `auto_edit` can rewrite camera cuts. Keep existing intentional edits unless replacement is requested.

## Render as a job with files

```json
{"operation":"search","query":"configure render job","tool":"manage_sequence","limit":2}
```

Create the MRQ job → assign real map/sequence → configure output path/format, range, rate, resolution, passes and AA → queue/start the supported variant → follow task/job status to final settlement → inspect actual output files and a rendered frame.

Start with a short range/one frame to prove bindings, camera and output. Respect configured caps for pixels, samples, queue, frames and executor/console allowlists. Rendering writes files and is not reversible through editor undo.

A request to cancel a render is not proof the executor stopped. Inspect settlement and any “still active” state before teardown or another render. A task receipt, accepted job or empty output folder cannot be reported as a finished render.

## Media, takes and replays

Use an existing accessible project-owned media source, configure player/texture/audio component, then play/seek and inspect frame/time/playback state. Roadmap records that network media was disabled because redirects could not be pinned; do not assume a `stream` source type authorizes arbitrary remote URLs.

Take Recorder: configure actual sources/tracks → start/stop → inspect recorded sequence/subscene packages → save and play back. Replay: configure recording/playback in the intended PIE/session world → inspect resulting replay → verify playback/seek. Editor video recording, Take Recorder and replay are distinct workflows.

Cleanup must account separately for created packages, rendered files, media fixtures and replay data. Use only owned outputs and keep requested deliverables.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [cinematics playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [Roadmap phase 30](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [Configuration render limits](https://github.com/ChiR24/Unreal_mcp/wiki/Configuration). The recorded phase-30 live run is for UE 5.7.4, not every engine/platform/current binary.
