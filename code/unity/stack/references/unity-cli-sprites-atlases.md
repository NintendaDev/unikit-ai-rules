# Unity CLI — Sprites and Atlases

> See also: [unity-cli.md](../unity-cli.md) · [unity-cli-assets-import.md](unity-cli-assets-import.md) · [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md) · [unity-cli-settings-packages.md](unity-cli-settings-packages.md) · [unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)

Written against Unity CLI 1.0.0-beta.14 and com.unity.pipeline 0.9.1-exp.1; the live catalog (`unity command --query <term> --format json`) outranks this page.

---

## Goal -> command

The CLI has no sprite-specific command. Sprite work is two things: importer settings through the `asset` commands, and C# run in the live Editor through `script eval` (one-liners) or `script run` (a file with an entry point; mechanics are owned by [unity-cli-scripts-compile-eval.md](unity-cli-scripts-compile-eval.md)). Sprite rects, borders, pivots and outlines live inside the importer; no file can be edited to change them.

| Goal | How |
|---|---|
| Make a PNG a sprite | `asset set_import_settings` with `textureType: Sprite` (+ `spriteImportMode`) |
| Pixel-art import (point filter, no mips) | `asset set_import_settings` with `filterMode`, `mipmapEnabled`, then read back |
| Read what the importer holds | `asset get_import_settings --asset <png> --format json` |
| Slice a sheet, change rects, names, pivots, 9-slice borders | C# `ISpriteEditorDataProvider` via `script run` |
| Set a sprite outline | C# `ISpriteOutlineDataProvider.SetOutlines` via `script run` |
| Count the sprites a texture now has | `script eval` + `AssetDatabase.LoadAllAssetRepresentationsAtPath` |
| Check / enable Sprite Packer mode | `script eval` on `EditorSettings.spritePackerMode`, read back |
| Create or update a Sprite Atlas V2 | C# `SpriteAtlasAsset` + `SpriteAtlasImporter` via `script run` |
| Per-platform atlas compression and size | `SpriteAtlasImporter.SetPlatformSettings` in the same script |

Shell note: JSON and C# below use Git Bash quoting (single quotes around the value). In Windows PowerShell 5.1 write each inner `"` as `\"`; PowerShell 7.3+ takes the Git Bash form. Put multi-line C# in a file under `AgentScripts/` (outside `Assets/`, so writing it triggers no import or domain reload) and run it with `script run`; do not push escaped multi-line C# through `eval`.

## Safety rules (apply to every case below)

- **Capability checks first.** Before changing rects, names, borders, pivots or creating sprites, get the data provider, read its edit capability and abort when the importer does not allow the operation. Throw; never "try anyway", because a write the importer did not allow corrupts sprite data. Capabilities: `EditSpriteName`, `EditSpriteRect`, `EditBorder`, `EditPivot`, `CreateAndDeleteSprite`.
- **Never hand-edit a `.meta` file** to change sprite or atlas data. An unreachable Editor is a stop, not a cue to edit files.
- **`script eval` compiles a statement block, not a file.** No `using` directives (read as a disposal statement, `CS0210`); fully qualify every type (`CS0246` / `CS0103` otherwise; a bare `Object` is ambiguous, `CS0104`). A `script run` file is a normal C# file, so `using` is fine there. Confirm `eval` exists in the live catalog; its presence depends on the Pipeline version.
- **Sprite data is in original-image coordinates**, not the imported texture size: a 4096 px source imported at max size 2048 still has rects up to 4096. Read the real size from `ITextureDataProvider.GetTextureActualWidthAndHeight`, never from the imported `Texture2D`.
- The types come from the 2D Sprite editor package (part of `com.unity.2d.feature`). If `UnityEditor.U2D.Sprites` does not resolve, check `package list` before anything else ([unity-cli-settings-packages.md](unity-cli-settings-packages.md)).

## Import a texture as a sprite

```bash
unity command asset set_import_settings --asset Art/hero_sheet.png --settings '{"textureType":"Sprite","spriteImportMode":"Multiple","spritePixelsPerUnit":32,"filterMode":"Point","mipmapEnabled":false}' --dry_run true
unity command asset set_import_settings --asset Art/hero_sheet.png --settings '{"textureType":"Sprite","spriteImportMode":"Multiple","spritePixelsPerUnit":32,"filterMode":"Point","mipmapEnabled":false}'
unity command asset get_import_settings --asset Art/hero_sheet.png --format json
```

- `textureType` must be `Sprite`, and `spriteImportMode` must be `Multiple` before a sheet can hold several sprites (`Single` for one sprite). Names are TextureImporter property names; the `--dry_run` reply lists names it does not know.
- Pixel art: Point filter, no mipmaps, no compression, and one `spritePixelsPerUnit` for the whole project. Compression and per-platform max size are platform overrides: `get_import_settings --platform Android` reads them, writing them needs C# ([unity-cli-assets-import.md](unity-cli-assets-import.md)).
- **Verify:** read the settings back and compare each changed name. **Pitfall:** a misspelled name is reported only in the unknown list.

## Slice a sheet, set pivots and borders (data provider)

**When:** a sheet needs sprites, or existing sprites need new rects, names, pivots or 9-slice borders. Write `AgentScripts/SliceSheet.cs`:

```csharp
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

public static class SliceSheet
{
    // entry SliceSheet.Grid, args ["Assets/Art/hero_sheet.png", 32, 32]
    public static string Grid(string assetPath, int cellW, int cellH)
    {
        var importer = AssetImporter.GetAtPath(assetPath);
        var factory = new SpriteDataProviderFactories();
        factory.Init();
        var provider = factory.GetSpriteEditorDataProviderFromObject(importer);
        if (provider == null) throw new System.Exception("No sprite data provider for " + assetPath);
        provider.InitSpriteEditorDataProvider();

        var cap = provider.GetDataProvider<ISpriteFrameEditCapability>();
        if (cap == null || !cap.GetEditCapability().HasCapability(EEditCapability.CreateAndDeleteSprite))
            throw new System.Exception("Importer cannot create sprites; aborted.");

        provider.GetDataProvider<ITextureDataProvider>().GetTextureActualWidthAndHeight(out int w, out int h);
        var rects = new System.Collections.Generic.List<SpriteRect>();
        var ids = new System.Collections.Generic.List<SpriteNameFileIdPair>();
        for (int y = h - cellH, n = 0; y >= 0; y -= cellH)
            for (int x = 0; x + cellW <= w; x += cellW, n++)
            {
                var r = new SpriteRect { name = "tile_" + n, spriteID = GUID.Generate(), rect = new Rect(x, y, cellW, cellH),
                                         alignment = SpriteAlignment.Center, pivot = new Vector2(0.5f, 0.5f) };
                rects.Add(r); ids.Add(new SpriteNameFileIdPair(r.name, r.spriteID));
            }
        provider.SetSpriteRects(rects.ToArray());
        provider.GetDataProvider<ISpriteNameFileIdDataProvider>()?.SetNameFileIdPairs(ids);
        provider.Apply();
        importer.SaveAndReimport();
        return rects.Count + " sprites from " + w + "x" + h;
    }
}
```

```bash
unity command script run --file AgentScripts/SliceSheet.cs --entry SliceSheet.Grid --args '["Assets/Art/hero_sheet.png",32,32]' --dry_run true
unity command script run --file AgentScripts/SliceSheet.cs --entry SliceSheet.Grid --args '["Assets/Art/hero_sheet.png",32,32]'
unity command script eval --code 'return UnityEditor.AssetDatabase.LoadAllAssetRepresentationsAtPath("Assets/Art/hero_sheet.png").Length;'
```

- `--dry_run true` only compiles and reports diagnostics; nothing runs. Rects use a bottom-left origin, hence the top-down row loop.
- The snippet replaces every existing sprite with new IDs, which orphans scenes and prefabs that reference the old sprites. When sprites are already referenced, keep the existing `spriteID` for rects that overlap the old ones (the official helper has DeleteAll, Smart and Safe modes) instead of regenerating.
- **Pivot:** set `pivot` and `alignment = SpriteAlignment.Custom` together; a custom pivot requires `Custom`. Use enum names, never raw numbers. Requires `EditPivot`; call `SetSpriteRects`, `Apply`, then `SaveAndReimport`.
- **9-slice border:** `SpriteRect.border` is a `Vector4` (left, bottom, right, top) in original pixels; requires `EditBorder`. The `Image` component must still use type Sliced ([unity-cli-gameobjects-components.md](unity-cli-gameobjects-components.md)).
- **Outline:** `provider.GetDataProvider<ISpriteOutlineDataProvider>().SetOutlines(spriteGuid, list)`; physics shapes use `ISpritePhysicsOutlineDataProvider`.
- **Verify:** the `eval` count (sub-assets only, the main texture is not counted) equals the number of sprites you cut; check names and rects by reading `GetSpriteRects()` again. **Pitfall:** from Unity 2021.2 adding or removing sprites also needs `ISpriteNameFileIdDataProvider` (done above); skipping it leaves sprites without stable IDs.

## Pixel-perfect pointers

- Keep one PPU, Point filter and no compression on every sprite (and on the atlas: packed sprites take the atlas's texture settings, so set `filterMode` Point on the atlas importer's `textureSettings`).
- The Pixel Perfect Camera comes from `com.unity.2d.pixel-perfect`, included in `com.unity.2d.feature`. Add the component with `component add` using the type name the project's catalog lists; its assets-PPU value must equal the sprites' PPU.

## Sprite Atlas V2: preconditions

Official guidance targets Unity 6000.3 or later and the V2 types: `SpriteAtlasAsset` and `SpriteAtlasImporter` are editor-only, `SpriteAtlas` is the runtime type, atlas files use `.spriteatlasv2`. The official skill's default is a prebuild generator in the project (`IPreprocessBuildWithReport`) that rebuilds atlases at every build; what follows is the one-off authoring done through the live Editor.

1. **Sprite Packer mode must be read back.** `Disabled` is the zero value, so an unconfigured project packs nothing: the atlas still imports, still looks finished, and never packs. Never report "enabled" from a write; read the value.
2. **Sources come only from `Assets/`.** Never add built-in assets, package assets or paths outside the project.
3. **Never script `SpriteAtlas` in editor code.** Use it only to read (`GetPackables`, `spriteCount`), to pass to `SpriteAtlasUtility.PackAtlases` or to `SetMasterAtlas`; edit through `SpriteAtlasAsset`, then `SpriteAtlasImporter`.
4. **Scope `AssetDatabase.FindAssets` to folders** (`new[] { "Assets" }`); an unscoped search reaches read-only packages.

```bash
unity command script eval --code 'return UnityEditor.EditorSettings.spritePackerMode.ToString();'
```

## Create or update an atlas (two-step pattern)

Create with `SpriteAtlasAsset`, save, import, then configure through `SpriteAtlasImporter` and `SaveAndReimport`. Write `AgentScripts/MakeAtlas.cs`:

```csharp
using UnityEditor;
using UnityEditor.U2D;
using UnityEngine;

public static class MakeAtlas
{
    // entry MakeAtlas.FromFolder, args ["Assets/Art/UI", "Assets/Atlases/UI.spriteatlasv2"]
    public static string FromFolder(string spriteFolder, string atlasPath)
    {
        if (!spriteFolder.StartsWith("Assets/")) throw new System.Exception("Atlas sources must live under Assets/.");
        if (EditorSettings.spritePackerMode == SpritePackerMode.Disabled)
            EditorSettings.spritePackerMode = SpritePackerMode.SpriteAtlasV2;
        if (EditorSettings.spritePackerMode == SpritePackerMode.Disabled) throw new System.Exception("Sprite Packer is still Disabled.");

        var asset = new SpriteAtlasAsset();
        asset.Add(new Object[] { AssetDatabase.LoadAssetAtPath<DefaultAsset>(spriteFolder) });
        SpriteAtlasAsset.Save(asset, atlasPath);
        AssetDatabase.ImportAsset(atlasPath);

        var importer = (SpriteAtlasImporter)AssetImporter.GetAtPath(atlasPath);
        importer.includeInBuild = true;
        var packing = importer.packingSettings;
        packing.padding = 2; packing.enableRotation = false; packing.enableTightPacking = false;
        importer.packingSettings = packing;
        var android = importer.GetPlatformSettings("Android");
        android.overridden = true; android.maxTextureSize = 2048; android.format = TextureImporterFormat.ASTC_6x6;
        importer.SetPlatformSettings(android);
        importer.SaveAndReimport();
        return "packer mode " + EditorSettings.spritePackerMode;
    }
}
```

```bash
unity command script run --file AgentScripts/MakeAtlas.cs --entry MakeAtlas.FromFolder --args '["Assets/Art/UI","Assets/Atlases/UI.spriteatlasv2"]'
unity command script eval --code 'return UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.U2D.SpriteAtlas>("Assets/Atlases/UI.spriteatlasv2").GetPackables().Length;'
```

- A folder as packable includes every sprite below it, including later additions. Add individual sprites or textures when the set must be fixed.
- Update an existing atlas by loading it with `SpriteAtlasAsset.Load(path)`, calling `Add` / `Remove`, then `Save` and `ImportAsset` again.
- **Variants** (for example a half-resolution set): mark with `SetIsVariant(true)`, point to the master with `SetMasterAtlas(<runtime SpriteAtlas of the master>)`, scale with `importer.variantScale`. A variant takes the master's runtime atlas, never a path or a `SpriteAtlasAsset`.
- **Verify:** (1) the packer mode printed by the script is not `Disabled`; re-read it with the `eval` above; (2) `GetPackables().Length` matches the intent; (3) importer values (`includeInBuild`, `packingSettings`, platform block) re-read after the reimport; (4) optional preview: `SpriteAtlasUtility.PackAtlases` with the runtime atlases (it takes `SpriteAtlas[]`, not assets) then `spriteCount` above zero. Preview only: build-time packing is automatic, and packing or reimporting inside a build step is wrong.

## Mobile packing

- Padding 2 for UI, rotation off for UI and animation frames, tight packing off for UI, on for irregular character art. Alpha dilation: the official samples disagree; turn it on only if edge bleeding shows.
- Max texture size 2048 is the page size the official examples use for Android; split atlases by screen or feature rather than raising it.
- Formats: ASTC for Android (`ASTC_6x6`, `ASTC_4x4`); ASTC or ETC2 for iOS. PVRTC is not supported by Sprite Atlas V2. Assign the enum directly (`format = TextureImporterFormat.ASTC_6x6`); a cast to `int` does not compile.
- Delivery: `includeInBuild = true` for always-needed UI and gameplay sprites. `false` means late binding through Addressables, which needs a loader script and an Addressables build step; do that only when the task asks for downloadable content.

## Pitfalls

- A success reply from `script run` or `eval` is not evidence; re-read counts, rects and settings.
- `eval` rejecting `using` or bare type names is a compile error, not a warning; qualify the names or move the code to a `script run` file.
- Slicing against the imported (downscaled) texture instead of the original size produces rects that do not match the art.
- An atlas created while Sprite Packer is `Disabled` reads as a success; the Inspector says "Sprite Atlas packing is disabled".
- `SpriteAtlasAsset.SetPlatformSettings`, `SetTextureSettings`, `SetIncludeInBuild` and `SetMasterAtlasPath` do not apply in V2; use the importer and `SetMasterAtlas`.
- Importer and atlas writes are outside Undo and cannot run in a transactional batch ([unity-cli-assets-import.md](unity-cli-assets-import.md)).
