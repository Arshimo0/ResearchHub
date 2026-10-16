# ResearchHub

A production-style research management and collaboration platform, built with ASP.NET Core.

> 🚧 Work in progress — early development. See [planning & architecture](docs/) for the full design.

## Status

Milestone 1 (solution setup) complete: solution structure, layered architecture, health check endpoint, Swagger UI.

## Tech Stack

- ASP.NET Core Web API (.NET 10)
- C#
- (More to come: EF Core, SQL Server, JWT auth, React/TypeScript)

## Project Structure
src/
ResearchHub.API/ - HTTP layer, controllers
ResearchHub.Application/ - use cases, DTOs, interfaces
ResearchHub.Domain/ - entities, business rules
ResearchHub.Infrastructure/ - EF Core, external services
tests/
ResearchHub.UnitTests/
ResearchHub.IntegrationTests/

## Getting Started

```bash
dotnet build
dotnet run --project src/ResearchHub.API
```

Then open `/swagger` to browse the API.

## License

TBD