# ChiR24 Unreal MCP — Blueprint logic and components

| Task | Capability family |
|---|---|
| Create/read a Blueprint | `blueprint.create`, `get_blueprint`, `probe_handle` |
| Variables/defaults | `blueprint.edit_variable` |
| Persistent component hierarchy | `blueprint.get_scs`, `edit_scs` |
| Functions/events/interfaces | `blueprint.add_function`, `implement_interface` |
| Nodes/pins/batch graph | `blueprint.inspect_graph`, `edit_graph` |
| Read/write a graph as code | `blueprint.read_graph_as_code`, `write_graph_from_code` |
| Reusable gameplay behaviors | `blueprint.add_behaviour` |
| Diagnostics | `blueprint.lint_blueprint`, `compile`; runtime logpoints through `inspect` |

## Read, author, compile, exercise

```json
{"operation":"describe","capability":"blueprint.read_graph_as_code"}
```

Read the exact event/function graph and parent class before editing. Inspect existing variables, components and interfaces. Class defaults, placed-instance overrides and PIE runtime values are different targets; choose intentionally.

For a variable: inspect type/container → create or edit → set a compatible default → compile → read it back. Container defaults may require a second `set_default` operation after the variable exists. Reuse existing variables instead of producing suffixed duplicates.

For a component: inspect SCS → add/reparent/configure through `edit_scs` → verify hierarchy and template properties → compile/save → inspect an instance. Runtime actor components are not a substitute for Blueprint SCS ownership.

## Graph authoring traps

- Inspect available node/function/pin information. Do not invent node class names or pin labels from their display text.
- A foreign-class call needs the function member and owner class. A generic function-name lookup may search only the Blueprint's own class.
- `SpawnActorFromClass` / `CreateWidget` get the class through the **Class input pin**; a cast uses its target-class contract. A node property named “Class” is not interchangeable.
- Exec outputs normally have a single connection. Use a Sequence for intentional fan-out; inspect target/object/data connections as well as execution flow.
- Batch graph construction can use local ids and `$id.Pin` links. Use its supported dry-run first; it stops on a failing step, so inspect partial edits before retrying.
- Graph-as-code uses the server's S-expression grammar, not arbitrary C++, Python or prose. Read the existing representation before writing a body. The implementation can preserve unchanged node identities and roll back a compile-breaking body; inspect the actual receipt rather than assuming all edits are transactional.
- Read compile diagnostics after every editing response that includes them, including node references. A graph saved to disk can still fail to compile or never execute.

Example discovery for a new event graph:

```json
{"operation":"search","query":"build blueprint graph","tool":"manage_blueprint","limit":2}
```

For a behavior shortcut (health, pickup, shooting, chase, moving platform), describe `blueprint.add_behaviour` and the chosen variant. Inspect what graph/components it authors; a behavior name is not evidence of its runtime wiring. Prefer the smallest supported operation over a rewrite of the whole graph.

## Acceptance

Lint for unreachable paths, possible null reads, unbounded loops and expensive Tick work. Compile, inspect the resulting graph/defaults, save the Blueprint, then test the triggering event in PIE. Use `inspect` logpoints where available for persistent values rather than trying to observe a projectile that disappears between calls. Clear only the instrumentation created for this task.

Sources: [Blueprint playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [extension guide](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/editor-plugin-extension.md). For user widgets load [ui-umg](chir24-unreal-mcp-ui-umg.md); for editor batch scripts load [scripting-automation](chir24-unreal-mcp-scripting-automation.md).
