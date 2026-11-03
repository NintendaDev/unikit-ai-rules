# GDAI Godot MCP — Scripts, features and errors

> See also: [runtime verification](gdai-godot-mcp-runtime-verification.md), [collision setup](gdai-godot-mcp-resources-physics.md).

---

| Task | Tool route |
|---|---|
| Read a known script | `view_script` |
| Investigate the editor's open code context | `get_open_scripts` |
| Create and attach behavior | `create_script`, then `attach_script` |
| Patch known existing text | `edit_file` after rereading it |
| Read diagnostics | `get_godot_errors` |
| Start a clean reproduction log | Preserve evidence first, then `clear_output_logs` if useful |

## Edit with current context

Read the actual script and relevant callers before replacement. Confirm the node's class is compatible with the script's base class; a created script is not an attached behavior. Inspect existing attachments before replacing them.

For find/replace edits, anchor on current, sufficiently specific text. Check the installed tool's occurrence and matching semantics. After editing, reread the changed function and surrounding code; do not assume regex support, a unique-match guard or atomic edits. Use a verified file-edit route if the wrapper cannot express the intended patch.

## Worked case: repair a reported GDScript error

```text
get_godot_errors: capture file, line, message and stack/context
  → view_script: inspect the failing code and related call sites
  → edit_file: make the smallest coherent correction
  → view_script: verify the resulting source
  → allow the editor to reload/parse through its actual readiness behavior
  → get_godot_errors: distinguish old output from a fresh failure
  → reproduce the original runtime trigger if the defect requires it
```

Fix an initiating parse/type error before chasing its dependent failures. Empty output after clearing logs is not proof of recovery. Do not promise C# compilation support from tools explicitly described as GDScript authoring tools.

## Worked case: add movement and jumping

Inspect existing controller, Input Map actions, body type, gravity and collision first. Preserve the project's action names. Implement one coherent change, attach it to the intended player, verify its world instance and collision resources, then test movement, jumping, landing and collisions. This recipe intentionally omits a generic controller snippet: movement semantics depend on the actual body and existing controller.

## Worked case: add types and useful documentation

Annotate the existing API without changing its behavior. Infer types from assignments/callers; do not turn a heterogeneous collection or nullable return into an incorrect narrow type just to remove warnings. Keep syntax compatible with the actual Godot version.

Original small example combining an exported setting, typed signature and documentation:

```gdscript
extends Node

## Maximum charge accepted by this component.
@export var charge_limit: float = 12.0

# Charge is restored from the active session.
var _charge: float = 0.0

## Returns the amount accepted without exceeding the limit.
func add_charge(amount: float) -> float:
    var remaining: float = maxf(charge_limit - _charge, 0.0)
    var accepted: float = clampf(amount, 0.0, remaining)
    _charge += accepted
    return accepted
```

Use `##` directly before documented members/annotations; use `#` for implementation explanations. Adapt comments to meaningful contracts, not restatements of every line. For a documentation-only pass, inspect the diff for accidental executable changes. For a typing pass, parse again and exercise affected dynamic boundaries.

Sources: [script/diagnostic tools](https://gdaimcp.com/docs/supported-tools), [feature/debug/type/comment scenarios](https://gdaimcp.com/docs/examples), [typing](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html), [documentation comments](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_documentation_comments.html).
