# Fennara Godot MCP — Scripts and Diagnostics

> See also: [Scenes](fennara-godot-mcp-scenes-resources.md), [Runtime](fennara-godot-mcp-runtime-playtesting.md), [Operations](fennara-godot-mcp-operations-troubleshooting.md).

## Select the feedback loop

| Change | MCP workflow | CLI/repository alternative and limit |
| --- | --- | --- |
| GDScript | `write_or_update_file` → read automatic diagnostics | Native text edit → targeted `script_diagnostics` |
| Godot shader | Write → read parser diagnostics and shader-owner reserialization warnings | Native text edit → diagnostics; ensure affected owners are refreshed |
| Related C# files | Complete all writes → one project diagnostic scan | Ordinary edits/build tools are possible; a generic build is not Fennara's isolated diagnostic pipeline |
| Scene attachment or resource configuration | Scene/property inspection and validation | Do not diagnose arbitrary resource state solely with script diagnostics |
| Gameplay | Managed runtime probes and logs | Existing project tests/native runner; parsing is not gameplay proof |

Fennara has no documented `fennara check`, `fennara test`, or `fennara exec` command. Installation `fennara diagnostics` reports lifecycle operations, not source-code errors.

## Text edits

`write_or_update_file` supports `write` (complete content) and `update` (exact replacement). Read the current file first. For an update, choose a unique exact block including whitespace; prefer a small patch to a complete rewrite.

Example, after observing this exact declaration:

```json
{
  "mode": "update",
  "file_path": "res://scripts/workshop_gate.gd",
  "old_content": "@export var opening_seconds: float = 0.8",
  "new_content": "@export var opening_seconds: float = 0.65"
}
```

Ambiguous or absent old text fails; add context instead of guessing. `replace_all` is an explicit broader operation, not the default recovery from ambiguity.

Protected paths include `project.godot`, `.godot/`, `.git/`, `addons/fennara/`, and `plugin.cfg`. Use project-settings or lifecycle mechanisms instead of bypassing those boundaries. Do not use text editing for serialized scene/resource surgery.

New `.gd` files may be attached through `attach_to_scene` plus `attach_to_node` in write mode; inspect the scene/path first and verify the saved attachment. This convenience does not apply to C# writes.

## GDScript and shaders

Writes through the tool normally run diagnostics automatically. Fix reported errors as part of that edit. If ordinary file tools performed the edit, request:

```json
{"file_paths":["res://scripts/workshop_gate.gd","res://shaders/workshop_glow.gdshader"]}
```

Targeted diagnostics accept at most five `.gd`/`.gdshader` files. GDScript uses Godot's language server; shaders use the shader parser. Unavailable/failed diagnostics are not clean results.

Targeted GDScript diagnostics also load relevant scenes in memory and can report script attachment errors with a scene path. A project scan skips that per-scene instantiation; do not replace a relevant targeted check with a broad scan and assume identical coverage.

Shader writes attempt to reserialize referencing `.tscn`/`.tres` owners. Read `reserialized_resources`, `reserialize_warnings`, and `reserialize_skipped`; skipped owners may still require targeted follow-up.

## C# edit set

Do not request targeted `.cs` diagnostics or build after every single C# write. After the related edit set, call `script_diagnostics` once:

```json
{"scan_project":true}
```

C# writes indicate deferred validation. The project scan waits for plugin-owned preparation and performs an incremental build into isolated diagnostic output. It does not replace the editor's normal Debug runtime assemblies or prove that an already running game uses new code.

`runtime_session.start` performs a separate authoritative runtime build into Godot's normal `.godot/mono/temp/bin/Debug` output. That can trigger the open editor's ordinary assembly reload. Do not confuse compile-only success with runtime freshness.

For missing C# support, verify `dotnet --version` and one unambiguous project/solution graph before rewriting source. Preserve the reported build/selection error when the graph cannot be selected.

## Scene validation and test evidence

After scene-affecting work not already covered by successful automatic validation, call `validate_scene`:

```json
{"scene_paths":["res://scenes/workshop.tscn"]}
```

Snapshot limit: ten scene paths. Structural checks cover missing references/scripts, invalid paths, duplicate sibling names, cyclic dependencies, and relevant exported references. Intentionally optional or runtime-assigned exports may be notes rather than defects.

A structurally clean authored scene gets a bounded three-second headless startup pass. Imported source scenes receive structural checks only. Inspect errors/crashes/warnings and logs; the intentional process stop and its exit code alone do not establish failure.

This check is not a unit-test suite, full playthrough, performance test, or visual review. Reuse the project's existing test runner when the task requires tests; inspect its actual command and terminal results. No generic test command can be inferred from Fennara's tool set.

## Worker repair

If a scene/import/screenshot/runtime worker fails, retain its returned `script_path`. Patch the exact script with `write_or_update_file`, read diagnostics, and rerun with that path. Use explicit types for meaningful locals; Variant-based inference can become a blocking diagnostic.

For an apparent missing file that exists, inspect scan/import/cache readiness before repeated content rewrites. Recover tool artifacts after a timeout; do not launch duplicate unknown work.

## Sources

See [source inventory](fennara-godot-mcp-sources.md): `tools.md`, C# sections of `architecture.md`, generated guidelines, and write/diagnostic/validation/runtime schemas.
