---
version: 1.0.0
---

# MetaSounds

> **Scope**: MetaSounds plugin authoring in UE5 — DSP graph architecture, asset types (Source, Patch, Preset), runtime parameter control from C++ and Blueprint, custom C++ node creation, execution model (render blocks, constructor pins, triggers), performance tuning, and integration with UAudioComponent.
> **Load when**: authoring MetaSound Sources or Patches, creating custom MetaSound nodes in C++, setting MetaSound parameters at runtime from C++ or Blueprint, tuning MetaSound performance, wiring audio events to gameplay logic, debugging MetaSound parameter updates not taking effect.

---

## Core Concepts

MetaSounds is a UE5 audio plugin that gives sound designers full control over DSP graph generation. Unlike Blueprint, MetaSounds uses a **flow graph** (signal/data flow), not an execution graph — wires carry data values or audio buffers, not execution pulses.

**Asset types:**

| Type | Purpose | Plays standalone |
|------|---------|-----------------|
| `MetaSound Source` | Standalone audio-generating asset, subclass of `USoundBase` | Yes |
| `MetaSound Patch` | Encapsulated, reusable sub-graph for embedding in other MetaSounds | No |
| `MetaSound Preset` | Read-only inherited graph from a parent, with overridable Input defaults | Yes (via parent) |

Use **Presets** when you need multiple variations of the same graph with different parameter defaults — avoids graph duplication and automatically reflects parent changes.

Use **Patches** to encapsulate reusable DSP sub-graphs (e.g., a shared reverb tail or randomized wave player).

## Execution Model

MetaSounds process audio in **render blocks** (not per-frame):

- Default block rate: `100` blocks/second (configurable via `au.MetaSound.BlockRate`).
- All nodes in the graph execute each block; outputs accumulate sample-accurately.
- **Trigger pins** (special type) carry sample-accurate events — fire at a specific sample within a block, not at block boundaries.

**Constructor Pins (diamond-shaped connectors):**
- Evaluated **once** at graph initialization, never updated afterwards.
- Cheapest pin type — the graph optimizer can constant-fold them.
- Use for fixed structural parameters: max delay buffer size, channel count, sample rate, etc.
- Do **not** use for values you intend to change at runtime.

**Input Pins (regular):**
- Re-evaluated each render block.
- Can be driven from external C++/Blueprint parameter calls.
- Must be declared as **Inputs** in the graph to be externally controllable (see below).

## Runtime Parameter Control

Parameters must be declared as **Inputs** in the MetaSound graph. MetaSound **Variables** are internal to the graph and cannot be set externally.

Access is via `UAudioComponent`, which implements `IAudioParameterControllerInterface`:

```cpp
// AudioComponent must be in active playback state when calling these.
UAudioComponent* AudioComp = /* ... */;

AudioComp->SetFloatParameter(FName("Pitch"), 1.5f);
AudioComp->SetBoolParameter(FName("IsUnderwater"), true);
AudioComp->SetIntParameter(FName("SurfaceType"), 2);
AudioComp->SetTriggerParameter(FName("OnImpact")); // fires a trigger input
```

The same methods are exposed as Blueprint nodes (`Set Float Parameter`, `Set Bool Parameter`, `Execute Trigger Parameter`, etc.).

**Wave asset arrays** — `Set Wave Parameter` is unreliable. Instead:
1. Expose an `int32` Input (`WaveIndex`) and a wave array reference baked into the graph.
2. Or use `SetObjectArrayParameter(FName("WavePool"), WaveArray)` with an integer index input to select within the graph.

**Key rules:**
- Call parameter setters only when the AudioComponent is **actively playing**. Calls on a stopped component are silently ignored.
- Triggering via `SetTriggerParameter` sends an event into the MetaSound graph that fires a trigger-typed Input node.
- Blueprint-side: use the `AudioParameterControllerInterface` nodes rather than casting to the audio component directly.

## Custom C++ Node Authoring

Custom nodes are registered at module startup and become available in the MetaSound editor.

### Module Dependencies (`Build.cs`)

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "Core",
    "MetasoundFrontend",
    "MetasoundGraphCore",
});

PrivateDependencyModuleNames.AddRange(new string[]
{
    "CoreUObject",
    "Engine",
    "MetasoundEngine",
    "AudioMixer",
    "SignalProcessing",
});
```

> Do not add `MetasoundEditor` to runtime modules — it is an editor-only module.

### Required Headers

```cpp
#include "MetasoundExecutableOperator.h"               // TExecutableOperator
#include "MetasoundPrimitives.h"                       // FFloatReadRef, FFloatWriteRef, etc.
#include "MetasoundNodeRegistrationMacro.h"            // METASOUND_REGISTER_NODE, METASOUND_LOCTEXT
#include "MetasoundStandardNodesNames.h"               // StandardNodes namespace
#include "MetasoundFacade.h"                           // FNodeFacade
#include "MetasoundParamHelper.h"                      // METASOUND_PARAM macros
// UE 5.7+:
#include "MetasoundFrontendModuleRegistrationMacros.h" // METASOUND_REGISTER_ITEMS_IN_MODULE
```

### Common Data Types

| Concept | ReadRef | WriteRef |
|---------|---------|----------|
| Float | `FFloatReadRef` | `FFloatWriteRef` |
| Int32 | `FInt32ReadRef` | `FInt32WriteRef` |
| Bool | `FBoolReadRef` | `FBoolWriteRef` |
| Trigger | `FTriggerReadRef` | `FTriggerWriteRef` |
| Audio buffer | `FAudioBufferReadRef` | `FAudioBufferWriteRef` |
| String | `FStringReadRef` | `FStringWriteRef` |

### Full Node Structure Example

```cpp
// MyMetaSoundNode.cpp — can be a single .cpp file dropped into a module.

#include "MetasoundExecutableOperator.h"
#include "MetasoundPrimitives.h"
#include "MetasoundNodeRegistrationMacro.h"
#include "MetasoundStandardNodesNames.h"
#include "MetasoundFacade.h"
#include "MetasoundParamHelper.h"

namespace Metasound
{
    // --- Step 1: Declare parameter names and tooltips ---
    namespace MyNodeNames
    {
        METASOUND_PARAM(InputA, "A", "First input value.");
        METASOUND_PARAM(InputB, "B", "Second input value.");
        METASOUND_PARAM(OutputSum, "Sum", "Sum of A and B.");
    }

    // --- Step 2: Implement the operator ---
    class FMyAddOperator : public TExecutableOperator<FMyAddOperator>
    {
    public:
        // Declare vertex interface (inputs/outputs)
        static const FVertexInterface& DeclareVertexInterface()
        {
            using namespace MyNodeNames;
            static const FVertexInterface Interface(
                FInputVertexInterface(
                    TInputDataVertex<float>(METASOUND_GET_PARAM_NAME_AND_METADATA(InputA)),
                    TInputDataVertex<float>(METASOUND_GET_PARAM_NAME_AND_METADATA(InputB))
                ),
                FOutputVertexInterface(
                    TOutputDataVertex<float>(METASOUND_GET_PARAM_NAME_AND_METADATA(OutputSum))
                )
            );
            return Interface;
        }

        // Node metadata (name, version, description, keywords)
        static const FNodeClassMetadata& GetNodeInfo()
        {
            auto CreateNodeClassMetadata = []() -> FNodeClassMetadata
            {
                FVertexInterface NodeInterface = DeclareVertexInterface();
                FNodeClassMetadata Metadata
                {
                    FNodeClassName { StandardNodes::Namespace, "My Add Node", StandardNodes::AudioVariant },
                    1,   // Major Version
                    0,   // Minor Version
                    METASOUND_LOCTEXT("MyAddNodeDisplayName", "Add (My)"),
                    METASOUND_LOCTEXT("MyAddNodeDesc", "Adds two float values."),
                    PluginAuthor,
                    PluginNodeMissingPrompt,
                    NodeInterface,
                    { },                                                          // Category hierarchy
                    { METASOUND_LOCTEXT("MyAddNodeKeyword", "Math") },            // Keywords
                    FNodeDisplayStyle{}
                };
                return Metadata;
            };
            static const FNodeClassMetadata Metadata = CreateNodeClassMetadata();
            return Metadata;
        }

        // Constructor — receives resolved ReadRefs from input data
        FMyAddOperator(const FFloatReadRef& InA, const FFloatReadRef& InB)
            : InputA(InA)
            , InputB(InB)
            , OutputSum(FFloatWriteRef::CreateNew(*InA + *InB))
        {}

        // Bind inputs to the graph's data reference collection
        virtual FDataReferenceCollection GetInputs() const override
        {
            using namespace MyNodeNames;
            FDataReferenceCollection Refs;
            Refs.AddDataReadReference(METASOUND_GET_PARAM_NAME(InputA), InputA);
            Refs.AddDataReadReference(METASOUND_GET_PARAM_NAME(InputB), InputB);
            return Refs;
        }

        // Bind outputs
        virtual FDataReferenceCollection GetOutputs() const override
        {
            using namespace MyNodeNames;
            FDataReferenceCollection Refs;
            Refs.AddDataReadReference(METASOUND_GET_PARAM_NAME(OutputSum), OutputSum);
            return Refs;
        }

        // Called every render block — do DSP work here
        void Execute()
        {
            *OutputSum = *InputA + *InputB;
        }

        // Factory — called by the graph builder to instantiate this operator
        static TUniquePtr<IOperator> CreateOperator(
            const FBuildOperatorParams& InParams, FBuildResults& OutErrors)
        {
            using namespace MyNodeNames;
            const FInputVertexInterfaceData& InputData = InParams.InputData;

            FFloatReadRef A = InputData.GetOrCreateDefaultDataReadReference<float>(
                METASOUND_GET_PARAM_NAME(InputA), InParams.OperatorSettings);
            FFloatReadRef B = InputData.GetOrCreateDefaultDataReadReference<float>(
                METASOUND_GET_PARAM_NAME(InputB), InParams.OperatorSettings);

            return MakeUnique<FMyAddOperator>(A, B);
        }

    private:
        FFloatReadRef  InputA;
        FFloatReadRef  InputB;
        FFloatWriteRef OutputSum;
    };

    // --- Step 3: Wrap in a node facade ---
    class FMyAddNode : public FNodeFacade
    {
    public:
        FMyAddNode(const FNodeInitData& InitData)
            : FNodeFacade(InitData.InstanceName, InitData.InstanceID,
                          TFacadeOperatorClass<FMyAddOperator>())
        {}
    };

} // namespace Metasound

// --- Step 4: Register the node ---
METASOUND_REGISTER_NODE(Metasound::FMyAddNode);
```

### Module Registration (UE 5.7+)

In UE 5.7 and later, trigger registration from the module's `StartupModule`:

```cpp
#include "MetasoundFrontendModuleRegistrationMacros.h"

void FMyGameModule::StartupModule()
{
    METASOUND_REGISTER_ITEMS_IN_MODULE;
}

void FMyGameModule::ShutdownModule()
{
    METASOUND_UNREGISTER_ITEMS_IN_MODULE;
}
```

In earlier UE versions, nodes registered via `METASOUND_REGISTER_NODE` are auto-registered at static-init time.

### API Version Changes

| Version | Change |
|---------|--------|
| UE 5.1+ | Types moved into `Metasound::` namespace |
| UE 5.5 | `TInputDataVertexModel` → `TInputDataVertex`; `CreateOperator` param changed from `FCreateOperatorParams` to `FBuildOperatorParams` |
| UE 5.7+ | Module startup requires `METASOUND_REGISTER_ITEMS_IN_MODULE` instead of manual `RegisterPendingNodes()` |

## Performance

**Audio rendering settings:**

| CVar | Default | Usage |
|------|---------|-------|
| `au.MetaSound.BlockRate` | `100` | Blocks/sec. Lower = more latency, less CPU. `28` is practical floor for lower-end targets. |
| `au.MetaSound.EnableAsyncGeneratorBuilder` | `1` (on) | Reduces CPU cost at play, but adds startup latency. Disable (`0`) for time-critical one-shots. |

**Graph design:**
- Keep runtime Input count under ~30; reducing inputs is the single most effective optimization.
- Use **Constructor Pins** for parameters that don't need runtime updates — they are folded to constants.
- Limit compressor and delay nodes to ~1 each per graph; their internal buffers accumulate quickly.
- Reduce compressor lookahead time to minimize latency contribution.
- Prefer a few coarse-grained Inputs over many fine-grained ones; batch state changes into composite parameters (e.g., a single `int32` surface type instead of five bools).

**Asset loading:**
- Enable stream caching in Project Settings (audio) for faster runtime load.
- Use **PCM** (uncompressed) for lowest latency; **ADPCM** (~4× compression) as a balanced choice.
- Avoid decoder formats with per-frame CPU overhead on hot paths.

**Profiling:**
- `stat audio` — quick compression and voice overhead overview.
- `stat startfile` / `stat stopfile` → Unreal Frontend for block-level timing.
- Unreal Insights for detailed frame-level diagnostics.

## Anti-patterns

- **Setting parameters on a stopped component** — `SetFloatParameter` / `SetTriggerParameter` on a non-playing `UAudioComponent` are silently ignored. Ensure the component is in active playback before sending parameters.
- **Using Variables for external control** — MetaSound Variables are graph-internal only. Anything driven from C++ or Blueprint must be an **Input**, not a Variable.
- **Multiple Set nodes for a single Variable** — MetaSounds only allows one Set node per Variable. Multiple setters cause a graph error.
- **Circular connections** — MetaSounds flags loops even when they would not cause infinite recursion at runtime. Use delay-based patterns or Trigger sequencing to achieve feedback-style designs.
- **Setting `WaveAsset` parameters directly** — `Set Wave Parameter` is unreliable. Use `SetObjectArrayParameter` with an integer index input instead.
- **Virtualized sounds dropping parameter updates** — if attenuation or concurrency removes a voice slot (virtualization), subsequent parameter updates are lost. Check concurrency settings and `Play When Silent` if updates must always land.
- **Adding `MetasoundEditor` to runtime Build.cs** — this is an editor-only module and will cause packaging failures.