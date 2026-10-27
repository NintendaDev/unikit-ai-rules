# Unity CLI — Baked data: lightmaps, NavMesh, occlusion culling
> See also: [unity-cli-scenes.md](unity-cli-scenes.md), [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md), [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-version-control.md](unity-cli-version-control.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Three groups with the same shape: `lighting`, `navmesh`, `occlusion`. Every `bake` is ASYNC: it returns at once, you poll `<group> bake_status` (`idle`, `baking`, `completed`). Base rules (`--project-path`, JSON output, exit codes): [../unity-cli.md](../unity-cli.md).

| Goal | Command |
|---|---|
| Bake lightmaps of the open scene(s) | `lighting bake` (`confirm` recommended, `dry_run`) then poll `lighting bake_status` |
| Bake the legacy NavMesh | `navmesh bake` (`confirm`, `dry_run`) then poll `navmesh bake_status` |
| Bake NavMeshSurface components (AI Navigation package) | `navmesh bake_surfaces` (described as a v1 stub, see Case 2) |
| Bake occlusion culling | `occlusion bake` (`smallest_occluder`, `smallest_hole`, `backface_threshold` 1-100, `confirm`, `dry_run`) then poll `occlusion bake_status` |
| Stop a running bake | `lighting cancel_bake` / `navmesh cancel_bake` / `occlusion cancel_bake` |
| Delete baked data | `lighting clear_bake` (`confirm`, `include_disk_cache`, `dry_run`) / `navmesh clear_bake` / `occlusion clear_bake` |
| Read or tune bake settings | `lighting get_settings` / `lighting set_settings` (`settings` JSON, `dry_run`); `navmesh get_settings` / `navmesh set_settings` |

There is no `occlusion get_settings`: occlusion parameters are arguments of `occlusion bake`.

## Rules that apply to all three bakes

1. **A bake bakes every open scene.** Close or unload scenes that must not be baked, and save the rest first: `editor save_all` ([unity-cli-scenes.md](unity-cli-scenes.md)). Baked data is stored next to the scene file, so an untitled or unsaved scene has nowhere to put it.
2. **Edit Mode only.** Do not start a bake in Play Mode, and do not recompile or enter Play Mode while one runs; cancel first.
3. **`status: completed` is not a quality verdict.** Confirm the output exists (Verify under each case) and read the console for errors ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md), console section; bridge check `console-1`).
4. **Always preview, then run:** `--dry_run true` validates there is an open bakeable scene and echoes the settings that would be used, without baking.
5. Baked output is large binary data; check the repository's LFS rules before committing it ([unity-cli-version-control.md](unity-cli-version-control.md)).
6. A bake can keep the Editor busy for minutes: queue no other long command behind it ([unity-cli-editor-session.md](unity-cli-editor-session.md) for the command lane and timeouts).

Poll loop (Git Bash; `--result-only` prints just the command's own JSON):

```bash
unity command lighting bake --confirm true
for i in $(seq 1 180); do
  unity command lighting bake_status --result-only | grep -Eq '"status" *: *"completed"' && break
  sleep 10
done
unity command lighting bake_status --result-only   # read the final state yourself
```

PowerShell 5.1:

```powershell
unity command lighting bake --confirm true
for ($i = 0; $i -lt 180; $i++) {
  if ((unity command lighting bake_status --result-only) -match '"status"\s*:\s*"completed"') { break }
  Start-Sleep -Seconds 10
}
```

Swap `lighting` for `navmesh` / `occlusion`. If the budget runs out, run `<group> cancel_bake` instead of looping longer. Before the first bake `bake_status` answers `{"status":"idle"}`; a loop that never sees `baking` or `completed` means the bake did not start (re-run with `--dry_run true` and read the reason).

## Case 1 - lightmaps (`lighting`)

**When:** the scene uses baked or mixed lights and static geometry marked to contribute to GI.

```bash
unity command lighting get_settings --result-only          # copy the exact field names from here
unity command lighting set_settings --dry_run true --settings '{"<field>": <value>}'
unity command lighting set_settings --settings '{"<field>": <value>}'
unity command editor save_all
unity command lighting bake --dry_run true
unity command lighting bake --confirm true
```

- `set_settings` takes a JSON subset with the same names and enums as `get_settings` and returns `{ applied[], unknown[] }`. A misspelled field is reported in `unknown[]`, not as an error: read it, and read `get_settings` back (the same failure class as bridge check `settings-1`). Quote the JSON per [the quoting rules](unity-cli-scripts-compile-eval.md#quoting-c-and-json-on-windows).
- Lightmap resolution, texture size and compression drive build size and memory on mobile: change them here, re-bake, and compare the output size.

**Verify:** after `completed`, the lighting data typically sits beside the scene (a folder named like the scene holding `LightingData.asset` and the lightmap textures). `git status` should show it. Then `scene list_open`: a scene reported dirty must be saved with `editor save_all`, or the reference to the new data is lost on the next reload.

**Pitfalls:** `clear_bake` is destructive and outside Unity's Undo. Objects not marked static (Contribute GI) get no lightmap; the command does not warn.

## Case 2 - NavMesh (`navmesh`)

**When:** agents use `NavMeshAgent` on 3D geometry.

```bash
unity command navmesh get_settings --result-only      # agentRadius/Height/Slope/Climb, minRegionArea, voxelSize
unity command navmesh set_settings --settings '{"agentRadius": 0.4}'
unity command navmesh bake --confirm true             # then poll as above
```

- `navmesh bake` is the LEGACY builder (`UnityEditor.AI.NavMeshBuilder`) and the legacy default-agent settings. A project that uses `NavMeshSurface` components (AI Navigation package) does not bake through it: use `navmesh bake_surfaces`. Its entry is documented only as a v1 stub that returns `package_not_found` when the package is absent, so after calling it check that each surface's NavMeshData asset appeared or changed; if nothing changed, bake from the surface component in the Editor and tell the user.
- `set_settings` returns `{ applied[], unknown[] }`: check `unknown[]` is empty.

**Verify:** `completed`, then a NavMesh data asset next to the scene (legacy) or under each surface (AI Navigation) in `git status`, then a Play Mode check that an agent reaches a target (order in [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)).

**Pitfalls:** `clear_bake` is destructive, not undoable. Walkable geometry must be navigation-static (legacy) or collected by the surface; an empty result is a valid `completed`.

## Case 3 - occlusion culling (`occlusion`)

**When:** a large static 3D scene where culling cost matters.

```bash
unity command occlusion bake --dry_run true --smallest_occluder 5 --smallest_hole 0.25 --backface_threshold 100
unity command occlusion bake --smallest_occluder 5 --smallest_hole 0.25 --backface_threshold 100
```

Omitted parameters keep Unity's current values. Smaller occluder/hole values make the data larger and the bake longer; `backface_threshold` runs 1-100 (lower trims more backfaces).

**Verify:** `completed`, then an occlusion data asset next to the scene in `git status`.

**Pitfalls:** only static occluders/occludees are used; `clear_bake` is destructive and outside Undo.

## Cancel and clear

```bash
unity command lighting cancel_bake                       # stops a running bake, keeps old data
unity command lighting clear_bake --dry_run true         # preview
unity command lighting clear_bake --confirm true [--include_disk_cache true]
```

`clear_bake` without `confirm` is refused; with `confirm` it deletes baked data for the open scene(s) and cannot be undone. `--include_disk_cache` also wipes the GI disk cache, which makes the next bake start cold and slow. Recover cleared data only by re-baking or from version control.
