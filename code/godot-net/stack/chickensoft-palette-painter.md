---
version: 1.0.0
---

# Chickensoft PalettePainter

> **Scope**: PalettePainter is a .NET CLI tool for generating color-ramp palette PNG files following the Slynyrd pixel art methodology — covers installation, CLI usage, parameter tuning, Godot asset workflow, and CI/CD integration.
> **Load when**: generating a game color palette, setting up a pixel art pipeline, integrating PalettePainter into CI/CD, running `palettepainter generate`, configuring dotnet-tools.json for art tooling.

---

## What It Is

PalettePainter is a **standalone .NET CLI tool** — not a C# library. It has no runtime API and no classes to import into game code. It generates `.png` palette image files using the Slynyrd polynomial color ramp methodology (saturation peaks in the mid-range, brightness increases left-to-right, hue shifts across ramps for visual cohesion).

- **Package**: `Chickensoft.PalettePainter`
- **CLI executable**: `palettepainter`
- **Output**: a `.png` file of color swatches, imported into Godot as a regular art asset
- **Integration**: indirect — run the tool once, import the resulting `.png` under `res://art/palettes/`

## Installation

### Global (personal machine)

```bash
dotnet tool install -g Chickensoft.PalettePainter
```

After installation, `palettepainter` is available in any shell.

### Local / team project (recommended for reproducibility)

```bash
dotnet new tool-manifest                         # creates .config/dotnet-tools.json
dotnet tool install --local Chickensoft.PalettePainter --version 1.1.0
```

Commit `.config/dotnet-tools.json`. Teammates run:

```bash
dotnet tool restore
```

Invoke locally:

```bash
dotnet tool run palettepainter generate palette.png --scale 12
```

### Build tool integration

```bash
# Cake
#tool dotnet:?package=Chickensoft.PalettePainter&version=1.1.0

# NUKE
nuke :add-package Chickensoft.PalettePainter --version 1.1.0
```

## CLI Usage

```bash
palettepainter generate <output.png> [options]
```

### Required argument

| Argument | Description |
|----------|-------------|
| `<output.png>` | Path to the output PNG file |

### Options and defaults

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--num-ramps` | `-n` | `16` | Number of color ramps |
| `--num-colors-per-ramp` | `-c` | `9` | Colors per ramp |
| `--hue` | `-h` | `0` | Starting hue of the first ramp (0–360) |
| `--hue-shift` | `-m` | `0.5` | Fraction of the hue spectrum consumed per ramp |
| `--hue-spectrum` | `-u` | `360` | Total spectrum in degrees the palette spans |
| `--saturation` | `-s` | `1.0` | Multiplier on the Slynyrd saturation curve |
| `--brightness` | `-b` | `1.0` | Multiplier on the Slynyrd brightness curve |
| `--desaturate` | `-d` | `0.3` | Saturation multiplier for the desaturated ramp variant |
| `--num-colors-to-trim-for-desaturated-ramp` | `-z` | `2` | Colors trimmed from both ends of the desaturated variant |
| `--scale` | `-x` | `1` | Pixel size per swatch (e.g. `12` = 12×12 px) |

### Built-in help

```bash
palettepainter --help
palettepainter generate --help
```

## Recipes

### Universal game palette (16 ramps, full spectrum)

```bash
palettepainter generate palette.png --scale 12
```

### Compact retro palette (8 ramps × 5 colors)

```bash
palettepainter generate palette.png \
  --num-ramps 8 \
  --num-colors-per-ramp 5 \
  --hue-spectrum 360 \
  --scale 12
```

### Themed palette — winter blues

```bash
palettepainter generate winter.png \
  --hue 180 \
  --num-ramps 8 \
  --hue-shift 0.5 \
  --hue-spectrum 100 \
  --desaturate 0.3 \
  --scale 12
```

### Narrow warm palette — wood / earth tones

```bash
palettepainter generate wood.png \
  --hue 20 \
  --num-ramps 4 \
  --hue-shift 0.1 \
  --hue-spectrum 15 \
  --desaturate 0.6 \
  --scale 12
```

### Leafy greens

```bash
palettepainter generate greens.png \
  --hue 110 \
  --num-ramps 6 \
  --hue-shift 0.5 \
  --hue-spectrum 60 \
  --desaturate 0.6 \
  --scale 12
```

## Parameter Tuning

- `--hue-spectrum` controls thematic scope: `360` = universal palette; `30–100` = single biome, character type, or UI scheme.
- `--hue-shift 0.5` is the Slynyrd standard; lower values (`0.1`) produce closely related sibling ramps.
- `--desaturate 0.3` keeps desaturated variants muted and tinted — good for shadows and rocks. Lower approaches grey/neutral.
- `--num-colors-per-ramp 9` is the Slynyrd standard. Reducing to 5–7 gives a lo-fi / retro feel.
- Use `--scale 1` for raw palette files used by game code; use `--scale 12` or higher when generating for art software reference.

## Godot Project Workflow

1. Run PalettePainter before starting sprite production.
2. Store the output PNG under `res://art/palettes/` (or equivalent) and import it as a `CompressedTexture2D`.
3. Use Aseprite, Pixelorama, or GIMP to load the palette PNG as a color reference when painting sprites.
4. Version-control the shell command that generated the palette (in a `Makefile`, `justfile`, or `.sh` script) so the palette is fully reproducible.

## CI/CD Integration

Add the tool to `.config/dotnet-tools.json` and run `dotnet tool restore` in the pipeline before any build step that needs generated palettes:

```yaml
# GitHub Actions example
- name: Restore .NET tools
  run: dotnet tool restore

- name: Generate palette
  run: dotnet tool run palettepainter generate art/palettes/main.png --scale 12
```

Always pin the version in `dotnet-tools.json` to ensure reproducible output across machines and CI agents.

## Anti-patterns

**Importing as a PackageReference.** PalettePainter is a CLI tool, not a library. Adding it as `<PackageReference>` in your `.csproj` will not work — install it with `dotnet tool install` instead.

**Skipping `--scale`.** Without `--scale`, swatches are 1×1 px. A default 16×9 palette outputs a 16×9 pixel PNG — visually unusable in art software. Always pass `--scale 12` or higher for human-facing files.

**Setting both `--saturation` and `--brightness` above 1.0.** The Slynyrd polynomial curves are calibrated to avoid the high-saturation + high-brightness combination. Multipliers above 1.0 override that safety and produce uncomfortable, unworkable colors.

**Generating too many ramps over a narrow spectrum.** `--num-ramps 16 --hue-spectrum 30` packs 16 ramps into 30°, making adjacent ramps nearly indistinguishable. Match ramp count to the available spectrum width.

**Removing the desaturated ramp.** The desaturated variants (generated by default) are critical for shadows, backgrounds, and transitions. Disabling them (`--desaturate 0`) reduces palette cohesion.

**Not pinning the tool version.** In team or CI environments, always pin `--version 1.1.0` (or the project's chosen version) in `dotnet-tools.json`.
