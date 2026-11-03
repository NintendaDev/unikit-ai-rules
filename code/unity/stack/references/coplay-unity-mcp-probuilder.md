# Coplay Unity MCP — ProBuilder modeling

| Need | `manage_probuilder` action family | CLI |
|---|---|---|
| Capability/mesh inspection | `ping`, `get_mesh_info` | `probuilder info`; raw for ping |
| Editable primitive/footprint | `create_shape`, `create_poly_shape` | `probuilder create-shape/create-poly` |
| Semantic face selection | `select_faces` | `probuilder select-faces` |
| Extrude/bevel/subdivide/delete/connect | Face/edge editing actions | Dedicated wrappers where present, otherwise `probuilder raw` |
| Move/weld/split/insert vertices | Vertex actions | Wrappers or raw |
| Face material/UV/smoothing | `set_face_material`, `set_face_uvs`, `set_smoothing`, `auto_smooth` | Wrappers or raw |
| Validate/repair/pivot/transform | `validate_mesh`, `repair_mesh`, `center_pivot`, `freeze_transform` | `probuilder validate/repair/center-pivot/freeze-transform` |

## Model from inspected topology

1. Activate `probuilder` and check `com.unity.probuilder`. Prefer native ProBuilder shapes when the task needs editable topology or face materials and the package is already available. Do not install it for an ordinary transform edit.
2. Create a supported `shape_type` or polygon footprint; put shape-specific options in `properties`. Check scale, axes, winding and extrusion direction against the requested geometry.
3. Query `get_mesh_info` with `include="faces"` or `edges` before topology edits. Face data includes direction labels; `select_faces` supports semantic direction/tolerance and adjacency criteria.
4. Feed returned indices into the edit. Requery after every topology change: previous face, edge and vertex indices may be invalid.
5. Inspect normals, materials and bounds, validate, then capture and verify persistence in the intended scene/prefab.

```python
manage_probuilder(action="create_shape", properties={"shape_type": "Cube", "name": "ProbeBlock"})
manage_probuilder(action="get_mesh_info", target="ProbeBlock", properties={"include": "faces"})
manage_probuilder(action="select_faces", target="ProbeBlock",
                  properties={"direction": "up", "tolerance": 0.9})
# Use faceIndices returned for the current mesh, rather than a template's face number.
manage_probuilder(action="validate_mesh", target="ProbeBlock")
```

```powershell
unity-mcp --format json probuilder create-shape Cube --name ProbeBlock
unity-mcp --format json raw manage_probuilder '{"action":"get_mesh_info","target":"ProbeBlock","properties":{"include":"faces"}}'
unity-mcp --format json raw manage_probuilder '{"action":"select_faces","target":"ProbeBlock","properties":{"direction":"up","tolerance":0.9}}'
unity-mcp --format json probuilder validate ProbeBlock
```

After inspection confirms the top face is index 2, an illustrative mutation is:

```python
manage_probuilder(action="extrude_faces", target="ProbeBlock",
                  properties={"faceIndices": [2], "distance": 0.75, "method": "FaceNormal"})
```

```powershell
unity-mcp --format json probuilder raw extrude_faces ProbeBlock --params '{"faceIndices":[2],"distance":0.75,"method":"FaceNormal"}'
```

## Geometry pitfalls

- `properties` uses action-specific keys such as `faceIndices`, `edgeIndices`, `vertexIndices`, `materialPath`, `extrudeHeight`; do not blindly snake-case nested keys from the generic tool schema.
- `get_mesh_info` defaults to a summary. The skill reference documents caps on detailed face/edge data; treat capped output as partial instead of concluding there are no further elements.
- Face material assignment can affect all faces if indices are omitted. Specify indices for a partial edit.
- `validate_mesh` is diagnostic; `repair_mesh`, combining, freezing transforms and pivot operations mutate geometry or object transforms. Inspect their actual consequences on collider/children/prefab state.
- The official skill reference flags `set_pivot` persistence and `convert_to_probuilder` import failures, while the generated page lists those actions normally. Treat this as a **documented compatibility check**, not proof that every installed version is broken or fixed. Test only when needed on task-owned geometry, reread/rebuild/save, and verify the result before relying on it.
- For detailed polygon, welding, smoothing and room workflows, consult the official ProBuilder guide only when the current operation needs them; do not preload its entire catalog.

Sources: [generated reference](https://coplaydev.github.io/unity-mcp/reference/tools/probuilder/manage_probuilder), [official guide](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/probuilder-guide.md), [compatibility notes](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/tools-reference.md), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
