# Unity CLI — C# in a live project: scripts, recompile, eval, builder scripts, method reload
> See also: [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md), [unity-cli-editor-session.md](unity-cli-editor-session.md), [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md), [unity-cli-tests.md](unity-cli-tests.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

Base rules (`--project-path`, JSON output, exit codes, no hand-editing scene/asset files): [../unity-cli.md](../unity-cli.md). Command grammar and the `--` fence: [unity-cli-editor-session.md](unity-cli-editor-session.md).

| Goal | Command |
|---|---|
| Does my code compile (Editor already running)? | `unity recompile` (exit 0 ok, 6 errors, 7 no Editor reached) |
| Same, raw | `unity command script recompile` then poll `unity command script recompile_status` |
| New script file in the project | `script create` (`name`, `path`, `namespace`, `base_class`, `overwrite`) -> `unity recompile` -> `script attach` (`target`, `type` or `script`) |
| Change an existing `.cs` | edit on disk with the file tool -> `unity recompile` |
| Read / write a serialized field | `component get_fields` / `component set_field` (`target`, `field`, `value`, `component`) |
| Bulk construction, any multi-line C# | file outside `Assets/` + `script run` (`file`, `entry`, `args`, `dry_run`) |
| Ad-hoc one-liner | `script eval` (`code`, `timeout`) |
| Longer ad-hoc snippet | `script eval_file` (`file`, `timeout`); prefer `script run` |
| Swap a method body in a running game | `[MethodReload]` + `script.methodreload reload` |
| Check a builder compiles, run nothing | `script run --dry_run true` |

Pick by size: one expression -> `eval`; two or more statements, loops, anything with quotes -> a file and `script run`; a type the project must keep -> `script create`; a live fix to game logic -> method reload.

## The recompile loop

**When:** after every `.cs` change made on disk. An unfocused Editor does not refresh by itself, and a file written around the bridge stays invisible until a compile is requested.

```bash
unity command editor set_auto_tick        # once per Editor session; keeps it ticking while unfocused
# ... edit the .cs with the file tool ...
unity recompile --format json             # refresh + compile + poll + diagnostics in one call
```

`unity recompile` options: `--project-path`, `--timeout <seconds>` (120), `--strict` (warnings fail), `--focus`. It does NOT read `UNITY_PROJECT_PATH`: pass the path. Raw form, when you need the status object:

```bash
unity command script recompile
for i in $(seq 1 60); do
  out=$(unity command script recompile_status --result-only 2>/dev/null)
  echo "$out" | grep -Eq '"status" *: *"(completed|up_to_date)"' && break
  sleep 2
done
echo "$out"      # fields: status, failed, errors, compilationFailed
```

Statuses: `idle`, `triggered`, `compiling`, `completed`, `up_to_date`. A successful compile reloads the domain, so connection errors during the poll are expected.

**Verify:**
- Judge success by `failed` and the `errors` list (file, line, column, code, message), NEVER by `compilationFailed`, which lags one compile behind (bridge check `compile-2`).
- After a failed compile every read describes the last good build (stale read). Fix and recompile before testing or evaluating anything.
- Prove the new type exists by using it: `script attach` succeeds, or a `script run` that names it compiles.

**Pitfalls:**
- `script create` imports the file and reloads the domain by itself, although its description says it does not (bridge `INDEX.md`). Wait for readiness (`unity status --until-ready`) before the next command.
- A reload erases Editor memory: detached jobs, async `job wait` ids and applied method reloads do not survive it; exit Play Mode before recompiling.
- An Editor that boots with compile errors enters Safe Mode, loads no Pipeline package, and `unity recompile` exits 7: recovery is in [unity-cli-editor-session.md](unity-cli-editor-session.md).
- `script recompile` cannot run inside `job batch`.
- One `MonoBehaviour` per file, named after its class: several in one file work in the Editor and corrupt the player build.

## Case 1 - create and attach a script

```bash
unity command script create --name SpinOnce --path Scripts/Gameplay --namespace Game.Gameplay
unity recompile
unity command script attach --target Hero --type Game.Gameplay.SpinOnce
unity command component get_fields --target Hero --component SpinOnce
```

`path` is a folder under the authoring root (default `Assets`); `base_class` defaults to MonoBehaviour; an existing file is an error unless `--overwrite true`. `target` is a GameObject handle: a name or hierarchy path without a leading `/` (a leading `/` is mangled by Git Bash). Attach by `--script Assets/.../File.cs` when the class name differs from the file name. Attach is undoable; its sibling `component add` is blocked in Play Mode, so attach in Edit Mode. Editor-only code belongs in an `Editor/` folder or an asmdef.

**Verify:** `component get_fields` lists the new component's fields; a missing type returns a recoverable error: recompile, wait, retry.

## Case 2 - serialized fields

```bash
unity command component set_field --target Hero --component SpinOnce --field speed --value 6.5
unity command component set_field --target Hero --component SpinOnce --field 'waypoints.Array.size' --value 3
unity command component set_field --target Hero --component SpinOnce --field 'waypoints.Array.data[0]' --value '{"hierarchyPath":"Waypoints/A"}'
unity command component get_fields --target Hero --component SpinOnce --field speed
```

`field` is a SerializedProperty path (`[SerializeField]` private fields count; auto-property backing fields do not). Numbers and booleans are bare; strings, enum names and object references are JSON (object reference = an ObjectRef such as `{"path":"Assets/X.asset"}`, or `null` to clear). Quote bracket paths. Several properties at once: `component set_properties` ([unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)).

**Verify:** always read back with `get_fields` - a value that did not bind can still answer success (eaten-parameter class). **Pitfall:** treat both commands as Edit Mode only; sibling component commands are blocked in Play Mode.

## Case 3 - `script run`: the builder pattern

**When:** creating many objects, wiring fields, generating content, or any code longer than one line. It compiles one `.cs` file in memory and runs a static entry point: no asset import, no domain reload, about 2 s per iteration instead of 15-20 s.

1. Write `AgentScripts/Build.cs` with the file tool, OUTSIDE `Assets/` (Unity ignores it; no `.meta`, no reload). Under `Assets/` it would become project code: every edit reloads the domain and a duplicate class name breaks the project compile.
2. Run it. Relative `file` paths resolve against the PROJECT ROOT (parent of `Assets/`):

```csharp
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class Build
{
    public static int Markers(int count)
    {
        var parent = new GameObject("Markers");
        Undo.RegisterCreatedObjectUndo(parent, "Create markers");
        for (var i = 0; i < count; i++)
        {
            var child = new GameObject($"Marker_{i:00}");
            child.transform.SetParent(parent.transform, false);
            child.transform.localPosition = new Vector3(i, 0f, 0f);
            Undo.RegisterCreatedObjectUndo(child, "Create marker");
        }
        EditorSceneManager.MarkSceneDirty(parent.scene);
        return parent.transform.childCount;
    }
}
```

```bash
unity command script run --file AgentScripts/Build.cs --dry_run true           # compile only: diagnostics, nothing loaded
unity command script run --file AgentScripts/Build.cs --entry Build.Markers --args '[5]'
```

Result: `{ result, diagnostics, compileMs, executeMs, assemblyName }`. Compile errors return Roslyn diagnostics with line and column and execute nothing; runtime exceptions come back mapped to `file:line`.

- `entry` is `Namespace.Type.Method`, `Type.Method` or a bare name; omitted = the single public static method, else `Main`. Static non-generic methods only. `args` is a JSON array coerced to the parameter types (`null` only for reference types).
- `async Task` / `Task<T>` entries are awaited and `Task<T>.Result` is the result. `timeout` is in seconds (default 60); on expiry the task keeps running detached.
- Runs are unoptimized and each leaves one small assembly loaded: prefer one entry that does the whole job over many tiny runs.
- Excluded from `job batch`. `mode=hotpatch` is the method-reload path and rejects `entry`, `args` and `dry_run`.

**Verify:** the entry returns a count or a status string; re-read the scene (`scene get_hierarchy`, `gameobject find`) and check it. Scene changes made here are in memory: `scene list_open` shows the dirty flag, then `editor save_all` (bridge check `scene-2`). In Play Mode the changes are lost on exit.

## Case 4 - `script eval` and `eval_file`

```bash
unity command script eval 'return UnityEngine.Time.frameCount;'
unity command script eval --timeout 60 'return UnityEditor.EditorApplication.isCompiling;'
unity command script eval_file /abs/path/to/Probe.cs
```

- `return <expr>;` sends a value back; statements without `return` return nothing. Fully qualify types (`UnityEngine.Time`): default usings are not documented.
- `timeout` (seconds, default 30) belongs to the command; the CLI's own `--timeout <seconds>` is the request budget and wins. Some pages give the unit as milliseconds; the documented 0.9.1-exp.1 value is seconds. Read the unit from the schema (`unity command --query "script eval" --detail full --format json`).
- `eval_file` reads on the Unity side and relative paths resolve against the Unity process's working directory, not your shell's: pass an absolute path. The file must end in `.cs`; keep it outside `Assets/`.
- Eval runs arbitrary code on the main thread and holds the player loop until it returns. Not for loops or waiting: use `job wait` ([unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)). The eval family (`script eval`, `eval_file`, `run`) can be disabled; if `script eval` is absent from the catalog, `script run` is too: use typed commands or `script create`.
- Usage is logged locally to `Library/Pipeline/eval-usage.jsonl` (API fingerprints; the source text only if "Store Eval Source" is enabled).

## Quoting C# and JSON on Windows

Order of preference: (1) a file on disk with `script run` / `eval_file` - no quoting at all, identical in every shell; (2) a one-liner with no `"` or `'` in it; (3) the shell forms below. Write files with the agent's file tool, never with `echo` or a heredoc: shell layers rewrite backslashes and quotes.

| Need | Git Bash | PowerShell 5.1 |
|---|---|---|
| C# without `"` and `'` | `'return 1+1;'` | `'return 1+1;'` |
| C# with `"` | `'return "ab".Length;'` | `'return \"ab\".Length;'` |
| JSON argument | `'{"a":1}'` | `'{\"a\":1}'` |
| `'` inside the C# | not possible in `'...'`: use `(char)39`, `"x"[0]`, or a file | write `''` inside the PowerShell single quotes |
| Path starting with `/` or `--key=/path` | prefix `MSYS_NO_PATHCONV=1`, or use a relative path | not needed |

- Always single-quote the whole argument: inside double quotes both shells expand `$` (C# interpolated strings start with it) and PowerShell also treats the backtick as an escape.
- PowerShell 5.1 silently deletes unescaped `"` from native arguments; the `\"` form above is required (checked here with an argv-echo program, not with `unity` itself). PowerShell 7.3+ escapes for you: do not add the backslashes there.
- Self-test before relying on a form: `script eval` of `return "ab".Length;` must print 2. A compile error naming `ab` means the quotes were lost.
- Quote-free probes survive every shell: `UnityEngine.Object.FindFirstObjectByType<UnityEngine.Camera>().name`.
- Arguments that collide with a CLI flag (`--timeout`, `--format`, `--query`, `--tag`, `--limit`, `--port`...) go after a `--` fence: `unity command <group> <verb> -- --param value`.

## Method reload (hot-swap in a running game)

**When:** change a method body while the game runs, without a domain reload.

1. Tag the method before entering Play Mode: `[MethodReload]` (`using Unity.Pipeline.MethodReload;`), `public`, instance or static, returning `void` or `IEnumerator`. Tagging while the game runs does nothing: exit Play Mode, recompile, enter again.
2. Edit the body on disk, then apply:

```bash
unity command script.methodreload reload Assets/Scripts/Spinner.cs      # Assembly.Load backend: public members only
unity command script.methodreload reload_editor Assets/Scripts/Spinner.cs   # interpreter: C# subset, private members allowed
unity command script.methodreload status
```

`reload_player` (file or folder, optional `player` id) compiles in the Editor and pushes to connected development Players over PlayerConnection, also on IL2CPP; it needs the Editor running. `cleanup` reverts to compiled bodies (requests a domain reload; not batchable). A new helper method may be added in the same edit; new fields, properties and generics need a real recompile. Interpreter limits: no `try/catch`, `await`, `lock`, LINQ query syntax, `ref/out`, new types. `[OnMethodReloaded]` on a parameterless instance method runs after each reload.

**Verify:** `status` lists the method as reloaded and the behavior changes in the running game (frames must be advancing first, see [unity-cli-playmode-runtime.md](unity-cli-playmode-runtime.md)). Compile errors of the edited file are in the response and the console.

**Pitfall:** the reload lives in memory; the file edit is real and is compiled by the next `unity recompile`.

## Names in other docs

The GitHub `unity-pipeline` skill and some CLI examples use flat names. Confirm each in the live catalog (`unity command --obsolete-command-names --query <old>` maps an old name to its current one):

| Seen elsewhere | Full name here |
|---|---|
| `recompile`, `recompile_status` | `script recompile`, `script recompile_status` |
| `eval`, `eval_file`, `run_script` | `script eval`, `script eval_file`, `script run` |
| `reload_file`, `methodreload_status`, `cleanup_methodreload` | `script.methodreload reload`, `... status`, `... cleanup` |
| `set_autotick`, `editor_play`, `editor_status` | `editor set_auto_tick`, `editor.playmode start`, `editor status` |
