# Architecture

ResearchHub is a layered ASP.NET Core application. This document explains the layers, the rules between them, how a request flows through the system, and the decisions behind it, including the alternatives that were rejected and when each one should be revisited.

## 1. Why layers

The domain has real rules: a project can never lose its last Owner, a paper can only carry tags from its own project, a task's assignee must belong to the project, and a note can only be changed by its author. Those rules should not depend on HTTP, SQL Server, or any library, because that is what makes them easy to test and safe to change. The layered structure exists to protect them.

The structure is deliberately not heavier than that. There is no MediatR, no CQRS, no generic repository and no event bus. Each was considered and left out because nothing in the project needs it yet (see the decision log).

## 2. Layers and dependency rules

```
ResearchHub.API  ───►  ResearchHub.Application  ───►  ResearchHub.Domain
                                  ▲                          ▲
                                  └── ResearchHub.Infrastructure ──┘
```

Dependencies point inward. The compiler enforces this through project references, so a violation is a build error rather than a code-review comment. `Domain` has no project or package references at all.

| Layer | Contains | Must not contain |
|---|---|---|
| **Domain** | Entities, enums, domain exceptions, and the invariants one aggregate can check on its own | EF Core, ASP.NET Core, validation libraries, anything that talks to the outside world |
| **Application** | Use-case services, request and response DTOs, FluentValidation validators, and the interfaces the services need (repositories, password hasher, token service, unit of work) | EF Core types, `HttpContext`, JWT library types, SQL |
| **Infrastructure** | EF Core `DbContext` and entity configurations, migrations, repository implementations, PBKDF2 hashing, JWT generation | Business rules, HTTP concerns |
| **API** | Controllers, authentication and CORS setup, error-handling middleware, `Program.cs` | Business rules, direct database access |

The API project references Infrastructure for one reason: `Program.cs` is the composition root, where interfaces are bound to implementations. No controller or other class in the API uses an Infrastructure type.

## 3. Request lifecycle

Middleware runs in this order, and the order matters:

1. **Exception handling** is outermost, so it catches everything below it and turns it into a consistent error response.
2. **HTTPS redirection.**
3. **CORS** comes before authentication so that 401 and 403 responses also carry CORS headers. Otherwise a browser hides the real error behind a generic network failure.
4. **Authentication** reads the JWT and builds the user principal.
5. **Authorization** applies `[Authorize]`.
6. **Controllers.**

Example: `PUT /api/notes/{id}`.

1. `NotesController` is thin. It reads the current user's id from the JWT claims (`ApiControllerBase.CurrentUserId`) and calls `NoteService.UpdateAsync(id, request, userId)`.
2. The service validates the request (FluentValidation) before touching the database. Bad input costs no query.
3. It loads the note through `INoteRepository` and calls `EnsureIsAuthor`, which compares `note.AuthorId` with the caller. Project roles are never consulted, so no Owner override exists.
4. It calls `note.UpdateContent(...)`. The entity trims the text, re-checks it, and stamps `UpdatedAt`.
5. `IUnitOfWork.SaveChangesAsync()` commits.
6. The service returns a `NoteDto`, with the author's display name joined in.

If any step throws, the exception middleware maps it to a status code and the same error shape (section 7).

## 4. Domain model

Entities protect their own state:

- **Constructors require valid data.** An entity cannot be created in an invalid state. Setters are private, and changes go through named methods such as `UpdateDetails` or `ChangeStatus`.
- **`ResearchProject` is an aggregate root.** It owns its `ProjectMember` collection, exposed as a read-only collection backed by a private list. `ProjectMember`'s constructor and `ChangeRole` are `internal`, so membership can only change through the project. The project's constructor creates the Owner membership, so a project never exists without an Owner.
- **Invariants live on the entity.** Examples: `RemoveMember` refuses to remove the last Owner (`CannotRemoveLastOwnerException`), `ResearchPaper.AddTag` rejects a tag from another project, and `ResearchTask.ChangeStatus` sets `CompletedAt` when a task becomes Done and clears it when reopened.
- **Private parameterless constructors exist only for EF Core.** They let it materialise rows without calling the business constructor. Application code cannot reach them.
- **Keys are generated in the domain.** Each entity assigns its own `Guid` in its constructor. Because of that, `ProjectMember.Id` is configured `ValueGeneratedNever`. Without it, EF Core treats a new member added to an already tracked project as an existing row and issues an UPDATE.

Rules that need data an entity cannot see are not in the Domain. Whether an assignee belongs to the project, whether a linked paper belongs to the task's project, and who may do what are Application-layer rules.

## 5. Authentication and security

- **Passwords:** PBKDF2 (`Rfc2898DeriveBytes`) with SHA-256, a random 16-byte salt per password, a 32-byte hash, and 100,000 iterations. The stored string is `salt.hash.iterations`. Because the iteration count travels with the hash, it can be raised later without breaking existing passwords. Verification uses `CryptographicOperations.FixedTimeEquals` to avoid timing leaks.
- **Login errors:** an unknown email and a wrong password return the same message, so the endpoint cannot be used to discover which emails have accounts.
- **Access tokens:** JWT signed with HMAC-SHA256, 30 minutes by default. Claims are the user id (`sub`), email, role (`ClaimTypes.Role`) and a unique `jti`. The server validates issuer, audience, signature and lifetime, with zero clock skew.
- **Refresh tokens:** 64 random bytes, base64 encoded, stored in the database with a 7-day expiry. They are opaque rather than JWTs, because they only need to be unguessable and look-up-able. Each refresh **revokes the old token and issues a new one**, so a refresh token is single-use.
- **Secrets:** the connection string and JWT settings come from User Secrets or environment variables. Nothing sensitive is committed. The CI workflow uses throwaway values.
- **Responses never contain** password hashes, and 500 responses never contain exception text.

## 6. Authorization model

There are two kinds of roles, handled differently:

- **Platform role** (`User`, `Admin`) is a JWT claim, so ASP.NET Core's `[Authorize(Roles = ...)]` could use it directly. No endpoint requires Admin yet.
- **Project role** (`Owner`, `Member`) is not a claim. It is scoped to one project and can change independently of login state, so it is read from the project's member list on each request.

Project rules are enforced in the Application services with small explicit checks (`EnsureIsMember`, `EnsureIsOwner`, `EnsureIsAuthor`), which keeps each rule visible next to the code it protects. The matrix is in the README.

Two further points:

- **List endpoints filter in the query, not afterwards.** `GET /api/projects` and paper search restrict results to projects the caller belongs to inside the SQL itself, so a bug elsewhere cannot leak another project's data.
- **Search never returns a 403.** It shows what the caller is allowed to see and nothing more.

## 7. Validation and error handling

- **Validation** uses FluentValidation. Validators sit in the Application layer and run at the top of each service method, so they apply to every caller and can be unit-tested without HTTP. Length limits mirror the database column sizes, so over-long input becomes a clear 400 instead of a database error.
- The domain constructors keep their own guards. The two layers do different jobs: validators give clients precise per-field messages, and the domain protects its invariants regardless of who calls it.
- **One error shape** everywhere, in the style of RFC 7807: `title`, `status`, `traceId`, plus `detail` or per-field `errors`. ASP.NET Core's own model-binding failures (malformed JSON, wrong types) are routed into the same shape.
- **Exception mapping** is centralised in one middleware, so controllers contain no try/catch blocks.
- **Log levels follow severity.** Client mistakes log as warnings, and only real server failures log as errors.

## 8. Persistence

- **Repositories are purpose-built.** Each interface has only the methods its services use. There is no generic `IRepository<T>`.
- **`IUnitOfWork`** wraps `SaveChangesAsync`. Most use cases save once. Registration and token issuance save twice (the user, then the refresh token), a known simplification.
- **Mapping uses the Fluent API** in Infrastructure, so the Domain carries no EF attributes.
- **Collections with no setter** (`ResearchProject.Members`, `ResearchPaper.Tags`) are mapped through their backing fields. Repositories must `Include` them, because EF Core never loads related data implicitly and the failure mode is a silently empty collection.
- **Enums are stored as strings.** The database is readable and reordering an enum cannot corrupt data. The API sends the same names.
- **Display names are joined in the Application layer** with one batched `WHERE Id IN (...)` query per request (`UserNames`), never one query per row. Entities still hold only ids.
- **Queries are built as `IQueryable` and executed once**, so filtering happens in SQL.

## 9. Testing

- **Unit tests** cover entities and services with repositories mocked. They run in milliseconds and cover authorization rules, invariants and validation.
- **Integration tests** run the real application through `WebApplicationFactory` against a disposable SQL Server container (Testcontainers). They cover status codes, JWT handling, query translation, constraints and CORS.
- The test host receives its own JWT settings through in-memory configuration, so the suite does not depend on anyone's local secrets and runs unchanged in CI.
- Integration tests assert the status code of every setup step. This habit came from a real defect: a setup call was silently failing and a test passed for the wrong reason.

## 10. Decision log

| Decision | Alternative considered | Why | Revisit when |
|---|---|---|---|
| Layered architecture | One project | Real rules worth isolating and testing | Never for this scale |
| Service per feature area, purpose-built repositories | MediatR, CQRS, generic repository | Nothing needs a pipeline or a generic abstraction yet | Cross-cutting behaviour (audit, caching) wanted around every use case |
| Custom authentication | ASP.NET Core Identity | Narrow needs, small parts that are fully understood and tested | Lockout, MFA or external login providers are needed |
| PBKDF2 from the framework | BCrypt or Argon2 package | No extra dependency | A package-based hasher is preferred, or the iteration count needs a rehash-on-login upgrade |
| Opaque, rotating refresh tokens in the database | JWT refresh tokens | Revocable and simple | Token reuse detection is added |
| Manual `Ensure*` authorization checks | Policy and handler-based authorization | Rules are few and readable in place | Rules multiply or repeat across more resources |
| Plain `Guid` ids | Typed id wrappers per entity | Tried first, judged too much boilerplate | Swapped-argument bugs appear |
| Fluent API mapping | Data annotations | Keeps Domain free of EF | Never |
| Project-scoped tags, created on first use | Global tags, or a separate tag endpoint | Matches how teams use tags, and keeps authorization simple | A tag-management screen is needed |
| Author-only notes, no Owner override | Owner may moderate | Stricter, and simple to reason about | Moderation becomes a requirement |
| Enums as strings on the wire | Numbers | Self-describing, safe to extend | Never |
| Validation inside services | Validation in the API layer | One place, testable without HTTP | Never |
| Real SQL Server in tests | SQLite or the in-memory provider | Tests mappings and constraints as they really behave | Test time becomes a problem |
| Display names joined in Application | Navigation properties from entities to users | Keeps aggregates small and decoupled | A feature needs many joined user fields |

## 11. Hardening backlog

These are known and deliberately deferred:

- Refresh tokens are stored as issued. Hashing them at rest and detecting reuse of a revoked token would be the next security step.
- The PBKDF2 iteration count (100,000) is below current OWASP guidance for SHA-256. It can be raised without invalidating existing passwords, but there is no automatic rehash on login yet.
- Rate limiting on registration, login and user lookup.
- Dedicated exception types, so broad framework exceptions are not mapped to client-facing statuses.
- Full-text search and pagination.
- Hosting and deployment configuration.
