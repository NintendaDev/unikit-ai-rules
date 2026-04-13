---
version: 1.0.0
---

# Environment Query System (EQS)

> **Scope**: EQS — generators, tests, contexts, query execution from C++, custom nodes, scoring/filtering, Behavior Tree integration, debugging
> **Load when**: building AI spatial queries with the Environment Query System — running UEnvQuery assets via FEnvQueryRequest, authoring custom UEnvQueryGenerator/UEnvQueryTest/UEnvQueryContext subclasses in C++, choosing run modes and scoring/filtering, integrating queries into Behavior Trees via Run EQS Query

---

## Core Concepts

EQS collects data from the environment and scores it to find optimal locations or actors for AI decisions. A query consists of:

1. **Generator** — produces candidate items (points or actors)
2. **Tests** — filter and score each item
3. **Context** — provides reference frames for generators and tests (e.g., querier position, target actor)

EQS queries return items sorted by score (highest first). They integrate with Behavior Trees via the `Run EQS Query` task node or can be executed directly from C++.

> **Note:** EQS is marked as Experimental by Epic. API may change between engine versions.

## C++ Class Hierarchy

```
UEnvQueryNode
├── UEnvQueryGenerator
│   ├── UEnvQueryGenerator_ProjectedPoints
│   │   ├── UEnvQueryGenerator_SimpleGrid
│   │   ├── UEnvQueryGenerator_PathingGrid
│   │   └── UEnvQueryGenerator_Donut
│   ├── UEnvQueryGenerator_ActorsOfClass
│   ├── UEnvQueryGenerator_Composite
│   ├── UEnvQueryGenerator_CurrentLocation
│   └── UEnvQueryGenerator_BlueprintBase
├── UEnvQueryTest
│   ├── UEnvQueryTest_Distance
│   ├── UEnvQueryTest_Trace
│   ├── UEnvQueryTest_Pathfinding
│   ├── UEnvQueryTest_Overlap
│   ├── UEnvQueryTest_Dot
│   ├── UEnvQueryTest_GameplayTags
│   └── UEnvQueryTest_Project
└── UEnvQueryContext
    ├── UEnvQueryContext_Querier
    ├── UEnvQueryContext_BlueprintBase
    └── UEnvQueryContext_NavigationData
```

Required module dependency in `.Build.cs`:
```cpp
PublicDependencyModuleNames.Add("AIModule");
```

Key include paths:
```cpp
#include "EnvironmentQuery/EnvQuery.h"
#include "EnvironmentQuery/EnvQueryManager.h"
#include "EnvironmentQuery/EnvQueryTypes.h"
#include "EnvironmentQuery/EnvQueryGenerator.h"
#include "EnvironmentQuery/EnvQueryTest.h"
#include "EnvironmentQuery/EnvQueryContext.h"
#include "EnvironmentQuery/Generators/EnvQueryGenerator_ProjectedPoints.h"
#include "EnvironmentQuery/Items/EnvQueryItemType_VectorBase.h"
#include "EnvironmentQuery/Items/EnvQueryItemType_ActorBase.h"
```

## Running Queries from C++

### Basic Query Execution

Store a reference to the EQS asset in the AI Controller:

```cpp
// MyAIController.h
UPROPERTY(EditAnywhere, Category = "AI|EQS")
TObjectPtr<UEnvQuery> FindCoverQuery;
```

Execute the query:

```cpp
void AMyAIController::RunFindCoverQuery()
{
    if (!FindCoverQuery) return;

    FEnvQueryRequest QueryRequest(FindCoverQuery, GetPawn());
    QueryRequest.Execute(
        EEnvQueryRunMode::SingleResult,
        this,
        &AMyAIController::OnFindCoverQueryFinished);
}
```

### EEnvQueryRunMode Options

| Mode | Behavior |
|------|----------|
| `SingleResult` | Returns the single highest-scoring item |
| `RandomBest5Pct` | Random pick from top 5% scorers |
| `RandomBest25Pct` | Random pick from top 25% scorers |
| `AllMatching` | Returns all items that pass filters, sorted by score |

Use `RandomBest5Pct` or `RandomBest25Pct` to add variety — multiple NPCs running the same query won't pick identical positions.

### Handling Results

The callback receives `TSharedPtr<FEnvQueryResult>`:

```cpp
void AMyAIController::OnFindCoverQueryFinished(
    TSharedPtr<FEnvQueryResult> Result)
{
    if (!Result.IsValid() || !Result->IsSuccessful())
    {
        // Query failed or returned no items
        return;
    }

    // Single result
    FVector BestLocation = Result->GetItemAsLocation(0);

    // All results
    TArray<FVector> AllLocations;
    Result->GetAllAsLocations(AllLocations);

    // Actor results
    AActor* BestActor = Result->GetItemAsActor(0);

    // Score access
    float TopScore = Result->GetItemScore(0);
}
```

**Key FEnvQueryResult methods:**
- `IsSuccessful()` — query completed and found at least one valid item
- `IsFinished()` — query processing is complete
- `IsAborted()` — query was cancelled
- `GetItemAsLocation(Index)` — get location of item at index
- `GetItemAsActor(Index)` — get actor of item at index
- `GetAllAsLocations(OutArray)` — all passing locations
- `GetAllAsActors(OutArray)` — all passing actors
- `GetItemScore(Index)` — normalized score of item

Results are always sorted highest score first, regardless of run mode.

### Advanced: Runtime Query Parametrization

Directly configure test properties before execution (useful for dynamic parameters):

```cpp
UEnvQueryManager* Manager = UEnvQueryManager::GetCurrent(GetWorld());
TSharedPtr<FEnvQueryInstance> QueryInst = Manager->PrepareQueryInstance(
    FindCoverQuery, EEnvQueryRunMode::SingleResult);

if (QueryInst.IsValid())
{
    // Access and modify specific test properties
    UEnvQueryTest_Distance* DistTest =
        Cast<UEnvQueryTest_Distance>(QueryInst->Options[0].Tests[0]);
    if (DistTest)
    {
        // Modify test parameters at runtime
    }
}
```

## Built-in Generators

### Points: Grid (`UEnvQueryGenerator_SimpleGrid`)

Generates points in a 2D grid around a context.

| Property | Type | Description |
|----------|------|-------------|
| `GridSize` | `FAIDataProviderFloatValue` | Half-extent of the grid (radius) |
| `SpaceBetween` | `FAIDataProviderFloatValue` | Distance between points |
| `GenerateAround` | `TSubclassOf<UEnvQueryContext>` | Center context |

### Points: Pathing Grid (`UEnvQueryGenerator_PathingGrid`)

Like SimpleGrid but uses navmesh pathfinding distance instead of direct distance.

### Points: Donut (`UEnvQueryGenerator_Donut`)

Generates points in a ring pattern — useful for flanking positions.

### Actors Of Class (`UEnvQueryGenerator_ActorsOfClass`)

Finds actors of a specified class within a search radius.

| Property | Type | Description |
|----------|------|-------------|
| `SearchedActorClass` | `TSubclassOf<AActor>` | Class to search for |
| `SearchRadius` | `FAIDataProviderFloatValue` | Max search distance |
| `SearchCenter` | `TSubclassOf<UEnvQueryContext>` | Center of search area |
| `GenerateOnlyActorsInRadius` | `FAIDataProviderBoolValue` | Limit to radius |

### Current Location

Returns the querier's current position — useful as a fallback or reference.

## Built-in Tests

### Distance (`UEnvQueryTest_Distance`)

Scores/filters by distance from a context.

| Property | Description |
|----------|-------------|
| `DistanceTo` | Context to measure distance from |
| `TestMode` | Distance calculation mode (3D, 2D, Z-axis, path) |

### Trace (`UEnvQueryTest_Trace`)

Line-of-sight check between items and a context.

| Property | Description |
|----------|-------------|
| `Context` | Other end of the trace |
| `TraceData` | Trace configuration (channel, shape) |
| `TraceFromContext` | Trace direction (from context to item or vice versa) |
| `ItemHeightOffset` | Z offset from item location |
| `ContextHeightOffset` | Z offset from context |

### Pathfinding (`UEnvQueryTest_Pathfinding`)

Tests whether a navigation path exists and its cost/length.

### Dot (`UEnvQueryTest_Dot`)

Scores based on dot product between directions — useful for facing/flanking checks.

### Overlap (`UEnvQueryTest_Overlap`)

Checks for physics overlaps at item locations.

### Gameplay Tags (`UEnvQueryTest_GameplayTags`)

Filters/scores actors by their gameplay tags.

## Test Purpose and Scoring

### EEnvTestPurpose

| Value | Behavior |
|-------|----------|
| `Filter` | Binary pass/fail — items that fail are removed |
| `Score` | Assigns a weight to items for ranking |
| `FilterAndScore` | First filters, then scores passing items |

### Scoring Modes

Tests support different scoring equations: Linear, Square, Inverse Linear, Constant. Each test has a `ScoringFactor` weight — the final item score is a weighted combination of all test scores.

### Test Cost

Declare cost via `Cost` property: `Low`, `Medium`, `High`. EQS automatically orders tests by cost — cheap filters run first to eliminate candidates before expensive traces/pathfinding.

## Custom Generator (C++)

Inherit from `UEnvQueryGenerator_ProjectedPoints` for point-based generators:

```cpp
// EnvQueryGenerator_CoverPoints.h
UCLASS(Meta = (DisplayName = "Points: Cover"))
class MYPROJECT_API UEnvQueryGenerator_CoverPoints
    : public UEnvQueryGenerator_ProjectedPoints
{
    GENERATED_BODY()

public:
    UEnvQueryGenerator_CoverPoints();

    virtual void GenerateItems(FEnvQueryInstance& QueryInstance) const override;
    virtual FText GetDescriptionTitle() const override;
    virtual FText GetDescriptionDetails() const override;

    UPROPERTY(EditDefaultsOnly, Category = "Generator")
    TSubclassOf<UEnvQueryContext> GenerateAround;

    UPROPERTY(EditDefaultsOnly, Category = "Generator")
    FAIDataProviderFloatValue SearchRadius;
};
```

```cpp
// EnvQueryGenerator_CoverPoints.cpp
UEnvQueryGenerator_CoverPoints::UEnvQueryGenerator_CoverPoints()
{
    GenerateAround = UEnvQueryContext_Querier::StaticClass();
    SearchRadius.DefaultValue = 1500.f;
}

void UEnvQueryGenerator_CoverPoints::GenerateItems(
    FEnvQueryInstance& QueryInstance) const
{
    // Get context locations
    TArray<FVector> ContextLocations;
    if (!QueryInstance.PrepareContext(GenerateAround, ContextLocations))
    {
        return;
    }

    // Generate candidate points
    TArray<FNavLocation> NavPoints;
    const float Radius = SearchRadius.GetValue();

    for (const FVector& ContextLoc : ContextLocations)
    {
        // Your generation logic — find cover positions, sample points, etc.
        // Add results to NavPoints
    }

    // Project onto navmesh and filter unreachable points
    ProjectAndFilterNavPoints(NavPoints, QueryInstance);

    // Store results as EQS items
    StoreNavPoints(NavPoints);
}
```

For actor-based generators, inherit from `UEnvQueryGenerator` directly and use `UEnvQueryItemType_Actor` as item type.

## Custom Test (C++)

```cpp
// EnvQueryTest_IsInCover.h
UCLASS(Meta = (DisplayName = "Is In Cover"))
class MYPROJECT_API UEnvQueryTest_IsInCover : public UEnvQueryTest
{
    GENERATED_BODY()

public:
    UEnvQueryTest_IsInCover();

    virtual void RunTest(FEnvQueryInstance& QueryInstance) const override;
    virtual FText GetDescriptionTitle() const override;
    virtual FText GetDescriptionDetails() const override;

    UPROPERTY(EditDefaultsOnly, Category = "Test")
    TSubclassOf<UEnvQueryContext> ThreatContext;

    UPROPERTY(EditDefaultsOnly, Category = "Test")
    float CoverTraceHeight = 100.f;
};
```

```cpp
// EnvQueryTest_IsInCover.cpp
UEnvQueryTest_IsInCover::UEnvQueryTest_IsInCover()
{
    // Cost declaration — EQS runs cheap tests first
    Cost = EEnvTestCost::High;  // Trace tests are expensive

    // Valid item type
    ValidItemType = UEnvQueryItemType_VectorBase::StaticClass();

    ThreatContext = UEnvQueryContext_Querier::StaticClass();
}

void UEnvQueryTest_IsInCover::RunTest(
    FEnvQueryInstance& QueryInstance) const
{
    UObject* QueryOwner = QueryInstance.Owner.Get();
    if (!QueryOwner) return;

    // Prepare context data
    TArray<FVector> ThreatLocations;
    if (!QueryInstance.PrepareContext(ThreatContext, ThreatLocations))
    {
        return;
    }

    // Iterate items with built-in time-slicing
    for (FEnvQueryInstance::ItemIterator It(this, QueryInstance); It; ++It)
    {
        const FVector ItemLoc = GetItemLocation(QueryInstance, It.GetIndex());

        bool bInCover = false;
        for (const FVector& ThreatLoc : ThreatLocations)
        {
            // Perform cover check logic...
            FHitResult Hit;
            FVector TraceStart = ItemLoc + FVector(0, 0, CoverTraceHeight);
            if (QueryOwner->GetWorld()->LineTraceSingleByChannel(
                    Hit, TraceStart, ThreatLoc,
                    ECC_Visibility))
            {
                bInCover = true;
                break;
            }
        }

        // SetScore for binary (filter) tests — pass bool as score
        It.SetScore(TestPurpose, FilterType, bInCover, true);
    }
}
```

### ItemIterator Rules

- Use `FEnvQueryInstance::ItemIterator` — it enforces EQS time budgets and can spread work across frames.
- Can only be used **once** per `RunTest` call.
- Call `It.IgnoreTimeLimit()` before the loop if you must process all items in a single frame (batch operations).
- `It.SetScore(TestPurpose, FilterType, Value, bIsBoolean)` — use `bIsBoolean = true` for pass/fail, `false` for continuous score values.

## Custom Context (C++)

```cpp
// EnvQueryContext_TargetActor.h
UCLASS(Meta = (DisplayName = "Target Actor"))
class MYPROJECT_API UEnvQueryContext_TargetActor : public UEnvQueryContext
{
    GENERATED_BODY()

public:
    virtual void ProvideContext(
        FEnvQueryInstance& QueryInstance,
        FEnvQueryContextData& ContextData) const override;
};
```

```cpp
// EnvQueryContext_TargetActor.cpp
void UEnvQueryContext_TargetActor::ProvideContext(
    FEnvQueryInstance& QueryInstance,
    FEnvQueryContextData& ContextData) const
{
    AActor* QueryOwner = Cast<AActor>(QueryInstance.Owner.Get());
    if (!QueryOwner) return;

    AAIController* AICon = Cast<AAIController>(
        QueryOwner->GetInstigatorController());
    if (!AICon) return;

    // Get target from blackboard
    UBlackboardComponent* BB = AICon->GetBlackboardComponent();
    if (!BB) return;

    AActor* Target = Cast<AActor>(
        BB->GetValueAsObject(TEXT("TargetActor")));
    if (Target)
    {
        // For actor context
        UEnvQueryItemType_Actor::SetContextHelper(ContextData, Target);

        // For location-only context, use:
        // UEnvQueryItemType_Point::SetContextHelper(
        //     ContextData, Target->GetActorLocation());
    }
}
```

Prefer C++ contexts over Blueprint contexts — they are more performant and avoid Blueprint overhead on frequent queries.

## Behavior Tree Integration

Use `UBTTask_RunEQSQuery` to run EQS from a Behavior Tree:

- Set the **Query Template** to your EQS asset
- Set the **Blackboard Key** to store the result (Vector or Object)
- Choose **Run Mode** (SingleResult, RandomBest5Pct, etc.)

The task returns `Succeeded` when a valid result is found and written to the blackboard, `Failed` otherwise.

## Best Practices

- **Order tests by cost** — declare `Cost = EEnvTestCost::Low` for cheap checks (distance), `High` for expensive ones (traces, pathfinding). EQS reorders tests automatically.
- **Use `RandomBest5Pct` / `RandomBest25Pct`** — prevents multiple NPCs from picking the same position. `SingleResult` is deterministic.
- **Prefer C++ contexts over Blueprint** — avoids Blueprint VM overhead on queries that run frequently.
- **Use `FAIDataProviderFloatValue`** for configurable properties — allows both static defaults and Blackboard-driven values in the editor.
- **Keep generators focused** — generate a reasonable number of items. More items = more test evaluations = more cost.
- **Filter before scoring** — put `Filter`-only tests first (cheap pass/fail) to reduce the number of items that expensive `Score` tests must process.
- **Use the EQS Testing Pawn** for debugging — drag it into the level, assign a query, and visualize item scores in real time. Set to "use all results" mode for accurate visualization.
- **Validate NavMesh coverage** — point generators that use `ProjectAndFilterNavPoints` require a NavMeshBoundsVolume. Press P in viewport to verify.

## Anti-patterns

- **Running EQS every frame** — queries are expensive. Run them on a timer, in services with an appropriate `Interval`, or only when conditions change.
- **Generating too many items** — a 5000-unit grid with 50-unit spacing produces 10,000 items. Each item runs every test. Reduce grid size or increase spacing.
- **Ignoring test cost declarations** — if a custom trace test declares `Cost = Low`, EQS runs it early before cheap filters, wasting budget on items that would have been eliminated.
- **Using EQS Testing Pawn with default settings** — optimization may skip tests, showing misleading results. Set visualization to "use all results" for debugging.
- **Forgetting to call `PrepareContext`** — context data is not automatically loaded. Always call `QueryInstance.PrepareContext()` in custom generators and tests.
- **Accessing `QueryInstance.Owner` without null checks** — the owner can be null if the querying actor was destroyed during async query execution.
- **Hardcoding `Options[0].Tests[0]` indices** — when parametrizing queries at runtime, indices depend on query asset layout. Changes to the asset silently break the code.
