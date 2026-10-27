# Unity CLI — Scenes: Create, Open, Save, Hierarchy and Build List

> See also: [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md), [unity-cli-prefabs.md](unity-cli-prefabs.md), [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-tests.md](unity-cli-tests.md); base rule: [../unity-cli.md](../unity-cli.md).

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Run each as `unity command <group> <name> --project-path "<project>" ...`. Paths are relative to the authoring root (default `Assets`; `authoring get_root`); the `Assets/` prefix and the `.unity` extension are optional.

| Goal | Command |
|---|---|
| What is open, which is active, which is dirty? | `scene list_open` |
| Save everything dirty | `editor save_all` |
| Save the active scene / one open scene | `scene save` / `scene save --path Scenes/Level1` |
| Create a new scene file (saved at once) | `scene create --path Scenes/Level1 [--template empty\|default] [--additive true]` |
| Open a scene (replaces the open ones unless additive) | `scene open --path Scenes/Level1 [--additive true]` |
| Choose where new objects go | `scene set_active --path Scenes/Level1` |
| Snapshot a scene's tree | `scene get_hierarchy [--path Scenes/Level1]` |
| Add a scene to the build list | `scene add_to_build --path Scenes/Level1 [--enabled false]` |
| Remove it from the build list | `scene remove_from_build --path Scenes/Level1` |
| Read the build list | `build get_settings` -> `scenes[]` (`path`, `guid`, `enabled`) |
| Find objects without a full snapshot | `gameobject find` ([unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)) |
| Copy or rename a scene file | `asset copy` / `asset move` (assets-import), never a shell `cp` while the Editor is open |

## Case: save before anything that replaces a scene

**When:** before `scene open` or `scene create` without `additive`, before a test run, before anything that might restart the Editor.

**Why:** the call neither asks nor warns; unsaved edits of the replaced scene are gone, and the Editor's Undo cannot bring them back (bridge `scene-2`).

**Steps:**
```bash
unity command scene list_open --project-path "<project>"       # read the dirty flag of every open scene
unity command editor save_all --project-path "<project>"
unity command scene list_open --project-path "<project>"       # nothing dirty any more
unity command scene open --path Scenes/Level1 --project-path "<project>"
```
**Verify:** `scene list_open` shows the target loaded and active, and no dirty scene; then `scene get_hierarchy` (small scenes) or a narrow `gameobject find` shows the objects you expect.

**Pitfalls:** a scene dirtied by commands stays unsaved until you save it; `editor save_all` and `scene save` are refused in Play Mode; a save is outside Undo. A scene created with `scene create` is written to disk at once, but every later object edit dirties it again.

## Case: create a scene

**When:** a new level, menu or UI-only scene is needed.

**Steps:**
```bash
unity command scene create --path Scenes/Menu --template empty --project-path "<project>"
unity command scene list_open --project-path "<project>"
```
`template empty` (default) is a blank scene; `template default` seeds a Main Camera and a Directional Light like the built-in 3D template, which a UI-only or 2D scene does not want. Without `--additive true` the new scene replaces the open ones: apply the save rule above first. A UI scene is an empty scene plus a Canvas and exactly one EventSystem, built with the file for objects.

**Verify:** `scene list_open` lists it; `asset find --name Menu --search_in Scenes` returns its path and GUID.

**Pitfalls:** a bare path resolves under the authoring root (`authoring get_root`); a path that starts with `Assets/` or `Packages/` (any casing) is taken as a project path. The call saves at once and, unless `additive`, replaces the open scenes.

## Case: additive scenes and the active scene

**When:** a gameplay scene plus a UI scene or a lighting scene open together.

**Steps:**
```bash
unity command scene open --path Scenes/Ui --additive true --project-path "<project>"
unity command scene set_active --path Scenes/Gameplay --project-path "<project>"
```
New objects (`gameobject create`, `prefab instantiate` without `scene_path`) land in the **active** scene. `prefab instantiate --scene_path` picks another loaded scene; `scene save --path` saves one scene.

**Verify:** `scene list_open` shows both scenes loaded and the intended one active; a `gameobject create` reply carries a `hierarchyPath` you can find again.

**Pitfalls:**
- A path used as a target names one object across **all** open scenes. With the same path in two scenes the object of the inactive scene may be taken without a word: address by instance id, or by global id when the scene is a saved asset (bridge `scene-3`).
- uGUI needs exactly one EventSystem across **all** open scenes: after opening an additive scene, count them with `gameobject find --type UnityEngine.EventSystems.EventSystem`.
- After every additive open, confirm the state with `scene list_open` (which scene is loaded, which is active) instead of assuming it.

## Case: read the hierarchy without paying for the whole scene

**When:** you need to know what a scene contains before or after an edit.

`scene get_hierarchy` returns the tree with `instanceId` and `hierarchyPath` per node, usable by every GameObject command. A whole-scene read has no bound: about 130 bytes and 30 to 35 tokens per object, so six hundred objects cost roughly twenty thousand tokens, and the cost grows with every object added.

```bash
unity command scene get_hierarchy --path Scenes/Ui --project-path "<project>"      # one small scene
unity command gameobject find --name Title --project-path "<project>"              # narrow read
```
- Read narrowly: `gameobject find --name <n>`, `--tag`, `--type`, `--hierarchy_path`, or the counts in `scene list_open`; keep whole-scene reads for small scenes or a single additive scene (`--path`).
- The nesting depth must stay below 63 before a whole-scene read: an answer that only calls the response format invalid is the depth, not the connection, and a chain several hundred deep hangs the command lane (bridge `scene-1`).
- Hierarchy paths start with `/` (`/Canvas/Panel/Title`). Take paths and ids from the reply; do not compose them from memory.
- **Verify** a narrow read by comparing the returned identities with the count and names you expect.

## Case: the Build Settings scene list

**When:** a scene must (or must no longer) ship in the Player.

```bash
unity command scene add_to_build --path Scenes/Level1 --project-path "<project>"
unity command build get_settings --project-path "<project>"
```
`add_to_build` and `remove_from_build` are idempotent and take effect on the global list; they are not undoable and a transactional `job batch` rejects them. **Verify** by reading `scenes[]` from `build get_settings`: order, `enabled` and the path you meant. A Unity 6 Build Profile can carry its own scene list (`build set_profile --overrideGlobalScenes`): see [unity-cli-build-ci.md](unity-cli-build-ci.md). `build get_settings` does not manage scenes and `build set_settings` does not either.

## Case: Play Mode, Undo and tests

**When:** a scene command is refused, an edit must be reverted, or a test run is next. These are refusal and ordering rules, so there is no snippet; the commands are in the cases above.

- Mutating scene commands (`create`, `open`, `save`, `save_all`, `set_active`, `add_to_build`, `remove_from_build`) are refused in Play Mode with a recoverable error before any state is touched; `list_open` and `get_hierarchy` are safe. Stop Play Mode before authoring.
- `scene open` and `scene create` clear the Editor's Undo stack, so they are always rejected inside `job batch`, even non-transactional ([unity-cli-editor-session.md](unity-cli-editor-session.md)).
- Before a test run, every open scene must be saved: an unsaved scene makes the run hold the command lane for its whole timeout and end as a success with no tests (bridge `scene-4`). Require a test count above zero ([unity-cli-tests.md](unity-cli-tests.md)).
- Object edits made by `gameobject`/`component` commands are Undo-able; a scene save is not.

## Pitfalls

- Opening or creating a scene in place of an unsaved one (`scene-2`): save first, commit before a phase that does so.
- Editing the `.unity` file by hand while the Editor is reachable: the Editor does not see it, and the write can land in a scene that is not the active one.
- Treating a bare `scene create` reply as proof: read `scene list_open`.
- Dumping `scene get_hierarchy` of a large scene into the context; reading a hierarchy at depth 63 or more.
- Reusing the same hierarchy path in two open scenes and addressing it by path.
