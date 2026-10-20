# Calibr8 Backend API Documentation

**Base URL**: `http://localhost:3000` (or deployed server URL)  
**Standard API Prefix**: `/api`  
**Authentication Header**: `Authorization: Bearer <jwt-token>` (for all protected endpoints)  
**Content-Type**: `application/json` (for all endpoints accepting JSON bodies)

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
9. [Utility Scripts & Database Seeding](#9-utility-scripts--database-seeding)
10. [Code Execution Notice](#10-code-execution-notice)
11. [Error Handling & Status Codes](#11-error-handling--status-codes)

---

## 1. Architecture & Design Principles

- **Routing Architecture**: Clean Router-Controller pattern. Each route group has its dedicated controller file (`*.controller.js`) encapsulating business logic, validation, and data persistence without redundant service indirection.
- **Consistent Namespace**: All business domain endpoints reside under the `/api` prefix (e.g., `/api/auth`, `/api/users`, `/api/topics`, `/api/onboarding`, `/api/problems`, `/api/social`).
- **Database & High Availability**: Powered by Prisma ORM. When connected to PostgreSQL or Neon via `DATABASE_URL`, live database queries are executed. When external database credentials are not present or temporarily unreachable, the backend seamlessly falls back to an in-memory mock store populated with the 15 bundled coding problem definitions, testcases, multi-language templates, and full authentication capabilities.

---

## 2. Health & System Endpoints

### `GET /`
Returns the interactive Developer Dashboard & API Explorer (HTML) or API specification (JSON).
- **Auth**: None
- **Headers**: Send `Accept: application/json` for machine-readable JSON metadata.
- **Response (200 OK - JSON mode)**:
```json
{
  "service": "Calibr8 Backend API",
  "status": "online",
  "version": "1.2.0",
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
Health check endpoint reporting service status.
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "Calibr8 Backend",
  "timestamp": "2026-10-20T14:30:00.000Z"
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
    "createdAt": "2026-10-20T14:20:00.000Z",
    "updatedAt": "2026-10-20T14:20:00.000Z",
    "topics": [],
    "socialAccounts": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### `POST /api/auth/login`
Authenticates user credentials and returns a JWT token.
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
Revokes the current JWT bearer token by adding its hash to the server-side revocation list.
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
Validates the active session token and returns full profile data.
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

### `GET /api/users/me`
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

### `PUT /api/users/me`
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

### `PATCH /api/users/me/language`
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
Lists all topics available in Calibr8, grouped by category (DSA vs Core subjects).
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
  "dsaTopics": [ ...5 DSA topics... ],
  "coreTopics": [ ...4 Core topics... ]
}
```

---

### `GET /api/topics/dsa`
Convenience route returning specifically the 5 DSA topics used in skill calibration.
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
Automatically calibrates all DSA topics to `easy` with starting rating of `800`.
```json
{
  "beginner": true
}
```

2. **Granular Topic Calibration (`topicLevels`)**:
Assigns a distinct skill level to each selected DSA topic:
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
Sets a uniform baseline across specified topics or all topics:
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
  - Overall rating is computed as the rounded average across calibrated topics:
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
Checks if the current user has completed onboarding and returns their active calibration levels.
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
Returns the list of 15 coding problems in the catalogue, with difficulty classification, limits, and count of testcases and code templates.
- **Auth**: None
- **Query Params (Optional)**:
  - `?difficulty=Easy` — filter by difficulty (`Easy`, `Medium`, `Hard`)
  - `?search=two` — keyword search in problem title, slug, or problem number
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "prob-count-even-numbers-001",
      "problemNumber": 1,
      "slug": "count-even-numbers-001",
      "title": "Count Even Numbers",
      "difficulty": "Easy",
      "timeLimit": 1000,
      "memoryLimit": 256,
      "_count": { "testcases": 50, "templates": 4 }
    },
    {
      "id": "prob-two-sum-001",
      "problemNumber": 14,
      "slug": "two-sum-001",
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
Fetches full problem definition by problem slug or problem number (e.g. `two-sum-001` or `14`).
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "prob-two-sum-001",
    "problemNumber": 14,
    "slug": "two-sum-001",
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
        "output": "[0,1]"
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

---

### `POST /api/problems`
Adds a new problem definition to the catalogue.
- **Auth**: None (or Admin)
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
    { "testIndex": 0, "isVisible": true, "stdinSmall": "[1,2,3,1]", "expectedSmall": "true" }
  ],
  "templates": {
    "python": "class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        pass"
  }
}
```
- **Response (201 Created)**: Returns the newly created problem object.

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
Handles OAuth redirection from the identity provider, validates state signature, links the profile to the user, and redirects to `FRONTEND_URL`.
- **Query Params**: `?code=...&state=...`

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

## 9. Utility Scripts & Database Seeding

The backend repository includes two purpose-built utility scripts in `./scripts/`:

### 1. `scripts/upload-problem.js`
- **Purpose**: Incremental ingestion of problem JSON files into the PostgreSQL database.
- **Idempotency**: Inspects existing problems by `slug`. If a problem already exists in the database, it **skips** it, preventing duplicate key errors and avoiding unnecessary overwrites.
- **Usage**:
  ```bash
  # Upload all JSON problems in ./problems
  node scripts/upload-problem.js ./problems

  # Upload a single problem JSON file
  node scripts/upload-problem.js ./problems/two-sum.json
  ```

### 2. `scripts/reset-and-upload.js`
- **Purpose**: Full database reset and fresh re-seeding for development and staging environments.
- **Behavior**: Safely truncates `problems`, `testcases`, `code_templates`, and `submissions` tables (restarting ID sequences), then iterates through all 15 JSON problem files in `./problems/` and imports them cleanly.
- **Usage**:
  ```bash
  node scripts/reset-and-upload.js
  ```

---

## 10. Code Execution Notice

Code execution runner (`/api/v1/runs`) and submission pipeline (`/api/v1/submissions`) are temporarily commented out and disabled as requested. The Judge0 sandbox runner and driver architecture are scheduled for Phase 2 implementation. The problem catalogue, testcases, and multi-language starter templates remain active and fully accessible via `/api/problems`.

---

## 11. Error Handling & Status Codes

All errors return a standardized JSON error response:

```json
{
  "success": false,
  "error": "Detailed error message here"
}
```

### Common HTTP Status Codes:
| Status Code | Meaning | Example Scenario |
|---|---|---|
| `200 OK` | Request succeeded | Successful GET, PUT, PATCH |
| `201 Created` | Resource created | Registration, problem creation |
| `400 Bad Request` | Validation failure | Missing required fields, invalid password length |
| `401 Unauthorized` | Invalid or expired token | Missing Bearer token or invalid credentials |
| `403 Forbidden` | Access revoked | Blacklisted token used after logout |
| `404 Not Found` | Resource does not exist | Topic, problem, or user not found |
| `409 Conflict` | Duplicate resource | Email or problem slug already in use |
| `500 Internal Error` | Server error | Unexpected unhandled exception |