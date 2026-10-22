# Calibr8 Backend API Documentation

**Base URL**: `http://localhost:3000` by default (`PORT` can override it; use the deployed server URL in production)  
**Standard API Prefix**: `/api`  
**Authentication Header**: `Authorization: Bearer <jwt-token>` (for all protected endpoints)  
**Content-Type**: `application/json` (for all endpoints accepting JSON bodies)

**Production configuration**: Set a private `JWT_SECRET`; the code has an insecure development fallback. Set `OAUTH_STATE_SECRET` (or a secure `JWT_SECRET`) for OAuth state signing. JWTs expire after 7 days by default; `JWT_EXPIRES_IN` can override this.

---

## Table of Contents

1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Health & System Endpoints](#2-health--system-endpoints)
3. [Authentication API (`/api/auth`)](#3-authentication-api-apiauth)
4. [User Profile API (`/api/users`)](#4-user-profile-api-apiusers)
5. [Topics API (`/api/topics`)](#5-topics-api-apitopics)
6. [Onboarding & Skill Calibration API (`/api/onboarding`)](#6-onboarding--skill-calibration-api-apionboarding)
7. [Problems Catalogue API (`/api/problems`)](#7-problems-catalogue-api-apiproblems)
8. [Social & OAuth API (`/api/social`)](#8-social--oauth-api-apisocial)
9. [CS Curriculum & Study Material API (`/api/study`)](#9-cs-curriculum--study-material-api-apistudy)
10. [Utility Scripts & Database Management](#10-utility-scripts--database-management)
11. [Code Execution Notice](#11-code-execution-notice)
12. [Error Handling & Status Codes](#12-error-handling--status-codes)

---

## 1. Architecture & Design Principles

- **Express and Prisma**: Express routers are mounted from `src/routers/index.router.js`; controllers use Prisma for database access. OAuth integration is handled in `src/controllers/social.controller.js`.
- **Consistent Namespace**: Mounted business endpoints reside under the `/api` prefix (e.g., `/api/auth`, `/api/users`, `/api/topics`, `/api/onboarding`, `/api/problems`, `/api/social`, `/api/study`).
- **Database Connection**: Prisma connects to PostgreSQL through the configured Neon adapter using `DATABASE_URL`. The schema includes users, topic calibration, problems, testcases, starter templates, social accounts, and study-curriculum models.

> **Route availability:** `/api/dsa-topics` is not mounted. The structured DSA problem-category list handler is present in `topic.controller.js`, but its `/api/topics/dsa` route is registered after another handler for the same path, so it is shadowed. The active `/api/topics/dsa` endpoint returns calibration topics instead. Code-execution router handlers are also not mounted; see [Code Execution Notice](#11-code-execution-notice).

---

## 2. Health & System Endpoints

### `GET /`

Serves the interactive Developer Dashboard (HTML) when HTML is accepted, otherwise returns API metadata JSON. The metadata is a hard-coded summary, not a complete or authoritative endpoint catalog: it currently says 15 problems, describes beginner calibration as DSA-only, and omits the mounted `/api/study` group.

- **Auth**: None
- **Headers**: Send `Accept: application/json` for machine-readable JSON metadata.
- **Response (200 OK - JSON mode)**:

```json
{
  "service": "Calibr8 Backend API",
  "status": "online",
  "version": "1.2.0",
  "architecture": {
    "pattern": "Router-Controller-Model",
    "namingConvention": "*.router.js, *.controller.js"
  },
  "features": [
    "User Registration, Login, Logout & Token Revocation",
    "DSA Topic Level Calibration (Easy, Mid, Hard)",
    "Beginner 1-Click Preset (Auto-sets all DSA topics to Easy, rating 800)",
    "Composite Rating Calculation & Difficulty Mapping",
    "Profile Management & Language Preferences",
    "Problem Catalogue (15 coding problems with testcases & multi-language starter templates)",
    "GitHub OAuth Account Linking"
  ],
  "apiGroups": {
    "auth": "/api/auth",
    "users": "/api/users",
    "topics": "/api/topics",
    "onboarding": "/api/onboarding",
    "problems": "/api/problems",
    "social": "/api/social"
  }
}
```

---

### `GET /health` or `GET /api/health`

Health check endpoint reporting backend service status and current timestamp. It does not check database connectivity.

- **Auth**: None
- **Response (200 OK)**:

```json
{
  "status": "ok",
  "service": "Calibr8 Backend",
  "timestamp": "2026-10-21T19:30:00.000Z"
}
```

---

### `GET /ping` or `GET /api/ping`

Ultra-fast lightweight latency probe.

- **Auth**: None
- **Response (200 OK)**:

```
pong
```

---

## 3. Authentication API (`/api/auth`)

### `POST /api/auth/register`

Creates a new user account, hashes the password using bcrypt, and issues a signed JWT token.

- **Auth**: None
- **Request Body**:

```json
{
  "name": "Alex Chen",
  "email": "alex@calibr8.dev",
  "password": "Password123!"
}
```

- **Response (201 Created)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "email": "alex@calibr8.dev",
    "name": "Alex Chen",
    "difficulty": null,
    "rating": 800,
    "onboarded": false,
    "preferredLanguage": "cpp",
    "createdAt": "2026-10-21T14:20:00.000Z",
    "updatedAt": "2026-10-21T14:20:00.000Z",
    "topics": [],
    "socialAccounts": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### `POST /api/auth/login`

Authenticates user credentials and returns user details with a signed JWT token.

- **Auth**: None
- **Request Body**:

```json
{
  "email": "alex@calibr8.dev",
  "password": "Password123!"
}
```

- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "email": "alex@calibr8.dev",
    "name": "Alex Chen",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "preferredLanguage": "cpp"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### `POST /api/auth/logout`

Adds the current JWT bearer token to an in-memory revocation set. Revocation is process-local and is lost when the server restarts; it is not a persistent server-side token store.

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### `GET /api/auth/me` or `GET /api/auth/verify`

Validates the active session token and returns the current user profile.

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "email": "alex@calibr8.dev",
    "name": "Alex Chen",
    "difficulty": "medium",
    "rating": 1200,
    "onboarded": true,
    "preferredLanguage": "python",
    "topics": [ ... ]
  }
}
```

---

### `POST /api/auth/change-password`

Changes the authenticated user's password after verifying their current password.

- **Auth**: Required (`Bearer <token>`)
- **Request Body**:

```json
{
  "oldPassword": "Password123!",
  "newPassword": "NewStrongPassword456!"
}
```

- **Response (200 OK)**:

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

---

## 4. User Profile API (`/api/users`)

### `GET /api/users/me` (or `GET /api/users`)

Retrieves the authenticated user's complete profile, including onboarding status, rating, calibrated topic levels, and linked social accounts.

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "email": "alex@calibr8.dev",
    "name": "Alex Chen",
    "difficulty": "medium",
    "rating": 1200,
    "onboarded": true,
    "preferredLanguage": "cpp",
    "topics": [
      {
        "id": "...",
        "userId": "511f2a74-...",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        "level": "hard",
        "topic": {
          "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
          "slug": "dsa-arrays",
          "name": "DSA - Arrays",
          "category": "DSA"
        }
      }
    ],
    "socialAccounts": []
  }
}
```

---

### `PUT /api/users/me` (or `PUT /api/users`)

Updates editable profile fields (such as user name).

- **Auth**: Required (`Bearer <token>`)
- **Request Body**:

```json
{
  "name": "Alexandre Chen"
}
```

- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "name": "Alexandre Chen"
  }
}
```

---

### `PATCH /api/users/me/language` (or `PATCH /api/users/language`)

Updates the user's preferred default programming language.

- **Auth**: Required (`Bearer <token>`)
- **Allowed Languages**: `cpp`, `c`, `java`, `python`, `javascript`
- **Request Body**:

```json
{
  "language": "python"
}
```

- **Response (200 OK)**:

```json
{
  "success": true,
  "language": "python"
}
```

---

## 5. Topics API (`/api/topics`)

### `GET /api/topics`

Lists database `Topic` records and also returns the DSA/Core partitions. The seed script creates 5 DSA and 4 CORE records; the live count depends on database contents.

- **Auth**: None
- **Query Params (Optional)**:
  - `?category=dsa` — filters to DSA topics only
  - `?category=core` — filters to Core subjects (DBMS, OOPs, System Design, Aptitude)
- **Response (200 OK)**:

```json
{
  "success": true,
  "count": 9,
  "topics": [
    { "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "slug": "dsa-arrays", "name": "DSA - Arrays", "category": "DSA" },
    { "id": "129c373a-45b9-4394-9a53-fedd8e720401", "slug": "dsa-graphs-dp", "name": "DSA - Graphs & DP", "category": "DSA" },
    { "id": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d", "slug": "dsa-linked-list", "name": "DSA - Linked List", "category": "DSA" },
    { "id": "307747ce-a84c-44b9-9369-918891d20e3a", "slug": "dsa-stack-queue", "name": "DSA - Stack & Queue", "category": "DSA" },
    { "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d", "slug": "dsa-trees", "name": "DSA - Trees", "category": "DSA" },
    { "id": "core-aptitude", "slug": "aptitude", "name": "Aptitude", "category": "CORE" },
    { "id": "core-dbms", "slug": "dbms", "name": "DBMS", "category": "CORE" },
    { "id": "core-oops", "slug": "oops", "name": "OOPs", "category": "CORE" },
    { "id": "core-system-design", "slug": "system-design", "name": "System Design", "category": "CORE" }
  ],
  "dsaTopics": [ ...DSA topics from the database... ],
  "coreTopics": [ ...non-DSA topics from the database... ]
}
```

When `category=dsa` or `category=core` is supplied, only the `topics` array and `count` are filtered; `dsaTopics` and `coreTopics` still contain their full respective lists. Unknown category values leave `topics` unfiltered.

---

### `GET /api/topics/dsa`

Returns topic records categorized as DSA, used for skill calibration. The seed script creates five such records; the live count depends on the database.

- **Auth**: None
- **Response (200 OK)**:

```json
{
  "success": true,
  "count": 5,
  "topics": [ ...5 DSA topics... ],
  "dsaTopics": [ ...5 DSA topics... ]
}
```

---

### `GET /api/topics/dsa/:slug/problems`

Fetches all coding problems belonging to a specific DSA topic category (from `DsaTopic`).

- **Auth**: None
- **Parameters**: `slug` (e.g. `arrays`, `linked-list`, `dynamic-programming`)
- **Query Params (Optional)**:
  - `?difficulty=Easy` (filter by `Easy`, `Medium`, `Hard`)
  - `?search=target` (keyword search in problem title or slug)
- **Response (200 OK)**:

```json
{
  "topic": {
    "id": "clx123abc",
    "slug": "arrays",
    "name": "Arrays"
  },
  "count": 12,
  "problems": [
    {
      "id": "prob-two-sum",
      "problemNumber": 1,
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "tags": ["Array", "Hash Table"]
    }
  ]
}
```

---

### `GET /api/topics/dsa-topics` (or `GET /api/dsa-topics`)

**Not currently available.** Neither path is mounted. The controller contains a structured DSA category-list handler, but a second `GET /api/topics/dsa` registration is shadowed by the earlier calibration-topic handler. The active `GET /api/topics/dsa` response is documented above; use it only for calibration topics.

---

### `GET /api/topics/:identifier`

Fetches a single topic by its UUID `id` or string `slug` (e.g. `dsa-arrays` or `dbms`).

- **Auth**: None
- **Response (200 OK)**:

```json
{
  "success": true,
  "topic": {
    "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
    "slug": "dsa-arrays",
    "name": "DSA - Arrays",
    "category": "DSA"
  }
}
```

---

## 6. Onboarding & Skill Calibration API (`/api/onboarding`)

### `POST /api/onboarding` or `PUT /api/onboarding/levels`

Completes the user's initial onboarding or updates their calibration profile.

#### Supported Calibration Modes:

1. **Beginner 1-Click Preset**:
   Automatically selects all records in the `Topic` table and assigns them `easy` with a starting rating of `800` (the seed data contains both DSA and CORE topics; this is not DSA-only).

```json
{
  "beginner": true
}
```

2. **Granular Topic Calibration (`topicLevels`)**:
   Assigns a distinct skill level to each selected topic ID. Although the example uses DSA topics, the backend accepts any existing `Topic` record:

```json
{
  "topicLevels": [
    { "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "level": "hard" },
    { "topicId": "129c373a-45b9-4394-9a53-fedd8e720401", "level": "mid" },
    { "topicId": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d", "level": "easy" },
    { "topicId": "307747ce-a84c-44b9-9369-918891d20e3a", "level": "easy" },
    { "topicId": "379beec5-41a6-4dc8-b3b4-1beb98fe186d", "level": "mid" }
  ]
}
```

3. **Uniform Difficulty Preset**:
   Sets a uniform baseline across specified topic IDs or all records when `topicIds` is `"all"` (including CORE topics):

```json
{
  "difficulty": "medium",
  "topicIds": "all"
}
```

- **Rating Mapping Formula**:
  - `easy` (or `beginner`) = 800 pts
  - `medium` (or `mid`, `intermediate`) = 1200 pts
  - `hard` (or `advanced`) = 1600 pts
  - For `topicLevels`/`topicSelections`, rating is the rounded average of the supplied per-topic levels. For a uniform `difficulty` request, rating is that level's mapped value:
    - `< 1000` $\rightarrow$ `easy`
    - `1000 – 1399` $\rightarrow$ `medium`
    - `≥ 1400` $\rightarrow$ `hard`

- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "email": "alex@calibr8.dev",
    "name": "Alex Chen",
    "difficulty": "medium",
    "rating": 1120,
    "onboarded": true,
    "topics": [
      {
        "id": "...",
        "userId": "511f2a74-...",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        "level": "hard",
        "topic": {
          "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
          "slug": "dsa-arrays",
          "name": "DSA - Arrays"
        }
      }
    ]
  }
}
```

---

### `GET /api/onboarding/status`

Returns the current user's onboarding fields and topic calibration records; the status is represented by `user.onboarded` rather than a separate flag.

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "id": "511f2a74-9021-4620-8e47-c52ec580a8d9",
    "onboarded": true,
    "difficulty": "medium",
    "rating": 1120,
    "preferredLanguage": "cpp",
    "topics": [ ... ]
  }
}
```

---

### `PATCH /api/onboarding/language`

Sets or updates preferred programming language during onboarding.

- **Auth**: Required (`Bearer <token>`)
- **Request Body**:

```json
{
  "language": "python"
}
```

- **Response (200 OK)**:

```json
{
  "success": true,
  "language": "python"
}
```

---

## 7. Problems Catalogue API (`/api/problems`)

### `GET /api/problems`

Returns the list of coding problems in the catalogue, with difficulty classification, limits, and count of testcases and code templates.

- **Auth**: None
- **Query Params (Optional)**:
  - `?difficulty=Easy` — filter by difficulty (`Easy`, `Medium`, `Hard`)
  - `?search=two` — keyword search in problem title, slug, or problem number
- The `count` is computed from the database and varies with the active filters and catalogue contents.
- **Response (200 OK)**:

```json
{
  "success": true,
  "count": 130,
  "data": [
    {
      "id": "prob-two-sum",
      "problemNumber": 1,
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "timeLimit": 1000,
      "memoryLimit": 256,
      "_count": { "testcases": 6, "templates": 4 }
    }
  ]
}
```

---

### `GET /api/problems/:slug`

Fetches full problem definition by problem slug or problem number (e.g. `two-sum` or `1`).

**Data visibility:** The current controller returns every testcase, including records where `isVisible` is `false`; hidden cases are therefore not protected by this endpoint.

- **Auth**: None
- **Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "prob-two-sum",
    "problemNumber": 1,
    "slug": "two-sum",
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    "difficulty": "Easy",
    "timeLimit": 1000,
    "memoryLimit": 256,
    "testcases": [
      {
        "testIndex": 0,
        "isVisible": true,
        "input": "[2,7,11,15]\n9",
        "output": "[0,1]",
        "stdinSmall": "[2,7,11,15]\n9",
        "expectedSmall": "[0,1]"
      }
    ],
    "templates": {
      "python": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      "javascript": "class Solution {\n    twoSum(nums, target) {\n        // write code here\n    }\n}",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}"
    }
  }
}
```

The abbreviated example omits `templatesArray`, which is also present in the actual detail response and contains the raw template records.

---

### `POST /api/problems`

Adds a new problem definition to the catalogue. Only `slug` and `title` are required; description, difficulty, limits, testcases, and templates are optional.

- **Auth**: None. No admin authorization is implemented on this route; do not expose it to untrusted clients without adding access control.
- **Request Body**:

```json
{
  "slug": "contains-duplicate-001",
  "title": "Contains Duplicate",
  "description": "Given an integer array nums, return true if any value appears at least twice in the array.",
  "difficulty": "Easy",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "testcases": [
    {
      "testIndex": 0,
      "isVisible": true,
      "stdinSmall": "[1,2,3,1]",
      "expectedSmall": "true"
    }
  ],
  "templates": {
    "python": "class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        pass"
  }
}
```

- **Response (201 Created)**: `{ "success": true, "data": ... }`, containing the created problem, nested testcases/templates, and `_count`.

---

## 8. Social & OAuth API (`/api/social`)

### `GET /api/social/:provider/link-url`

Generates a signed OAuth authorization URL for account linking (currently supports `github`).

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "url": "https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&scope=read%3Auser+user%3Aemail&state=..."
}
```

---

### `GET /api/social/:provider/callback`

Handles the OAuth redirect without a bearer token (the signed, expiring `state` contains the linking user's ID), links the provider profile, and redirects to `FRONTEND_URL` (default `http://localhost:5173`). Failure/cancellation is reported in the redirect query string as `link_error`; success uses `linked`.

- **Query Params**: `?code=...&state=...`
- **Current provider**: `github`. If GitHub credentials are missing, the callback uses a demo profile instead of contacting GitHub.

---

### `DELETE /api/social/:provider`

Unlinks the specified social provider from the authenticated user's account.

- **Auth**: Required (`Bearer <token>`)
- **Response (200 OK)**:

```json
{
  "success": true,
  "count": 1
}
```

---

## 9. CS Curriculum & Study Material API (`/api/study`)

Computer science curriculum endpoints for study subjects, chapters, topics, lesson content, and MCQs. The available records and counts depend on uploaded database content.

### `GET /api/study/subjects`

Returns all study subjects currently in the database, with chapter counts and descriptions. Subject/chapter/topic totals depend on uploaded study data and are not guaranteed by the route.

- **Auth**: None
- **Response (200 OK, example; IDs and counts vary by database)**:

```json
[
  {
    "id": "subj-oops",
    "slug": "oops",
    "name": "Object-Oriented Programming Systems",
    "order": 1,
    "description": "Master object-oriented programming foundations...",
    "_count": { "chapters": 14 }
  },
  {
    "id": "subj-system-design",
    "slug": "system-design",
    "name": "System Design",
    "order": 2,
    "_count": { "chapters": 16 }
  },
  {
    "id": "subj-dbms",
    "slug": "dbms",
    "name": "Database Management Systems",
    "order": 3,
    "_count": { "chapters": 16 }
  },
  {
    "id": "subj-os",
    "slug": "os",
    "name": "Operating System",
    "order": 4,
    "_count": { "chapters": 16 }
  },
  {
    "id": "subj-cn",
    "slug": "cn",
    "name": "Computer Networks",
    "order": 5,
    "_count": { "chapters": 13 }
  }
]
```

---

### `GET /api/study/subjects/:subjectSlug` (or `/api/study/subjects/:subjectSlug/chapters`)

Retrieves the subject record and its ordered chapter list with topic counts.

- **Auth**: None
- **Parameters**: `subjectSlug` (e.g. `oops`, `system-design`, `dbms`, `os`, `cn`)
- **Response (200 OK)**:

```json
{
  "id": "subj-oops",
  "slug": "oops",
  "name": "Object-Oriented Programming Systems",
  "chapters": [
    {
      "id": "ch-oops-1",
      "slug": "programming-paradigms-and-foundations",
      "name": "Programming Paradigms and OOP Foundations",
      "order": 1,
      "_count": { "topics": 1 }
    }
  ]
}
```

---

### `GET /api/study/chapters/:chapterId/topics`

Retrieves all topics belonging to a chapter. `chapterId` must be the chapter's database ID; a chapter slug is not resolved by this handler.

- **Auth**: None
- **Parameters**: `chapterId` (database ID)
- **Response (200 OK)**:

```json
[
  {
    "id": "topic-oops-1",
    "slug": "paradigms-and-oop-foundations",
    "name": "Programming Paradigms and the Foundations of OOP",
    "order": 1
  }
]
```

---

### `GET /api/study/topics/:topicSlug`

Fetches the topic record, markdown content, MCQs, and related chapter/subject records. The number and structure of markdown sections depend on stored content.

- **Auth**: None
- **Parameters**: `topicSlug` (e.g. `paradigms-and-oop-foundations`, `ipv4-subnetting-and-cidr`)
- **Security**: `correctIndex` is omitted from MCQs returned by this GET endpoint. The submit endpoint currently returns `correctIndex` in its result, so quiz answers can be inspected after submission.
- **Response (200 OK)**:

```json
{
  "id": "topic-oops-1",
  "slug": "paradigms-and-oop-foundations",
  "name": "Programming Paradigms and the Foundations of OOP",
  "content": "# Programming Paradigms and the Foundations of OOP\n\n## 1. Introduction...",
  "mcqs": [
    {
      "id": "topic-oops-mcq-1",
      "question": "Which of the following correctly describes an object’s identity in C++?",
      "options": [
        "The collection of all values stored in its member variables",
        "Its unique location in memory, represented by its pointer/address",
        "The name of the variable referring to the object in source code",
        "The cryptographic hash of its public member functions"
      ],
      "difficulty": "Easy",
      "order": 1,
      "explanation": "An object’s identity is its unique memory address..."
    }
  ],
  "chapter": {
    "name": "Programming Paradigms and OOP Foundations",
    "subject": { "name": "Object-Oriented Programming Systems", "slug": "oops" }
  }
}
```

---

### `POST /api/study/topics/:topicSlug/submit`

Evaluates submitted multiple-choice answers and returns the score plus per-question correctness, correct index, and explanation. It does not return the submitted answer, percentage, pass status, or topic slug.

- **Auth**: None
- **Parameters**: `topicSlug`
- **Request Body**:

```json
{
  "answers": {
    "topic-oops-mcq-1": 1,
    "topic-oops-mcq-2": 0
  }
}
```

- **Response (200 OK)**:

```json
{
  "score": 1,
  "total": 4,
  "result": [
    {
      "mcqId": "topic-oops-mcq-1",
      "isCorrect": true,
      "correctIndex": 1,
      "explanation": "An object's identity is its unique memory address..."
    }
  ]
}
```

This route currently does not validate that the topic exists or that `answers` is present; malformed requests can produce a `500` response.

---

## 10. Utility Scripts & Database Management

The repository includes scripts under `./scripts/` and `./prisma/` to manage database schema, problems, and study curriculum:

### 1. `scripts/seedProblems.js` (`npm run problems:seed`)

- **Purpose**: Ingests problem JSON definitions in `./problems/` into PostgreSQL.
- **Safety**: Inspects existing problems by `slug` and skips duplicates safely.
- **Command**: `npm run problems:seed` or `node scripts/seedProblems.js`

### 2. `scripts/upload-study.js`

- **Purpose**: Reads subject/chapter/topic JSON files in `./study-material/` and upserts their lessons and MCQs into the database. It does not remove database records missing from the source tree.
- **Command**: `node scripts/upload-study.js`

### 3. `scripts/upload-problem.js`

- **Purpose**: Ingests a specific problem JSON file or directory into PostgreSQL.
- **Command**: `node scripts/upload-problem.js ./problems/two-sum.json`

### 4. `scripts/reset-and-upload.js`

- **Purpose**: Full database reset and fresh re-seeding for development environments (normally truncates problem, testcase, template, and submission tables).
- **Warning**: Destructive operation. Do not run against a database containing data you need to keep. Its fallback cleanup may not remove submissions.
- **Command**: `node scripts/reset-and-upload.js`

### 5. `scripts/bulk-push.js`

- **Purpose**: Bulk pushes specified problem JSON files using pg connection pool.
- **Command**: `node scripts/bulk-push.js ./problems/file1.json ./problems/file2.json`

### 6. `prisma/seed.js` (`npm run seed` or `npm run db:seed`)

- **Purpose**: Seeds the 9 initial topic categories (5 DSA topics: Arrays, Linked List, Trees, Stack & Queue, Graphs & DP; and 4 Core subjects: DBMS, OOPs, System Design, Aptitude).
- **Command**: `npm run seed`

---

## 11. Code Execution Notice

The execution router is not mounted in `src/routers/index.router.js`, and its route registrations are commented out. There are currently no reachable run, submission, submission-status, or language-list API endpoints. The execution controller file is not an active API. Problem data, testcases, and templates remain accessible via `/api/problems`; catalogue size depends on database contents.

---

## 12. Error Handling & Status Codes

Errors sent through the global error middleware use this JSON structure:

```json
{
  "success": false,
  "message": "Detailed error description"
}
```

Some topic and study controllers handle errors directly and instead return `{ "error": "..." }`; error payloads are therefore not uniform across all routes.

### HTTP Status Code Reference:

| Status Code          | Meaning                 | Typical Scenario                                              |
| -------------------- | ----------------------- | ------------------------------------------------------------- |
| `200 OK`             | Request succeeded       | Successful GET, PUT, PATCH                                    |
| `201 Created`        | Resource created        | Registration, problem creation                                |
| `400 Bad Request`    | Validation failure      | Missing required fields, short new password, invalid language |
| `401 Unauthorized`   | Authentication required | Missing, invalid, expired, or revoked Bearer token            |
| `404 Not Found`      | Resource not found      | Invalid topic ID, problem slug, or subject                    |
| `409 Conflict`       | Duplicate resource      | Account with email already exists                             |
| `500 Internal Error` | Server error            | Unhandled exception or database operation failure             |
