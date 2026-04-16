version: 1.0.0

# Environment Query System (EQS)

> **Scope**: Unreal Engine's Environment Query System — architecture (Generators, Tests, Contexts), running queries from C++, custom node authoring in C++, Behavior Tree integration, debugging with EQSTestingPawn, and performance tuning.
> **Load when**: authoring EQS queries, creating custom EQS Generators or Tests or Contexts in C++, integrating EQS with Behavior Trees, running EQS queries from AIController, debugging EQS results with EQSTestingPawn, optimizing AI spatial queries.
> **References**: `.unikit/memory/stack/references/eqs-generators.md` (generator catalog), `.unikit/memory/stack/references/eqs-tests.md` (test catalog)

---

## Core Concepts

**Environment Query System (EQS)** is the AI spatial query subsystem in UE5. It answers questions like "where is the best attack position?" or "find nearest cover" by generating candidate **Items** (locations or Actors) and evaluating them through a chain of **Tests**.

Three building blocks:
- **Generator** — produces the set of candidate Items.
- **Test** — filters and/or scores each Item against a **Context**.
- **Context** — a frame of reference (e.g., the querier, the enemy, a custom actor set).

A `UEnvQuery` asset contains one or more **Options** (Generator + Tests). The engine evaluates each Option in order and returns the first Option that produces results. All Tests within an Option share the same Generator's output.

**Execution model**: EQS runs asynchronously with built-in time-slicing (`TimeLimitPerStep`). Results arrive via `FQueryFinishedSignature` delegate. Use `RunInstantQuery` only for trivially cheap queries — it blocks the game thread.

## Enabling EQS

Enable in **Project Settings → AI System → Enable EQS System**. Without this setting, queries silently return no results.

## C++ API

### Declare the query asset

```cpp
UPROPERTY(EditAnywhere, Category = "AI")
TObjectPtr<UEnvQuery> FindCoverQuery;
```

### Execute asynchronously (preferred)

```cpp
void AMyAIController::RunCoverQuery()
{
    FEnvQueryRequest QueryRequest(FindCoverQuery, GetPawn());
    QueryRequest.Execute(EEnvQueryRunMode::SingleResult,
                         this,
                         &AMyAIController::OnCoverQueryFinished);
}

void AMyAIController::OnCoverQueryFinished(TSharedPtr<FEnvQueryResult> Result)
{
    if (Result->IsSuccessful())
    {
        FVector BestLocation = Result->GetItemAsLocation(0);
        MoveToLocation(BestLocation);
    }
}
```

### Run modes (`EEnvQueryRunMode::Type`)

| Mode | Behavior |
|------|----------|
| `SingleResult` | Returns only the single highest-scoring item |
| `RandomBest5Pct` | Returns a random item from the top 5% by score |
| `RandomBest25Pct` | Returns a random item from the top 25% by score |
| `AllMatching` | Returns all items that passed filters, sorted by score |

Use `SingleResult` by default. Use `RandomBest25Pct` when positional variety is needed (patrol points, flanking positions) to prevent multiple agents from converging on the same spot.

### Access results

```cpp
Result->IsSuccessful()              // bool — query completed and returned items
Result->GetItemAsLocation(Index)    // FVector — for point/location items
Result->GetItemAsActor(Index)       // AActor* — for actor items
Result->GetAllAsLocations()         // TArray<FVector>
Result->GetAllAsActors()            // TArray<AActor*>
Result->GetItemScore(Index)         // float [0, 1] — normalized score
```

### Synchronous execution (use sparingly)

```cpp
// Only for cheap queries without Pathfinding or Trace tests
UEnvQueryManager* Manager = UEnvQueryManager::GetCurrent(GetWorld());
TSharedPtr<FEnvQueryResult> Result = Manager->RunInstantQuery(
    FEnvQueryRequest(FindCoverQuery, GetPawn()),
    EEnvQueryRunMode::SingleResult);
```

### Required includes

```cpp
#include "EnvironmentQuery/EnvQueryManager.h"
#include "EnvironmentQuery/EnvQueryTypes.h"
```

## Behavior Tree Integration

Use the built-in `Run EQS Query` task (`UBTTask_RunEQSQuery`). Key properties:

| Property | Description |
|----------|-------------|
| `QueryTemplate` | The `UEnvQuery` asset to execute |
| `Blackboard Key` | Key that receives the result (Vector or Object/Actor) |
| `Run Mode` | `EEnvQueryRunMode` — SingleResult, RandomBest5Pct, RandomBest25Pct, AllMatching |
| `EQS Request` (`FEQSParametrizedQueryExecutionRequest`) | Allows runtime parameter overrides via Blackboard |
| `bUpdateBBOnFail` | Whether to update the Blackboard key even when the query fails |

The result (location or actor) is written to the Blackboard key and becomes available to subsequent tasks (e.g., `Move To`).

## Custom Contexts

Extend `UEnvQueryContext`. Override `ProvideContext()` to supply actors or locations as custom reference points.

```cpp
// MyQueryContext.h
UCLASS()
class MYGAME_API UMyQueryContext : public UEnvQueryContext
{
    GENERATED_BODY()
public:
    virtual void ProvideContext(FEnvQueryInstance& QueryInstance,
                                FEnvQueryContextData& ContextData) const override;
};

// MyQueryContext.cpp
#include "EnvironmentQuery/EnvQueryTypes.h"
#include "EnvironmentQuery/Items/EnvQueryItemType_Actor.h"
#include "EnvironmentQuery/Items/EnvQueryItemType_Point.h"

void UMyQueryContext::ProvideContext(FEnvQueryInstance& QueryInstance,
                                     FEnvQueryContextData& ContextData) const
{
    AActor* OwnerActor = Cast<AActor>(QueryInstance.Owner.Get());
    AMyAIController* AICon = OwnerActor
        ? Cast<AMyAIController>(OwnerActor->GetInstigatorController())
        : nullptr;

    if (AICon && AICon->GetTargetActor())
    {
        // Single actor
        UEnvQueryItemType_Actor::SetContextHelper(ContextData, AICon->GetTargetActor());
    }
}
```

**Context helper overloads:**

```cpp
UEnvQueryItemType_Actor::SetContextHelper(ContextData, SingleActor);     // single AActor*
UEnvQueryItemType_Actor::SetContextHelper(ContextData, ActorArray);      // TArray<AActor*>
UEnvQueryItemType_Point::SetContextHelper(ContextData, SingleLocation);  // single FVector
UEnvQueryItemType_Point::SetContextHelper(ContextData, LocationArray);   // TArray<FVector>
```

Always prefer C++ contexts over `EnvQueryContext_BlueprintBase` — Blueprint contexts run slower and introduce per-query overhead.

## Custom Generators

Extend `UEnvQueryGenerator_ProjectedPoints` for location-based generators. Use `FAIDataProviderFloatValue` / `FAIDataProviderIntValue` for editor-bindable parameters.

```cpp
// MyEQSGenerator.h
UCLASS(EditInlineNew, meta=(DisplayName="My Offset Grid"))
class MYGAME_API UMyEQSGenerator : public UEnvQueryGenerator_ProjectedPoints
{
    GENERATED_BODY()
public:
    UMyEQSGenerator();

    UPROPERTY(EditAnywhere, Category = "Generator")
    FAIDataProviderFloatValue Radius;

    UPROPERTY(EditAnywhere, Category = "Generator")
    TSubclassOf<UEnvQueryContext> GenerateAround;

    virtual void GenerateItems(FEnvQueryInstance& QueryInstance) const override;
    virtual FText GetDescriptionTitle() const override;
    virtual FText GetDescriptionDetails() const override;
};

// MyEQSGenerator.cpp
void UMyEQSGenerator::GenerateItems(FEnvQueryInstance& QueryInstance) const
{
    // Bind data-provider values before reading them
    Radius.BindData(QueryInstance.Owner.Get(), QueryInstance.QueryID);
    const float RadiusValue = Radius.GetValue();

    // Resolve context to one or more center locations
    TArray<FVector> ContextLocations;
    QueryInstance.PrepareContext(GenerateAround, ContextLocations);

    TArray<FNavLocation> NavLocations;
    NavLocations.Reserve(ContextLocations.Num() * 8);

    for (const FVector& ContextLoc : ContextLocations)
    {
        // Build FNavLocation entries and add to NavLocations ...
        NavLocations.Add(FNavLocation(ContextLoc + FVector(RadiusValue, 0, 0)));
        // ...
    }

    // Project onto NavMesh, remove invalid points, then store results
    ProjectAndFilterNavPoints(NavLocations, QueryInstance);
    StoreNavPoints(NavLocations, QueryInstance);
}
```

Always implement `GetDescriptionTitle()` and `GetDescriptionDetails()` — they provide the readable label shown in the EQS editor graph.

## Custom Tests

Extend `UEnvQueryTest`. Name the class with the `UEnvQueryTest_` prefix — it is automatically stripped in the editor UI.

```cpp
// EnvQueryTest_InSight.h
UCLASS()
class MYGAME_API UEnvQueryTest_InSight : public UEnvQueryTest
{
    GENERATED_BODY()
public:
    UEnvQueryTest_InSight();
    virtual void RunTest(FEnvQueryInstance& QueryInstance) const override;
    virtual FText GetDescriptionTitle() const override;
    virtual FText GetDescriptionDetails() const override;

    UPROPERTY(EditDefaultsOnly, Category = "Test")
    TSubclassOf<UEnvQueryContext> SightContext;
};

// EnvQueryTest_InSight.cpp
UEnvQueryTest_InSight::UEnvQueryTest_InSight()
{
    // Specify which item type this test can handle
    ValidItemType = UEnvQueryItemType_ActorBase::StaticClass();
    // Declare test cost so EQS can order it correctly relative to other tests
    Cost = EEnvTestCost::High;
}

void UEnvQueryTest_InSight::RunTest(FEnvQueryInstance& QueryInstance) const
{
    // ItemIterator handles time-slicing and early termination
    // Construct it exactly ONCE per RunTest call
    for (FEnvQueryInstance::ItemIterator It(this, QueryInstance); It; ++It)
    {
        AActor* ItemActor = GetItemActor(QueryInstance, It.GetIndex());
        const bool bPassed = ItemActor != nullptr; // replace with actual logic

        // SetScore(TestPurpose, FilterType, float score 0..1, bool pass)
        It.SetScore(TestPurpose, FilterType, bPassed ? 1.0f : 0.0f, true);
    }
}
```

**Critical rules for `RunTest`:**
- `FEnvQueryInstance::ItemIterator` must be constructed **exactly once** per `RunTest()` call.
- For batch pre-processing before the loop, call `It.IgnoreTimeLimit()` first to prevent premature abort.
- Set `Cost` accurately: `EEnvTestCost::Low` / `Medium` / `High` — EQS uses it to order test execution.

## EQS Node Lookup Workflow

1. **Choose a Generator** → open `.unikit/memory/stack/references/eqs-generators.md` for the built-in type catalog and parameters.
2. **Choose Tests** → open `.unikit/memory/stack/references/eqs-tests.md` for test types, scoring modes, and filter settings.
3. **Do NOT guess parameter names** — always check the reference files.

## EQS Testing Pawn

Use `AEQSTestingPawn` (or a Blueprint subclass of it) to visualize query results live in the editor.

**Setup:**
1. Create a Blueprint subclass of `EQSTestingPawn`.
2. Place it in the level.
3. Set `QueryTemplate` to your query asset.
4. Select the pawn in the Viewport — debug spheres appear at each candidate item.

**Debug color key:**
- **Green → Red** gradient: item score (green = high score = most desirable).
- **Blue**: item failed a filter test.
- Number shown = final weighted score.

**Warning**: EQSTestingPawn is CPU-intensive. **Always clear the `QueryTemplate` property while editing the query** to avoid editor hangs. Re-assign it when you want to re-visualize.

## Best Practices

- **Prefer C++ for Generators, Tests, and Contexts** over Blueprint — Blueprint nodes carry higher per-frame overhead and cannot benefit from the same internal optimization paths.
- **Use `PathfindingBatch` instead of `Pathfinding`** when the item set has more than ~10 candidates — it batches all nav requests and is significantly faster.
- **Keep grid item counts below ~200 per agent.** For a Grid generator, use `SpaceBetween >= 100` in real-time scenarios. Profile with the EQS Debugger.
- **Place cheap tests before expensive ones.** EQS auto-runs filter tests before scoring tests, but within scoring tests it uses `Cost` to order them. Always set `Cost = EEnvTestCost::High` for Pathfinding and Trace.
- **Do not call EQS every Tick.** Use a timer, an event, or a Behavior Tree node interval. Cache the last valid result until the next query completes.
- **Use `SingleResult` mode by default** — it aborts early once the highest-scoring item is found. Switch to `AllMatching` only if you need the full ranked list.
- **Add a `Distance` filter test as the first test** to eliminate out-of-range items before any expensive test runs.

## Anti-patterns

- **Running `Pathfinding` test on large item sets**: Each path check costs ~5 ms. On 100 items = 500 ms stall. Apply a `Distance` filter first to reduce candidates, or switch to `PathfindingBatch`.
- **Blueprint-only contexts and generators**: Acceptable as a quick prototype, but replace with C++ implementations before shipping for real-time AI.
- **Oversized grids**: GridHalfSize=2000, SpaceBetween=50 produces 6,561 items per query — a guaranteed frame freeze. Profile with the EQS Debugger and reduce.
- **Calling `RunInstantQuery` for complex queries**: Synchronous execution blocks the main thread. Reserve it only for queries with no Pathfinding or Trace tests.
- **Constructing `ItemIterator` twice in one `RunTest`**: Only one `ItemIterator` is valid per `RunTest()` call. A second construction produces undefined behavior.
- **Forgetting to enable EQS in Project Settings**: Queries silently return no results when EQS is disabled globally.
- **No NavMesh covering the play area**: `Pathfinding`, `PathfindingBatch`, and `PathingGrid` generator silently fail without a `NavMeshBoundsVolume` that covers the relevant area.
