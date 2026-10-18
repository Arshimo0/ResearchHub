# API reference

All routes live under `/api`. For interactive exploration, Swagger UI is served at `/swagger` in the Development environment.

## Conventions

- **Format:** JSON in both directions, camelCase property names, `Content-Type: application/json`.
- **Authentication:** `Authorization: Bearer <accessToken>` on every endpoint except `health`, `register`, `login` and `refresh`.
- **Identifiers** are GUIDs. **Timestamps** are ISO 8601 in UTC.
- **Enums are sent as names** (the server also accepts numbers on input, but clients should send names):

| Enum | Values |
|---|---|
| `PlatformRole` | `User`, `Admin` |
| `ProjectRole` | `Owner`, `Member` |
| `ProjectStatus` | `Active`, `Completed`, `Archived` |
| `ResearchTaskStatus` | `ToDo`, `InProgress`, `Done` |
| `TaskPriority` | `Low`, `Medium`, `High` |

- **Normalisation:** strings are trimmed. Emails and tag names are lowercased.
- **Pagination:** none yet. List endpoints return everything the caller may see, except search, which is capped at 50.
- **Created resources** return `201` with a `Location` header. Deletes return `204`.

## Errors

Every error uses one shape. `detail` appears for most errors, and `errors` appears only for validation failures.

```json
{
  "title": "Validation failed",
  "status": 400,
  "traceId": "0HN8...",
  "errors": {
    "password": ["Password must be at least 8 characters."]
  }
}
```

| Status | Meaning |
|---|---|
| `400` | Validation failed (per-field `errors`), malformed JSON, or a request that is well formed but invalid, such as assigning a task to someone outside the project |
| `401` | Missing, invalid or expired token, or bad credentials |
| `403` | Authenticated, but not allowed to do this |
| `404` | The resource does not exist |
| `409` | Conflict, such as an email already registered, a user who is already a member, or removing a user who is not a member. Removing the last Owner of a project also returns `409`. |
| `500` | Unexpected server error. The message is generic. Quote the `traceId` when reporting it. |

## Health

| Method | Route | Auth | Success |
|---|---|---|---|
| GET | `/api/health` | none | `200 { "status": "Healthy", "timestampUtc": "..." }` |

## Auth

| Method | Route | Auth | Success |
|---|---|---|---|
| POST | `/api/auth/register` | none | `200` auth result |
| POST | `/api/auth/login` | none | `200` auth result |
| POST | `/api/auth/refresh` | none | `200` auth result |

**Register** body:

| Field | Rules |
|---|---|
| `email` | required, valid email, at most 256 characters, must not already be registered (`409`) |
| `displayName` | required, at most 100 characters |
| `password` | required, 8 to 128 characters |

**Login** body: `email`, `password` (both required). Wrong email and wrong password return the same `401`.

**Refresh** body: `{ "refreshToken": "..." }`. Refresh tokens are single use. A successful refresh returns a new pair and revokes the old token, and reusing an old token returns `401`.

**Auth result** (returned by all three):

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "base64...",
  "accessTokenExpiresAt": "2026-10-20T10:30:00Z",
  "user": { "id": "…", "email": "ana@example.com", "displayName": "Ana", "role": "User" }
}
```

Access tokens last 30 minutes by default and refresh tokens 7 days.

A legacy `GET /api/auth/me` still returns the raw claims (`userId`, `email`, `role`). Prefer `GET /api/users/me`.

## Users

| Method | Route | Purpose | Success |
|---|---|---|---|
| GET | `/api/users/me` | Your profile | `200` user |
| PUT | `/api/users/me` | Change your display name | `200` user |
| GET | `/api/users/lookup?email=` | Find a user by exact email, to invite them | `200` lookup, `404` if unknown |

`PUT /api/users/me` body: `{ "displayName": "..." }` (required, at most 100 characters).

User: `{ id, email, displayName, role }`. Lookup: `{ id, email, displayName }`.

## Projects

| Method | Route | Allowed | Success |
|---|---|---|---|
| GET | `/api/projects` | Any user | `200` list of summaries (only your projects, newest first) |
| POST | `/api/projects` | Any user | `201` project. You become its Owner. |
| GET | `/api/projects/{id}` | Members | `200` project |
| PUT | `/api/projects/{id}` | Owner | `200` project |
| DELETE | `/api/projects/{id}` | Owner | `204` |
| POST | `/api/projects/{id}/members` | Owner | `200` project |
| DELETE | `/api/projects/{id}/members/{userId}` | Owner | `200` project |

Create and update body: `name` (required, at most 200) and `description` (at most 2000).

Add member body: `{ "userId": "…", "role": "Member" }`. Adding someone who is already a member returns `409`. A project always keeps at least one Owner, so removing the last one returns `409`.

Summary: `{ id, name, description, status, createdAt, memberCount, myRole }`.

Project:

```json
{
  "id": "…", "name": "AI Research", "description": "…", "status": "Active", "createdAt": "…",
  "members": [ { "userId": "…", "displayName": "Ana", "role": "Owner", "joinedAt": "…" } ]
}
```

## Papers

| Method | Route | Allowed | Success |
|---|---|---|---|
| POST | `/api/projects/{projectId}/papers` | Members | `201` paper |
| GET | `/api/projects/{projectId}/papers` | Members | `200` list |
| GET | `/api/papers/search` | Any user | `200` list |
| GET | `/api/papers/{id}` | Members | `200` paper |
| PUT | `/api/papers/{id}` | Members | `200` paper |
| DELETE | `/api/papers/{id}` | Members | `204` |
| POST | `/api/papers/{id}/tags` | Members | `200` paper |
| DELETE | `/api/papers/{id}/tags/{tagId}` | Members | `200` paper |

**Create** body:

| Field | Rules |
|---|---|
| `title` | required, at most 500 |
| `authors` | at most 1000 |
| `abstract` | at most 4000 |
| `publicationDate` | optional date |
| `doiOrUrl`, `pdfReference` | optional, at most 500 each |
| `tags` | optional list of names, at most 20, each at most 100 |

**Update** takes the same fields without `tags`. Tags are managed with their own endpoints.

**Add tag** body: `{ "name": "computer-vision" }`. The tag is created in the paper's project if it does not exist yet. Adding a tag the paper already has changes nothing. Removing a tag the paper does not have also changes nothing.

**Filtering** a project's papers (all optional, combinable):

| Query | Effect |
|---|---|
| `tag` | Papers carrying this tag (case-insensitive) |
| `author` | Papers whose `authors` text contains this |
| `from`, `to` | Publication date range (inclusive) |

**Search** (`GET /api/papers/search?query=...&projectId=...`):

- Searches title, authors and abstract across every project you belong to. `projectId` narrows it to one project.
- `query` is required, 2 to 100 characters. It is split into words (at most 5 are used), and every word must match somewhere.
- Results are newest first, capped at 50. Papers from projects you are not in are never returned, and there is no `403` for them.

Paper:

```json
{
  "id": "…", "projectId": "…", "title": "…", "authors": "…", "abstract": "…",
  "publicationDate": "2017-06-12T00:00:00", "doiOrUrl": "…", "pdfReference": null,
  "addedByUserId": "…", "addedByName": "Ana", "createdAt": "…",
  "tags": [ { "id": "…", "name": "transformers" } ]
}
```

## Notes

| Method | Route | Allowed | Success |
|---|---|---|---|
| POST | `/api/papers/{paperId}/notes` | Project members | `201` note |
| GET | `/api/papers/{paperId}/notes` | Project members | `200` list, oldest first |
| PUT | `/api/notes/{id}` | The note's author only | `200` note |
| DELETE | `/api/notes/{id}` | The note's author only | `204` |

Body: `{ "content": "..." }` (required, at most 4000 characters). A project Owner cannot edit or delete another member's note; that returns `403`.

Note: `{ id, paperId, authorId, authorName, content, createdAt, updatedAt }`. `updatedAt` is `null` until the first edit.

## Tasks

| Method | Route | Allowed | Success |
|---|---|---|---|
| POST | `/api/projects/{projectId}/tasks` | Members | `201` task |
| GET | `/api/projects/{projectId}/tasks` | Members | `200` list, oldest first |
| GET | `/api/tasks/{id}` | Members | `200` task |
| PUT | `/api/tasks/{id}` | Creator or Owner | `200` task |
| DELETE | `/api/tasks/{id}` | Creator or Owner | `204` |
| PUT | `/api/tasks/{id}/assignee` | Creator or Owner | `200` task |
| PATCH | `/api/tasks/{id}/status` | Assignee or Owner | `200` task |

**Create** body:

| Field | Rules |
|---|---|
| `title` | required, at most 300 |
| `description` | at most 2000 |
| `priority` | required, a valid `TaskPriority` |
| `deadline` | optional date |
| `paperId` | optional. Must belong to the same project, otherwise `400`. |
| `assignedToUserId` | optional. Must be a member of the project, otherwise `400`. |

**Update** body: `title`, `description`, `priority`, `deadline`.

**Assign** body: `{ "userId": "…" }`, or `{ "userId": null }` to unassign.

**Status** body: `{ "status": "Done" }`. Moving a task to `Done` sets `completedAt`, and moving it back clears it. A task with no assignee can only have its status changed by an Owner.

Task:

```json
{
  "id": "…", "projectId": "…", "paperId": null, "title": "Read the paper", "description": "…",
  "status": "ToDo", "priority": "High", "deadline": null,
  "assignedToUserId": "…", "assignedToName": "Sam",
  "createdByUserId": "…", "createdByName": "Ana",
  "createdAt": "…", "completedAt": null
}
```

## CORS

Browsers may call the API from the origins listed under `Cors:AllowedOrigins` in configuration. Credentials (cookies) are not allowed, because tokens travel in the `Authorization` header.
