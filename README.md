# ResearchHub

[![CI](https://github.com/Arshimo0/ResearchHub/actions/workflows/ci.yml/badge.svg)](https://github.com/Arshimo0/ResearchHub/actions/workflows/ci.yml)

A research management and collaboration platform. Teams organise papers into projects, tag and search them, write notes, and track research tasks. Built with ASP.NET Core as a layered application where the business rules are isolated from the framework.

> **Status: v0.1.0, backend MVP complete.** A React + TypeScript web UI is the next milestone. Screenshots will be added with it.

## Features

- **Authentication:** registration, login, short-lived JWT access tokens, and refresh tokens that rotate on every use.
- **Projects:** create projects, invite members by email lookup, and manage membership with Owner and Member roles. A project can never lose its last Owner.
- **Papers:** title, authors, abstract, publication date, DOI/URL and PDF reference. Tags are created on the fly and scoped to the project.
- **Search and filtering:** filter a project's papers by tag, author and date range, or search title, authors and abstract across every project you belong to.
- **Notes:** discussion on a paper. Only the author can edit or delete a note, and not even a project Owner can override that.
- **Tasks:** assign work to project members, with status, priority, deadline and an optional link to a paper.
- **Profiles:** view and update your display name.

## Architecture

```
ResearchHub.API  ───►  ResearchHub.Application  ───►  ResearchHub.Domain
                                  ▲                          ▲
                                  └── ResearchHub.Infrastructure ──┘
```

Dependencies point inward. `Domain` references nothing, and `Application` defines the interfaces that `Infrastructure` implements. The API references `Infrastructure` only in `Program.cs`, to register services.

| Project | Responsibility |
|---|---|
| `ResearchHub.Domain` | Entities that enforce their own invariants through constructors and methods (private setters, aggregate roots) |
| `ResearchHub.Application` | Use-case services, DTOs, validators, and the interfaces for persistence and security |
| `ResearchHub.Infrastructure` | EF Core and SQL Server, repositories, password hashing, JWT generation |
| `ResearchHub.API` | Controllers, authentication and CORS setup, error-handling middleware |

Decisions worth knowing about:

- **Rules live where the data is.** Invariants that one aggregate can check (a project keeps at least one Owner, tags must belong to the paper's project) are in the Domain. Rules that need other data (the assignee must be a project member) are in Application services.
- **Entities never leave the API.** Controllers return DTOs, so the public contract and the domain model can change independently.
- **Custom authentication, not ASP.NET Core Identity.** The needs are narrow, and every piece (PBKDF2 hashing with per-user salts, timing-safe comparison, JWT issuing, refresh rotation) is small and tested.
- **Manual project authorization** (`EnsureIsOwner`, `EnsureIsMember`) rather than policy handlers. Simple to follow today; policies are the next step if the rules multiply.
- **Validation runs inside the services** (FluentValidation), so the rules apply to every caller and are unit-testable without HTTP.
- **One error shape everywhere** (RFC 7807 style) with per-field errors for validation and a `traceId`. 500 responses never include exception text.
- **Integration tests use a real SQL Server** (Testcontainers) instead of an in-memory substitute, so mappings, constraints and queries are tested as they run in production.

More detail is in [`docs/architecture.md`](docs/architecture.md) and [`docs/database-design.md`](docs/database-design.md).

## Tech stack

| Area | Technology |
|---|---|
| Framework | ASP.NET Core Web API, .NET 10, C# |
| Data | Entity Framework Core, SQL Server |
| Auth | JWT bearer tokens, PBKDF2 password hashing, refresh token rotation |
| Validation | FluentValidation |
| Testing | xUnit, Moq, Testcontainers (SQL Server), `WebApplicationFactory` |
| CI | GitHub Actions |
| API docs | OpenAPI, Swagger UI (development only) |

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- SQL Server (a local instance, or the Docker command below)
- Docker, for the integration tests
- The EF Core CLI: `dotnet tool install --global dotnet-ef`

### 1. Clone and build

```bash
git clone https://github.com/Arshimo0/ResearchHub.git
cd ResearchHub
dotnet build
```

### 2. Start a database

Skip this if you already have SQL Server. Otherwise run one in Docker, choosing your own strong password:

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=<your-strong-password>" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

### 3. Configure secrets

Secrets are stored with [.NET User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets), outside the repository. Nothing sensitive is ever committed.

```bash
dotnet user-secrets set "ConnectionStrings:ResearchHubDb" "Server=localhost,1433;Database=ResearchHubDb;User Id=sa;Password=<your-strong-password>;TrustServerCertificate=True" --project src/ResearchHub.API
dotnet user-secrets set "Jwt:Secret" "<a-random-string-of-at-least-32-characters>" --project src/ResearchHub.API
dotnet user-secrets set "Jwt:Issuer" "ResearchHub" --project src/ResearchHub.API
dotnet user-secrets set "Jwt:Audience" "ResearchHubClient" --project src/ResearchHub.API
dotnet user-secrets set "Jwt:AccessTokenExpiryMinutes" "30" --project src/ResearchHub.API
```

With a local Windows SQL Server instance, use a connection string like `Server=localhost;Database=ResearchHubDb;Trusted_Connection=True;TrustServerCertificate=True` instead.

### 4. Create the database

```bash
dotnet ef database update --project src/ResearchHub.Infrastructure --startup-project src/ResearchHub.API
```

### 5. Run

```bash
dotnet run --project src/ResearchHub.API
```

The console prints the address. In development, Swagger UI is at `/swagger`.

### Configuration reference

| Key | Purpose |
|---|---|
| `ConnectionStrings:ResearchHubDb` | SQL Server connection string |
| `Jwt:Secret` | Signing key, at least 32 characters. Keep it private. |
| `Jwt:Issuer` / `Jwt:Audience` | Token issuer and audience |
| `Jwt:AccessTokenExpiryMinutes` | Access token lifetime |
| `Cors:AllowedOrigins` | Browser origins allowed to call the API (in `appsettings.json`) |

Any key can also be supplied as an environment variable, with `__` in place of `:` (for example `Jwt__Secret`). The CI workflow does this.

## API overview

Everything except `register`, `login`, `refresh` and `health` requires `Authorization: Bearer <access token>`. Enums are sent as names (`"Owner"`, `"InProgress"`).

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh` |
| Users | `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users/lookup?email=` |
| Projects | `GET /api/projects`, `POST /api/projects`, `GET/PUT/DELETE /api/projects/{id}`, `POST /api/projects/{id}/members`, `DELETE /api/projects/{id}/members/{userId}` |
| Papers | `GET/POST /api/projects/{projectId}/papers` (filters: `tag`, `author`, `from`, `to`), `GET /api/papers/search?query=&projectId=`, `GET/PUT/DELETE /api/papers/{id}`, `POST /api/papers/{id}/tags`, `DELETE /api/papers/{id}/tags/{tagId}` |
| Notes | `GET/POST /api/papers/{paperId}/notes`, `PUT/DELETE /api/notes/{id}` |
| Tasks | `GET/POST /api/projects/{projectId}/tasks`, `GET/PUT/DELETE /api/tasks/{id}`, `PUT /api/tasks/{id}/assignee`, `PATCH /api/tasks/{id}/status` |
| Health | `GET /api/health` |

Errors always look like this, with `errors` present for validation failures:

```json
{
  "title": "Validation failed",
  "status": 400,
  "traceId": "0HN...",
  "errors": { "password": ["Password must be at least 8 characters."] }
}
```

Who can do what:

| Action | Allowed |
|---|---|
| View a project, its papers, notes and tasks | Any project member |
| Edit or delete a project, manage members | Project Owner |
| Edit or delete a paper | Any project member |
| Edit or delete a note | The note's author only |
| Edit, delete or reassign a task | The task's creator or a project Owner |
| Change a task's status | The assignee or a project Owner |

See [`docs/api-design.md`](docs/api-design.md) for the full reference.

## Testing

```bash
dotnet test
```

The suite has 138 tests: unit tests for the domain and services (repositories mocked), and integration tests that run the whole HTTP pipeline against a real SQL Server container.

The integration tests need Docker running. The first run downloads the SQL Server image and each test class starts a container, so allow a few minutes. On some Windows and Docker Desktop setups, container startup can hang; setting `TESTCONTAINERS_RYUK_DISABLED=true` is a known workaround.

## Project structure

```
ResearchHub/
├── src/
│   ├── ResearchHub.API/             Controllers, middleware, startup
│   ├── ResearchHub.Application/     Services, DTOs, validators, interfaces
│   ├── ResearchHub.Domain/          Entities, enums, domain exceptions
│   └── ResearchHub.Infrastructure/  EF Core, repositories, auth services
├── tests/
│   ├── ResearchHub.UnitTests/
│   └── ResearchHub.IntegrationTests/
├── docs/                            Architecture, database, and API documents
└── .github/workflows/ci.yml         Build and test on every push and PR
```

## Roadmap

- **Next:** React + TypeScript web UI
- Docker setup and a hosted demo
- Rate limiting on registration, login and user lookup
- Full-text search and pagination
- Email and password changes, notifications
- Later: PDF processing, metadata extraction from DOIs, semantic search and recommendations

## Known limitations

- Swagger UI has no Authorize button yet, so authenticated calls are easiest with curl or an HTTP client until the UI exists.
- Search uses `LIKE` matching, capped at 50 results, with no pagination.
- User lookup reveals whether an email is registered, a deliberate MVP tradeoff until rate limiting exists.
- Users cannot change their email or password, and accounts cannot be deleted.

## License

[MIT](LICENSE)
