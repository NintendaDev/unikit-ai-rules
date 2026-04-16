---
version: 1.0.0
---

# Chickensoft Log

> **Scope**: Logging in Godot 4 C# projects using the Chickensoft.Log and Chickensoft.Log.Godot packages — creating loggers, choosing writers, configuring formatters, and testing logging behavior without mocking.
> **Load when**: adding logging to a class, choosing a log writer, configuring log output for Godot console or files, writing unit tests that verify logged messages, migrating from GoDotLog.

---

## Packages

Two NuGet packages are required for Godot projects:

```bash
dotnet add package Chickensoft.Log
dotnet add package Chickensoft.Log.Godot
```

`Chickensoft.Log` provides the base `ILog` interface and platform-agnostic writers.
`Chickensoft.Log.Godot` provides Godot-specific writers (`GDWriter`, `GDFileWriter`).

> **GoDotLog is deprecated.** Use `Chickensoft.Log` + `Chickensoft.Log.Godot` instead.

---

## Core Concepts

- **`ILog`** — primary logging abstraction. Has a name, a formatter, and a collection of writers.
- **`Log`** — standard implementation of `ILog`.
- **`ILogFormatter`** — formats messages (name, level, content).
- **`ILogWriter`** — routes formatted messages to a specific output destination.

---

## Creating a Logger

Declare `ILog` as a field (not a property) using `nameof(ClassName)` as the log name:

```csharp
private ILog _log = new Log(nameof(MyClass), new GDWriter());
```

For multiple simultaneous outputs:

```csharp
private ILog _log = new Log(nameof(MyClass), new GDWriter(), new FileWriter());
```

---

## Logging Methods

```csharp
_log.Print("Loaded level.");           // Info level
_log.Warn("Save file not found.");     // Warning level
_log.Err("Failed to initialize.");     // Error level

_log.Print(exception);                 // logs Exception with stack trace
_log.Print(new StackTrace());          // logs a StackTrace directly
```

---

## Writer Types

| Writer | Package | Output |
|--------|---------|--------|
| `GDWriter` | Log.Godot | Godot console (GD.Print / GD.PushWarning / GD.PushError) |
| `GDFileWriter` | Log.Godot | File via Godot file I/O (`user://` and `res://` paths) |
| `ConsoleWriter` | Log | stdout / stderr |
| `TraceWriter` | Log | .NET Trace system (Visual Studio Output window) |
| `FileWriter` | Log | File via .NET `System.IO` |
| `TestWriter` | Log | In-memory accumulation for unit tests |

**In Godot projects, prefer `GDWriter` over `ConsoleWriter`** — it integrates with Godot's own console and respects Godot's log level coloring.

---

## GDWriter

Outputs to the Godot debug console. Use as the default writer for all game code:

```csharp
private ILog _log = new Log(nameof(Player), new GDWriter());
```

Do NOT combine `GDWriter` with `TraceWriter` in the same `Log` instance. Godot already routes .NET `Trace` output to its console, so combining them produces duplicate log entries.

---

## GDFileWriter

Pseudo-singleton — one instance per filename. Use `Instance()` to obtain or reuse the shared writer:

```csharp
// Default file: user://output.log
private ILog _log = new Log(nameof(MyClass), new GDFileWriter());

// Custom file path
private ILog _log = new Log(nameof(MyClass), GDFileWriter.Instance("user://game.log"));
```

Change the default path globally before any instances are created:

```csharp
GDFileWriter.DefaultFileName = "user://game.log";
```

---

## TraceWriter (Visual Studio debugging)

Useful during local development to see logs in the VS Output window. Requires registering a `DefaultTraceListener` manually in Godot:

```csharp
public override void _Ready()
{
    Trace.Listeners.Add(new DefaultTraceListener());
}
```

Do NOT use together with `GDWriter` — this creates duplicate output.

---

## TestWriter (Unit Testing)

Use `TestWriter` to verify logged messages without mocking `ILog`. Inject via a public `ILog` property on the class under test:

```csharp
// Production code
public class Enemy : Node
{
    public ILog Log { get; set; } = new Log(nameof(Enemy), new GDWriter());

    public void TakeDamage(int amount)
    {
        if (amount <= 0) { Log.Warn("Damage must be positive."); return; }
        _health -= amount;
        Log.Print($"Took {amount} damage.");
    }
}
```

```csharp
// Test
var writer = new TestWriter();
var enemy = new Enemy { Log = new Log(nameof(Enemy), writer) };

enemy.TakeDamage(-5);

writer.LoggedMessages.ShouldContain("Warning (Enemy): Damage must be positive.");
```

`TestWriter` is **not thread-safe** — do not use it in tests that involve concurrent logging.

---

## Formatter Configuration

The default `LogFormatter` produces messages in the form `"Level (Name): message"`. Override prefixes when needed:

```csharp
var formatter = new LogFormatter
{
    MessagePrefix = "INFO",
    WarningPrefix = "WARN",
    ErrorPrefix = "ERROR"
};
var log = new Log(nameof(MyClass), formatter, new GDWriter());
```

Change global defaults (affects only instances created after the change):

```csharp
LogFormatter.DefaultMessagePrefix = "INFO";
LogFormatter.DefaultWarningPrefix = "WARN";
LogFormatter.DefaultErrorPrefix = "ERROR";
```

---

## Log Level Guidelines

| Level | Use for |
|-------|---------|
| `Print` | Normal operational events — state transitions, player actions, initialization steps, level loads |
| `Warn` | Unexpected but recoverable situations — missing optional asset (with fallback), deprecated API usage, low-memory thresholds |
| `Err` | Unrecoverable failures — critical resource missing, data corruption, initialization failed |

Use `_log.Print(exception)` (not `_log.Err(...)`) when you need the full exception with its stack trace. `Err` is for human-readable error descriptions; pass the exception object directly to `Print` for structured output.

---

## Anti-patterns

- **Do not inject `ILog` via constructor by default.** Declare it as a field with a sensible default writer; override it in tests via a public property. This avoids polluting constructor signatures across the codebase.
- **Do not use `ConsoleWriter` in Godot game code.** It bypasses Godot's console system. Use `GDWriter` instead.
- **Do not combine `GDWriter` and `TraceWriter`** in the same `Log` instance — Godot's custom `TraceListener` already pipes .NET Trace output to its console, causing duplicates.
- **Do not call `Log(nameof(SomeOtherClass), ...)`** — always use the actual class name for traceability.
- **Do not change `LogFormatter` defaults after loggers have been created.** The change only applies to new instances; existing loggers retain their original prefix values.
- **Do not use `TestWriter` in concurrent tests.** It is not thread-safe.
- **Do not create logger instances inside `_Process` or other hot paths.** Creating a new `Log(...)` every frame allocates garbage and creates new writer connections. Declare loggers as class fields.
- **Do not log only `e.Message` when catching exceptions.** Use `_log.Print(e)` to capture the full `e.ToString()` including the stack trace. Logging only the message loses critical debugging context.
