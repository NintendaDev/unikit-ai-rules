---
version: 1.0.0
---

# GodotEnv

> **Scope**: Environment management for Godot 4 .NET projects — installing and switching Godot versions, managing asset library addons via `addons.json`, configuring the `GODOT` environment variable symlink, and integrating GodotEnv into CI/CD pipelines.
> **Load when**: installing or switching Godot versions, managing project addons, setting up the `GODOT` environment variable, configuring `addons.json`, integrating GodotEnv into CI/CD, onboarding new team members, troubleshooting version or addon resolution issues.

---

## Core Concepts

**GodotEnv** is a cross-platform .NET global tool (`Chickensoft.GodotEnv`) that manages Godot engine installations and Godot asset library addons for a project.

**Symlink** — GodotEnv creates a persistent symlink that always points to the active Godot installation. The `GODOT` environment variable points to this symlink and never changes path; only the symlink target changes when switching versions.

**Version inference** — GodotEnv auto-detects the required Godot version by walking up the directory tree. Precedence order (highest to lowest):
1. `global.json` with `Godot.NET.Sdk` in `msbuild-sdks`
2. `.csproj` with a versioned `Godot.NET.Sdk` as Project SDK
3. `.godotrc` (first line = version string)

For Godot 4 .NET projects, always use `global.json` — it is the highest-priority source and the most explicit.

**Flat addon dependency graph** — GodotEnv resolves addon dependencies without nesting. All addons are declared in a single `addons.json`; GodotEnv recursively checks cached addons for their own `addons.json` files and warns on conflicts.

---

## Installation

```bash
# Install GodotEnv as a global .NET tool (run once per machine)
dotnet tool install --global Chickensoft.GodotEnv
```

Requires .NET 8 SDK (recommended for Godot 4.x). Install .NET 6/7/8 SDKs for broad compatibility.

---

## CLI Commands

### Godot version management

```bash
# Install Godot — version inferred from global.json / .csproj / .godotrc
godotenv godot install

# Install a specific version (with .NET support by default)
godotenv godot install 4.2.0

# Install a standard (non-.NET) build
godotenv godot install 4.2.0 --no-dotnet

# Switch the active symlink to a specific version
godotenv godot use 4.2.0

# Switch to the inferred version
godotenv godot use

# List locally installed versions
godotenv godot list

# List available remote versions
godotenv godot list --remote

# Pin the required version for the current project (writes version file)
godotenv godot pin

# Set up the GODOT environment variable and PATH entries
godotenv godot env setup
```

After running `godotenv godot env setup`, **log out and log back in** — a terminal restart is insufficient for the `GODOT` variable to propagate to all applications.

### Addon management

```bash
# Install all addons declared in addons.json
godotenv addons install

# List installed addons
godotenv addons list
```

Always run `godotenv addons install` after cloning the project or after any change to `addons.json`.

---

## Configuration Files

### `global.json` — Godot version for .NET projects

```json
{
  "msbuild-sdks": {
    "Godot.NET.Sdk": "4.2.0"
  }
}
```

Place at the project root. This is the authoritative version source for Godot 4 .NET projects. Always commit to version control.

### `addons.json` — addon dependencies

```jsonc
{
  "cache": ".addons/",      // GodotEnv download cache — add to .gitignore
  "path": "addons/",        // destination folder (committed to git)
  "addons": [
    {
      // Git addon pinned to a tag (preferred for reproducibility)
      "path": "some_addon",
      "url": "https://github.com/someone/some-addon.git",
      "tag": "v1.0.0"
    },
    {
      // Git addon on a branch (non-deterministic — avoid for production)
      "path": "another_addon",
      "url": "https://github.com/someone/another-addon.git",
      "branch": "main"
    },
    {
      // Local symlink (useful for development of addons alongside the project)
      "path": "local_addon",
      "url": "file:///absolute/path/to/local/addon"
    }
  ]
}
```

Always commit `addons.json` to version control. Add `.addons/` to `.gitignore`.

### `.addons/.gdignore` — hide cache from Godot editor

Create an empty `.gdignore` file inside `.addons/`. Without it, Godot parses cached addon copies and reports duplicate class name errors.

```bash
# Create the file after the cache directory is created
touch .addons/.gdignore
```

### `.godotrc` — legacy version file (avoid for .NET projects)

Single-line file containing the Godot version string. Only used when `global.json` and `.csproj` are absent. `global.json` takes priority — do not use both.

---

## Patterns & Examples

### First-time project setup (team member onboarding)

```bash
git clone <project-repo>
cd <project>

# Install the correct Godot version (read from global.json)
godotenv godot install

# Switch the symlink to the installed version
godotenv godot use

# Install addons declared in addons.json
godotenv addons install

# Restore NuGet packages
dotnet restore
```

### Switching Godot versions between projects

```bash
# Switch to the version required by the current project
godotenv godot use     # reads global.json / .csproj / .godotrc

# Or switch explicitly
godotenv godot use 4.1.3
```

### Typical project directory structure

```
MyProject/
├── global.json          # Godot version (committed)
├── addons.json          # Addon dependencies (committed)
├── project.godot        # Godot project file (committed)
├── MyProject.sln
├── MyProject.csproj
├── addons/              # Installed addon source (committed)
├── .addons/             # GodotEnv download cache (gitignored)
│   └── .gdignore        # Prevents editor from parsing cache
└── .gitignore           # Must include: .addons/, bin/, obj/
```

### CI/CD with GitHub Actions

Use Chickensoft's `setup-godot` action instead of raw GodotEnv in CI:

```yaml
- name: Setup Godot
  uses: chickensoft-games/setup-godot@v1
  with:
    version: 4.2.0
    dotnet: true
    cache: true         # Caches the Godot installation between runs
```

`setup-godot` provides built-in caching, installs export templates, and works on Windows, macOS, and Linux runners. Use raw GodotEnv for local development; `setup-godot` for CI.

### Build sequence (local and CI)

```bash
godotenv godot install                              # Ensure correct Godot is installed
dotnet restore                                     # Restore NuGet packages
godot --headless --build-solutions --quit          # Generate C# solution
dotnet build                                       # Build .NET project
```

---

## Best Practices

- **Always use `global.json` for version specification** in Godot 4 .NET projects — it is the highest-priority source and the most explicit.
- **Pin addons to Git tags**, not branches. Branches are mutable; tags give reproducible builds.
- **Commit `global.json` and `addons.json`** to version control so all team members and CI use the same versions.
- **Add `.addons/` to `.gitignore`** — it is a local download cache, not source.
- **Create `.addons/.gdignore`** immediately after the cache directory is created to prevent editor errors.
- **Never modify files inside `addons/` manually** for addons managed by GodotEnv. Changes will be overwritten on the next `godotenv addons install` run.
- **Use `$GODOT` (the environment variable) in scripts and IDE launch configurations** instead of hardcoded paths — it always points to the active version via the symlink.
- **For CI/CD, prefer `chickensoft-games/setup-godot`** over raw GodotEnv — it provides caching, export templates, and is faster.

---

## Anti-patterns

- **Not logging out/in after `godotenv godot env setup`**: a terminal restart does not propagate `GODOT` to all applications; a full logout/login is required.
- **Using branch references in `addons.json`** instead of tags: branches change, producing non-deterministic builds.
- **Missing `.addons/.gdignore`**: Godot editor parses cached addon files and reports duplicate class names.
- **Running `godotenv addons install` in CI without caching**: installs are slow on every run. Use `setup-godot` with `cache: true` in GitHub Actions instead.
- **Committing `.addons/` to version control**: it is a download cache. Only `addons/` (installed addon source) and `addons.json` (declarations) should be committed.
- **Hardcoding Godot paths in shell scripts**: use `$GODOT` so scripts work on every developer's machine.
- **Manually editing `.zshrc` / `.bashrc` entries added by GodotEnv**: conflicts with GodotEnv's own updates. Let GodotEnv manage those lines.
- **Using `.godotrc` alongside `global.json`**: `global.json` wins; `.godotrc` is silently ignored, creating confusion.
- **On Windows, running GodotEnv without allowing the UAC prompt**: symlink creation requires administrator privileges; deny the prompt and GodotEnv will fail.
