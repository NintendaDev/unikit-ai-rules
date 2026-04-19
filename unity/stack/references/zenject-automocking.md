# Zenject — Auto-Mocking in Tests

> See also: [zenject.md](../zenject.md)

Auto-mocking lets you substitute dependencies with mock objects in unit tests without writing manual stub classes. The mock is created automatically from an interface or abstract class.

---

## Purpose

Use auto-mocking to isolate the class under test from external systems (network, file I/O, databases) and control return values precisely. Zenject integrates with **Moq** and **NSubstitute**.

Auto-mocking is **disabled by default** — you must install the optional package manually.

## Installation

### Moq
1. Extract `Zenject/OptionalExtras/AutoMoq.zip`
2. Move the extracted folder to `Zenject/OptionalExtras/TestFrameWork/Editor`
3. Select the Moq.dll version matching your Scripting Runtime Version
4. If using .NET 3.5, switch "Api Compatibility Level" from ".NET 2.0 Subset" to ".NET 2.0"

### NSubstitute
1. Extract `Zenject/OptionalExtras/AutoSubstitute.zip`
2. Move the extracted folder to `Zenject/OptionalExtras/TestFrameWork/Editor`

## Moq Usage

**Bind an auto-created mock:**
```csharp
Container.Bind<IWebServer>().FromMock();
```

The container will inject a `Mock<IWebServer>` instance created by Moq wherever `IWebServer` is required.

**Configure mock behavior:**
```csharp
var mockServer = new Mock<IWebServer>();
mockServer.Setup(x => x.GetSomething()).Returns("test-data");
mockServer.Setup(x => x.IsOnline).Returns(true);
Container.BindInstance(mockServer.Object);
```

**Verify interactions in a test:**
```csharp
mockServer.Verify(x => x.GetSomething(), Times.Once);
```

## NSubstitute Usage

**Bind an auto-created substitute:**
```csharp
Container.Bind<ICalculator>().FromSubstitute();
```

**Configure return values:**
```csharp
var calculator = Container.Resolve<ICalculator>();
calculator.Add(1, 2).Returns(3);
```

**Auto-values feature:** NSubstitute substitutes automatically return non-null defaults for:
- Interfaces → empty substitute
- Delegates → no-op delegate
- Purely virtual classes → substitute

Primitives (`int`, `bool`, `string`) and arrays return their default values (0, false, `""`, empty array). This reduces setup boilerplate for tests where only some methods matter.

## ZenjectIntegrationTestFixture Pattern

Use Zenject's built-in test base classes to get a pre-configured container in tests:

```csharp
[TestFixture]
public class FooTests : ZenjectUnitTestFixture
{
    [SetUp]
    public void SetUp()
    {
        Container.Bind<IWebServer>().FromMock();
        Container.Bind<Foo>().AsSingle();
    }

    [Test]
    public void TestFoo()
    {
        var foo = Container.Resolve<Foo>();
        var mockServer = Container.Resolve<Mock<IWebServer>>();
        
        foo.Initialize();
        
        mockServer.Verify(x => x.GetSomething(), Times.Once);
    }
}
```

## Key Rules

- Use auto-mocking for interfaces and abstract dependencies that represent external systems.
- Prefer `NSubstitute` over `Moq` when recursive mocking (auto-values for nested types) reduces test setup significantly.
- Always bind the class under test as a real instance — mock only its dependencies.
- Auto-mocking is for unit tests; use real bindings with `ZenjectIntegrationTestFixture` for integration tests.
- Do not use `FromMock()` in non-test installers — mocks should never reach production containers.
