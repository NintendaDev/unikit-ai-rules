---
version: 1.0.0
---

# Unreal Automation Tool (UAT)

> **Scope**: Unreal Automation Tool — RunUAT, BuildCookRun pipeline, cooking, packaging, staging, deploying, custom C# automation commands, BuildGraph scripting, CI/CD integration
> **Load when**: scripting build, cook, stage, package and deploy pipelines through Unreal Automation Tool — invoking RunUAT BuildCookRun with the right flags, writing custom .Automation.csproj BuildCommand subclasses, authoring BuildGraph XML scripts, and wiring shipping or CI/CD packaging

---

## Core Concepts

Unreal Automation Tool (UAT) is a C# host program and a set of utility libraries for scripting unattended processes related to Unreal Engine. Epic uses it internally for building, cooking, packaging, running games, running automation tests, and scripting build farm operations.

**Key distinction from UBT:** UBT (Unreal Build Tool) handles C++ compilation via `Build.cs` / `Target.cs`. UAT orchestrates the higher-level pipeline — build, cook, stage, package, deploy, run.

**Entry point:** `Engine/Build/BatchFiles/RunUAT.bat` (Windows), `RunUAT.sh` (Linux/Mac)

**Basic syntax:**
```bash
RunUAT.bat <Command> -<Parameter>=<Value> -<Flag>
```

**Pipeline stages (BuildCookRun):**
1. **Build** — compile executables for the selected platform
2. **Cook** — convert assets to runtime platform formats, compile shaders, strip editor data
3. **Stage** — copy executables and cooked content to a standalone staging directory
4. **Package** — wrap into the platform's native distribution format
5. **Deploy** — push the build to a target device
6. **Run** — launch the packaged project on the target platform

---

## BuildCookRun Command

The primary UAT command for packaging. Combines all pipeline stages.

### Minimal Examples

```bash
# Development build for Win64
RunUAT.bat BuildCookRun -project="D:\MyProject\MyProject.uproject" -platform=Win64 -clientconfig=Development -build -cook -stage -pak

# Shipping build with archive
RunUAT.bat BuildCookRun -project="MyProject.uproject" -platform=Win64 -clientconfig=Shipping -build -cook -stage -pak -archive -archivedirectory="D:\Builds\Output"

# Skip build, cook only
RunUAT.bat BuildCookRun -project="MyProject.uproject" -platform=Win64 -clientconfig=Development -cook -skipcook=false

# Iterative cook (UE 5.6+) — reuse most recent cooked data as baseline
RunUAT.bat BuildCookRun -project="MyProject.uproject" -platform=Win64 -cookincremental
```

### Project Configuration

| Parameter | Purpose |
|-----------|---------|
| `-project=<Path>` | Path to `.uproject` file (**required**) |
| `-platform=<Name>` | Target platform: `Win64`, `Linux`, `Mac`, `Android`, `IOS` |
| `-clientconfig=<Config>` | Build configuration: `Debug`, `DebugGame`, `Development`, `Test`, `Shipping` |
| `-serverconfig=<Config>` | Server build configuration |
| `-map=<MapName>` | Specific map to cook; defaults to `DefaultMap` from `DefaultEngine.ini` |

### Build Flags

| Parameter | Purpose |
|-----------|---------|
| `-build` | Execute build (compile) step |
| `-clean` | Delete intermediate files and previous cooked/staged data before building |
| `-noxge` | Disable XGE (IncrediBuild) acceleration |
| `-ForceMonolithic` | Combine output into a single executable |
| `-ForceDebugInfo` | Force debug info in Development builds |
| `-ForceNonUnity` | Disable unity build |
| `-ForceUnity` | Force unity build |
| `-UbtArgs=<Args>` | Pass extra arguments to UBT |

### Cooking Flags

| Parameter | Purpose |
|-----------|---------|
| `-cook` | Execute cook step |
| `-skipcook` | Assume cooked data is current — skip cooking |
| `-cookincremental` | Incremental cook from most recent cooked data (UE 5.6+) |
| `-snapshot` | Fetch latest snapshot for incremental cooking (UE 5.6+) |
| `-cookonthefly` | Cook on the fly from a cook server — fast iteration |
| `-CookAll` | Cook entire Content directory |
| `-CookMapsOnly` | Restrict cooking to maps only |
| `-CookPartialgc` | GC packages during cooking, not after completion |
| `-SkipCookingEditorContent` | Exclude `/Engine/Editor` content |
| `-FastCook` | Use accelerated cooking when available |
| `-IgnoreCookErrors` | Continue despite cook failures |
| `-unversioned` | Save cooked packages without versioning |

### Packaging & Distribution

| Parameter | Purpose |
|-----------|---------|
| `-package` | Package for target platform |
| `-distribution` | Package for commercial release (store signing) |
| `-pak` | Bundle content into `.pak` files |
| `-signpak=<keys>` | Sign `.pak` with encryption keys; implies `-signedpak` |
| `-signed` | Designate signed PAK usage |
| `-compressed` | Compress packages |

### Staging & Archiving

| Parameter | Purpose |
|-----------|---------|
| `-stage` | Stage build to a standalone directory |
| `-skipstage` | Assume staged files exist — skip staging |
| `-stagingdirectory=<Path>` | Staging destination path |
| `-archive` | Archive build output |
| `-archivedirectory=<Path>` | Archive destination path |
| `-nocleanstage` | Skip staging directory cleanup before staging |
| `-createappbundle` | Package Mac builds as `.app` bundles |

### Deployment & Execution

| Parameter | Purpose |
|-----------|---------|
| `-deploy` | Deploy to target device |
| `-device=<Device>` | Target specific device(s) |
| `-run` | Run project after building |
| `-dedicatedserver` | Build and run client and server |
| `-client` | Run client alongside server |
| `-noclient` | Run server only, no client |
| `-numclients=<N>` | Launch N additional client instances (N≥2) |
| `-nullrhi` | Run with null RHI (no rendering) — useful for servers/tests |

### Testing

| Parameter | Purpose |
|-----------|---------|
| `-RunAutomationTests` | Execute automation test suite |
| `-editortest` | Run in editor mode instead of standalone client |
| `-RunTimeoutSeconds=<N>` | Execution timeout |

### Advanced

| Parameter | Purpose |
|-----------|---------|
| `-unattended` | No operator present — auto-terminate dialogs |
| `-manifests` | Generate streaming install manifests |
| `-createchunkinstall` | Create streaming data from manifests |
| `-separatedebuginfo` | Output debug info to separate directory |
| `-nodebuginfo` | Exclude debug files from output |
| `-MapFile` | Generate `.map` files |
| `-ue4exe=<Name>` | Override editor executable name |
| `-cmdline=<Args>` | Insert custom command line into `UE4CommandLine.txt` |
| `-addcmdline=<Args>` | Append additional arguments |

---

## Global UAT Parameters

These apply to any UAT command, not just BuildCookRun.

| Parameter | Purpose |
|-----------|---------|
| `-verbose` | Detailed logging output |
| `-nop4` | Disable Perforce integration (default off build machines) |
| `-p4` | Enable Perforce integration |
| `-compile` | Dynamically compile all commands before execution |
| `-compileonly` | Compile commands without executing |
| `-nocompile` | Skip compilation of `.Automation.csproj` files at startup |
| `-forcelocal` | Force local execution mode |
| `-help` | Display help for a specific command |
| `-list` | List all available commands |
| `-submit` | Permit file submission |
| `-nosubmit` | Prevent submission |
| `-nokill` | Preserve spawned processes on exit |
| `-ignorejunk` | Prevent UBT junk file cleanup |
| `-UseLocalBuildStorage` | Use local storage instead of `P:\Builds` for testing |

---

## Other Built-in Commands

Use `RunUAT.bat -List` to see all 80+ available commands.

| Command | Purpose |
|---------|---------|
| `BuildEditor` | Compile the editor for a project |
| `BuildGame` | Compile game code for specified platforms/configurations |
| `BuildTarget` | Generic build command with more options |
| `BuildPlugin` | Build a plugin for distribution |
| `BuildDerivedDataCache` | Pre-populate the DDC |
| `CookTarget` | Cook content without building |
| `StageTargetCommand` | Stage without building or cooking |
| `BuildGraph` | Execute a BuildGraph XML script |

Get help for any command:
```bash
RunUAT.bat BuildGame -Help
```

---

## Custom Automation Commands (C#)

UAT discovers all `.Automation.csproj` projects, compiles them, and uses reflection to find classes derived from `BuildCommand`.

### Setup Requirements

- **Naming:** project must end with `.Automation` (e.g., `MyTool.Automation.csproj`)
- **Framework:** targets .NET 6.0
- **Location:** place in project's `Build/` directory (sibling to `.uproject`), in a directory listed in `<UE_ROOT>/UE5Game.uprojectdirs`
- **Restriction:** cannot be in folders containing `.Build.cs` or `.Target.cs` files
- **Engine:** requires source build (not Launcher/installed)

### Class Structure

```csharp
using AutomationTool;

[Help("MyCommand", "Description of what this command does")]
[Help("ParamName", "Description of the parameter")]
public class MyCommand : BuildCommand
{
    public override void ExecuteBuild()
    {
        // ParseParam("FlagName") — bool flag (-FlagName)
        bool verbose = ParseParam("Verbose");

        // ParseParamValue("Name") — string value (-Name=Value)
        string output = ParseParamValue("Output");

        // ParseParamInt("Name") — integer value (-Name=42)
        int count = ParseParamInt("Count");

        LogInformation("Running MyCommand with count={0}", count);

        // Your automation logic here
    }
}
```

### Running

```bash
RunUAT.bat MyCommand -Verbose -Output="D:\Results" -Count=10
```

The command name matches the class name.

### Multiple Commands Per Invocation

```bash
RunUAT.bat Command1 -Arg1 -Arg2 Command2 -Arg1
```

Parameters bind to the nearest preceding command.

---

## BuildGraph

BuildGraph is a script-based build automation system integrated into the UAT pipeline. It uses XML scripts to define a dependency graph of build operations.

### Core Elements

| Element | Purpose |
|---------|---------|
| **Task** | Individual action (compile, cook, copy, etc.) |
| **Node** | Named sequence of ordered tasks producing outputs |
| **Agent** | Group of nodes executed on the same machine (for distributed builds; no effect locally) |
| **Trigger** | Container requiring manual intervention before execution |
| **Aggregate** | Named alias for a group of nodes and outputs |

### XML Script Structure

```xml
<?xml version='1.0' ?>
<BuildGraph xmlns="https://www.epicgames.com/BuildGraph"
  xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="https://www.epicgames.com/BuildGraph ../Schema.xsd">

  <!-- Options (runtime parameters) -->
  <Option Name="ProjectPath" DefaultValue="" Description="Path to .uproject file"/>
  <Option Name="DoClean" Restrict="true|false" DefaultValue="false" Description="Clean before build"/>

  <!-- Agent groups nodes for the same machine -->
  <Agent Name="CompileAgent" Type="CompileWin64">

    <Node Name="Compile Tools">
      <Compile Target="UnrealHeaderTool" Platform="Win64" Configuration="Development" Tag="#ToolBinaries"/>
      <Log Message="Tools compiled successfully" Files="#ToolBinaries"/>
    </Node>

    <Node Name="Compile Game" Requires="Compile Tools">
      <Compile Target="MyGameEditor" Platform="Win64" Configuration="Development" Tag="#EditorBinaries"/>
    </Node>

  </Agent>

  <Agent Name="CookAgent" Type="Win64">
    <Node Name="Cook Content" Requires="Compile Game">
      <!-- Cook tasks here -->
    </Node>
  </Agent>

  <!-- Aggregates create aliases -->
  <Aggregate Name="Full Build" Requires="Compile Game;Cook Content"/>

</BuildGraph>
```

### Options (Parameters)

Define configurable parameters:
```xml
<Option Name="Platform" Restrict="Win64|Linux|Mac" DefaultValue="Win64" Description="Target platform"/>
```

Reference with `$(OptionName)` syntax:
```xml
<Compile Target="MyGame" Platform="$(Platform)" Configuration="Development"/>
```

### Conditional Logic

```xml
<Do If="'$(DoClean)' == 'true'">
  <Delete Files="$(OutputDir)/..."/>
</Do>
```

### Running BuildGraph

```bash
RunUAT.bat BuildGraph -Script="Build/Graph/MyBuild.xml" -Target="Full Build" -set:ProjectPath="D:\MyProject\MyProject.uproject" -set:Platform=Win64
```

### Schema & Examples

- **Schema:** `Engine/Build/Graph/Schema.xsd`
- **Examples:** `Engine/Build/Graph/Examples/` — includes `Macros.xml`, `Properties.xml`, `TagsAndFiles.xml`

---

## Logging

Build logs are stored in platform-specific locations:

| Build Type | Log Location |
|------------|-------------|
| Installed/Launcher | `%APPDATA%\Roaming\Unreal Engine\AutomationTool\Logs\` |
| Source build | `Engine\Programs\AutomationTool\Saved\Logs\` |

Log file prefixes: `UBT-` = UnrealBuildTool, `UHT-` = UnrealHeaderTool.

---

## Best Practices

- Use `-pak` for all shipping builds — loose files are slower and expose content structure
- Use `-stage -stagingdirectory=<Path>` instead of `-stage -archive -archivedirectory=<Path>` to avoid unnecessary file duplication
- Use `-unattended` for CI/CD to auto-dismiss dialogs
- Use `-cookincremental` (UE 5.6+) for faster iteration on cook-heavy projects
- Use `-SkipCookingEditorContent` to reduce cook times when editor content is not needed
- Always specify `-clientconfig=Shipping` for release builds — `Development` config includes debug code
- Use `-nop4` on non-Perforce environments to avoid connection timeouts
- Check exit codes: 0 = success, non-zero = error — capture in CI scripts
- Use `-nocompile` on installed engine builds — source for `.Automation.csproj` is not available
- Run `RunUAT.bat -List` to discover all available commands
- Run `RunUAT.bat <Command> -Help` to see command-specific parameters
- Place custom `.Automation.csproj` projects in the `Build/` directory of your project

## Anti-patterns

- **Using `-clean` on every CI build** — forces full rebuild from scratch. Use incremental builds unless investigating a build issue.
- **Both `-stage` and `-archive` with separate directories** — creates two copies of the same files. Use one or the other: `-stage -stagingdirectory=<Path>` for local builds, `-archive -archivedirectory=<Path>` for archival.
- **`-IgnoreCookErrors` in shipping pipelines** — masks real asset problems. Use only for debugging cook issues locally.
- **Forgetting `-pak` in shipping builds** — loose cooked files are slow, expose asset structure, and may not work on all platforms.
- **`-nocompile` on source builds** — tells UAT not to compile its own projects; on source builds UAT needs to compile itself first. Use `-nocompile` only on installed/Launcher engine.
- **Not specifying `-platform`** — defaults may not match your target. Always be explicit.
- **`-CookAll` for iteration** — cooks entire Content directory regardless of what changed. Use default cooking (referenced assets only) or `-cookincremental` for faster iteration.
- **Running multiple UAT instances simultaneously** — causes file access conflicts. Serialize UAT invocations in CI pipelines.
