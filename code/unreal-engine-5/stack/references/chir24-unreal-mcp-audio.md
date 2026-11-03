# ChiR24 Unreal MCP — Audio

| Outcome | Discover under `manage_audio` |
|---|---|
| Sound asset/actor | `create_audio_asset`, `create_audio_actor`, `get_audio_info` |
| Cue graph | `edit_sound_cue` |
| MetaSound graph | `edit_metasound`, `get_metasound_graph`, `list_metasound_nodes` |
| Playback/control | `play_sound`, `stop_sound`, `fade_sound`, `set_sound_volume`, `set_sound_looping` |
| Spatial/mix | `configure_sound_attenuation`, `configure_sound_class`, `control_sound_mix` |
| Loudness/acoustics | `measure_loudness`, `normalize_loudness`, `analyze_acoustics` |
| Dialogue/subtitles | `set_dialogue_context`, `set_subtitles` |

## Author and play a sound

```json
{"operation":"search","query":"create sound cue","tool":"manage_audio","limit":2}
```

Resolve the source SoundWave and existing routing. Create the Cue, add supported nodes and connect a valid output path. Inspect node inputs, loop/attenuation/concurrency and saved asset references. A graph with disconnected source nodes can exist silently.

For MetaSounds, first list available node classes and read the current graph. Create inputs/outputs with compatible types, connect actual pins, set defaults, and build/validate the graph. Do not assume a similarly named Cue node is a MetaSound class.

Playback must use the appropriate 2D, world-location or attached variant and actual world/component target. Capture returned handles for stop/fade. Inspect completion and clean up only the playback started for this task.

## Check audibility, not just acceptance

```json
{"operation":"search","query":"measure sound loudness","tool":"manage_audio","limit":2}
```

Verify the right asset, active playback/component, listener, volume/mix, attenuation range, occlusion and concurrency. A spatial sound can be playing outside listener range or rejected by concurrency. Inspect `inspect.explain`'s audible variant when available.

The play-testing playbook suggests `au.DumpActiveSounds` through the described console capability, followed by a log read. This can prove the engine reports active playback and volume; it does not prove a human heard it. Use signal/loudness measurements for objective level checks and listening only when an actual audio observation is available.

Before normalizing loudness, measure the source and clarify the target units/range from the contract; inspect the result afterward. Do not overwrite source audio merely to make a playback failure louder. Save modified audio/mix assets separately from transient playback.

Wwise/FMOD integrations are roadmap scope; engine C++ examples are not shipped MCP capabilities. Search the installed catalog before claiming middleware support. Subtitle toggles do not imply the complete planned accessibility system.

Sources: [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [Roadmap phases 11 and 38](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [play-testing playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp). See [runtime-verification](chir24-unreal-mcp-runtime-verification.md) for PIE and logs.
