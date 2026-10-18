# Calibr8 Backend API Documentation

Base URL: `http://localhost:3000` (or your deployed server URL)  
All protected endpoints require the HTTP header:  
`Authorization: Bearer <jwt-token>`  
All endpoints accepting request bodies require:  
`Content-Type: application/json`

---

## Table of Contents
1. [Overview & Project Status](#1-overview--project-status)
2. [Health & System Endpoints](#2-health--system-endpoints)
3. [Topics API](#3-topics-api)
4. [Authentication API](#4-authentication-api)
5. [User Profile API](#5-user-profile-api)
6. [Onboarding & Calibration API](#6-onboarding--calibration-api)
7. [Error Handling & Status Codes](#7-error-handling--status-codes)

---

## 1. Overview & Project Status

- **Service**: Calibr8 Backend API (`v1.1.0`)
- **Runtime**: Node.js (ES Modules), Express.js
- **Database / ORM**: PostgreSQL via Neon Serverless Adapter with Prisma Client (plus automatic zero-config in-memory fallback for local development / testing)
- **Authentication**: JWT (JSON Web Tokens) with in-memory token revocation / blacklisting on logout
- **Features Implemented**:
  - Full Auth Lifecycle: Registration, Login, Token Revocation (Logout), Verification, and Password Change
  - Topics Categorization: Dedicated DSA topics and Core subjects
  - Flexible Onboarding:
    - 1-Click Beginner Preset (Auto-sets all topics to `easy` with baseline rating 800)
    - Custom difficulty across selected topics
    - Granular topic selections with rating mapping (`easy` / `beginner` = 800, `medium` / `mid` = 1200, `hard` / `advanced` = 1600)
  - User Profile: View current state and update user profile details

---

## 2. Health & System Endpoints

### `GET /`
Returns the interactive visual testing dashboard when accessed via a browser (`text/html`), or API metadata when requested as JSON (`Accept: application/json`).

- **Auth**: None
- **Headers (for JSON response)**: `Accept: application/json`
- **Response (200 OK)**:
```json
{
  "service": "Calibr8 Backend API",
  "status": "online",
  "version": "1.1.0",
  "features": [
    "User Registration, Login, Logout & Token Revocation",
    "DSA Topic Level Calibration (Easy, Mid, Hard)",
    "Beginner 1-Click Preset (Auto-sets all DSA topics to Easy, rating 800)",
    "Composite Rating Calculation & Difficulty Mapping",
    "Profile Management & Password Change"
  ],
  "endpoints": [
    { "method": "GET", "path": "/health", "description": "Health check" },
    { "method": "GET", "path": "/ping", "description": "Ping check" },
    { "method": "GET", "path": "/topics", "description": "List all topics" },
    { "method": "GET", "path": "/topics/dsa", "description": "List DSA topics specifically" },
    { "method": "POST", "path": "/auth/register", "description": "Register user" },
    { "method": "POST", "path": "/auth/login", "description": "Login user" },
    { "method": "POST", "path": "/auth/logout", "description": "Logout user / invalidate token (Protected)" },
    { "method": "GET", "path": "/auth/me", "description": "Verify token & get current user (Protected)" },
    { "method": "POST", "path": "/auth/change-password", "description": "Change password (Protected)" },
    { "method": "GET", "path": "/me", "description": "Get authenticated user (Protected)" },
    { "method": "PUT", "path": "/me", "description": "Update profile (Protected)" },
    { "method": "POST", "path": "/onboarding", "description": "Complete onboarding / set topic levels / beginner preset (Protected)" },
    { "method": "GET", "path": "/onboarding/status", "description": "Get onboarding status & topic levels (Protected)" }
  ]
}
```

---

### `GET /ping`
- **Auth**: None
- **Response (200 OK)**: Plain text: `pong`

---

### `GET /health`
- **Auth**: None
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "Calibr8 Backend",
  "timestamp": "2026-10-17T05:11:32.946Z"
}
```

---

## 3. Topics API

### `GET /topics` or `GET /topic`
Retrieves available topics. Returns both grouped arrays (`dsaTopics`, `coreTopics`) and the filtered list in `topics`.

- **Auth**: None
- **Query Parameters (Optional)**:
  - `?category=dsa` — filters `topics` list to return only DSA topics
  - `?category=core` — filters `topics` list to return only Core topics
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 9,
  "topics": [
    {
      "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
      "slug": "dsa-arrays",
      "name": "DSA - Arrays",
      "category": "DSA"
    },
    {
      "id": "129c373a-45b9-4394-9a53-fedd8e720401",
      "slug": "dsa-graphs-dp",
      "name": "DSA - Graphs & DP",
      "category": "DSA"
    },
    {
      "id": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d",
      "slug": "dsa-linked-list",
      "name": "DSA - Linked List",
      "category": "DSA"
    },
    {
      "id": "307747ce-a84c-44b9-9369-918891d20e3a",
      "slug": "dsa-stack-queue",
      "name": "DSA - Stack & Queue",
      "category": "DSA"
    },
    {
      "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d",
      "slug": "dsa-trees",
      "name": "DSA - Trees",
      "category": "DSA"
    },
    {
      "id": "core-aptitude",
      "slug": "aptitude",
      "name": "Aptitude",
      "category": "CORE"
    },
    {
      "id": "core-dbms",
      "slug": "dbms",
      "name": "DBMS",
      "category": "CORE"
    },
    {
      "id": "core-oops",
      "slug": "oops",
      "name": "OOPs",
      "category": "CORE"
    },
    {
      "id": "core-system-design",
      "slug": "system-design",
      "name": "System Design",
      "category": "CORE"
    }
  ],
  "dsaTopics": [
    { "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "slug": "dsa-arrays", "name": "DSA - Arrays", "category": "DSA" },
    { "id": "129c373a-45b9-4394-9a53-fedd8e720401", "slug": "dsa-graphs-dp", "name": "DSA - Graphs & DP", "category": "DSA" },
    { "id": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d", "slug": "dsa-linked-list", "name": "DSA - Linked List", "category": "DSA" },
    { "id": "307747ce-a84c-44b9-9369-918891d20e3a", "slug": "dsa-stack-queue", "name": "DSA - Stack & Queue", "category": "DSA" },
    { "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d", "slug": "dsa-trees", "name": "DSA - Trees", "category": "DSA" }
  ],
  "coreTopics": [
    { "id": "core-aptitude", "slug": "aptitude", "name": "Aptitude", "category": "CORE" },
    { "id": "core-dbms", "slug": "dbms", "name": "DBMS", "category": "CORE" },
    { "id": "core-oops", "slug": "oops", "name": "OOPs", "category": "CORE" },
    { "id": "core-system-design", "slug": "system-design", "name": "System Design", "category": "CORE" }
  ]
}
```

---

### `GET /topics/dsa` or `GET /topic/dsa`
Dedicated endpoint returning only DSA topics for selection dropdowns.

- **Auth**: None
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 5,
  "topics": [
    { "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "slug": "dsa-arrays", "name": "DSA - Arrays", "category": "DSA" },
    { "id": "129c373a-45b9-4394-9a53-fedd8e720401", "slug": "dsa-graphs-dp", "name": "DSA - Graphs & DP", "category": "DSA" },
    { "id": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d", "slug": "dsa-linked-list", "name": "DSA - Linked List", "category": "DSA" },
    { "id": "307747ce-a84c-44b9-9369-918891d20e3a", "slug": "dsa-stack-queue", "name": "DSA - Stack & Queue", "category": "DSA" },
    { "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d", "slug": "dsa-trees", "name": "DSA - Trees", "category": "DSA" }
  ],
  "dsaTopics": [
    { "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "slug": "dsa-arrays", "name": "DSA - Arrays", "category": "DSA" },
    { "id": "129c373a-45b9-4394-9a53-fedd8e720401", "slug": "dsa-graphs-dp", "name": "DSA - Graphs & DP", "category": "DSA" },
    { "id": "d0184833-be8d-467b-81e4-ebc4e2ccbd9d", "slug": "dsa-linked-list", "name": "DSA - Linked List", "category": "DSA" },
    { "id": "307747ce-a84c-44b9-9369-918891d20e3a", "slug": "dsa-stack-queue", "name": "DSA - Stack & Queue", "category": "DSA" },
    { "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d", "slug": "dsa-trees", "name": "DSA - Trees", "category": "DSA" }
  ]
}
```

---

## 4. Authentication API

### `POST /auth/register`
Creates a new user account.

- **Auth**: None
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": null,
    "rating": 800,
    "onboarded": false,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:12:48.611Z",
    "topics": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"success": false, "message": "email, password, and name are required."}`
  - `409 Conflict`: `{"success": false, "message": "An account with this email already exists."}`

---

### `POST /auth/login`
Authenticates an existing user with email and password.

- **Auth**: None
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": null,
    "rating": 800,
    "onboarded": false,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:12:48.611Z",
    "topics": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"success": false, "message": "email and password are required."}`
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password."}`

---

### `POST /auth/logout`
Revokes and blacklists the current JWT Bearer token so it can no longer be used.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Request Body**: None
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### `GET /auth/me` or `GET /auth/verify`
Verifies whether the current token is valid and returns the authenticated user profile.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Request Body**: None
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:13:03.401Z",
    "topics": [
      {
        "id": "f6603741-12ce-47e0-8fb2-db3f64bdac83",
        "userId": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        "topic": {
          "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
          "slug": "dsa-arrays",
          "name": "DSA - Arrays",
          "category": "DSA"
        }
      }
    ]
  }
}
```

---

### `POST /auth/change-password`
Updates the authenticated user's password.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Request Body**:
```json
{
  "oldPassword": "password123",
  "newPassword": "newSecretPassword456"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"success": false, "message": "oldPassword and newPassword are required."}`
  - `400 Bad Request`: `{"success": false, "message": "New password must be at least 6 characters."}`
  - `400 Bad Request`: `{"success": false, "message": "Current password is incorrect."}`

---

## 5. User Profile API

### `GET /me`
Retrieves the authenticated user profile along with their chosen topic selections.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:13:03.401Z",
    "topics": [
      {
        "id": "f6603741-12ce-47e0-8fb2-db3f64bdac83",
        "userId": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        "topic": {
          "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
          "slug": "dsa-arrays",
          "name": "DSA - Arrays",
          "category": "DSA"
        }
      }
    ]
  }
}
```

---

### `PUT /me`
Updates editable user profile details (e.g., user's full name).

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Request Body**:
```json
{
  "name": "Jane Smith"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Smith",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:13:17.105Z",
    "topics": [ ... ]
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"success": false, "message": "Name cannot be empty."}`

---

## 6. Onboarding & Calibration API

### `POST /onboarding` or `PUT /onboarding/levels`
Saves or updates the user's difficulty calibration and topic selections, marking `onboarded: true`.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)

#### Difficulty Rating Rules
| Difficulty Input Aliases | Normalized Difficulty | Assigned Rating |
| :--- | :--- | :--- |
| `easy`, `beginner` | `easy` | `800` |
| `medium`, `mid`, `intermediate` | `medium` | `1200` |
| `hard`, `advanced` | `hard` | `1600` |

#### Supported Payload Modes

##### Mode 1: 1-Click Beginner / All Topics Preset
Sets the difficulty for all topics automatically without manually selecting every topic ID.
```json
{
  "difficulty": "beginner",
  "topicIds": "all"
}
```
*(or simply `{ "difficulty": "easy" }`)*

##### Mode 2: Uniform Difficulty Across Selected Topic IDs
Sets a common difficulty level for chosen topic UUIDs.
```json
{
  "difficulty": "medium",
  "topicIds": [
    "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
    "379beec5-41a6-4dc8-b3b4-1beb98fe186d"
  ]
}
```

##### Mode 3: Granular Topic Selections Array
Passes individual items per topic.
```json
{
  "topicSelections": [
    { "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "difficulty": "easy" },
    { "topicId": "129c373a-45b9-4394-9a53-fedd8e720401", "difficulty": "medium" }
  ]
}
```

- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "createdAt": "2026-10-17T05:12:48.611Z",
    "updatedAt": "2026-10-17T05:13:03.401Z",
    "topics": [
      {
        "id": "f6603741-12ce-47e0-8fb2-db3f64bdac83",
        "userId": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        "topic": {
          "id": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
          "slug": "dsa-arrays",
          "name": "DSA - Arrays",
          "category": "DSA"
        }
      },
      {
        "id": "ef5ec326-e973-4278-9a5b-fe91e9c78195",
        "userId": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
        "topicId": "379beec5-41a6-4dc8-b3b4-1beb98fe186d",
        "topic": {
          "id": "379beec5-41a6-4dc8-b3b4-1beb98fe186d",
          "slug": "dsa-trees",
          "name": "DSA - Trees",
          "category": "DSA"
        }
      }
    ]
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"success": false, "message": "Please select at least 1 topic."}`
  - `400 Bad Request`: `{"success": false, "message": "difficulty must be one of: easy (beginner), medium (mid), hard (advanced)."}`
  - `400 Bad Request`: `{"success": false, "message": "One or more topic IDs are invalid."}`

---

### `GET /onboarding/status`
Fetches current onboarding state, calibrated rating, difficulty level, and user's chosen topics.

- **Auth**: Bearer Token (`Authorization: Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "topics": [
      {
        "id": "f6603741-12ce-47e0-8fb2-db3f64bdac83",
        "userId": "6170e73b-b9c5-4e11-b73c-6781ee571ceb",
        "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
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

## 7. Error Handling & Status Codes

All errors return a predictable JSON payload format:

```json
{
  "success": false,
  "message": "Specific error description message"
}
```

### Standard HTTP Status Codes

| Code | Status | When Triggered | Example Message |
| :--- | :--- | :--- | :--- |
| `200` | OK | Successful GET, PUT, or POST action | — |
| `201` | Created | Successful user creation | — |
| `400` | Bad Request | Missing required fields, invalid difficulty, or missing topics | `"email, password, and name are required."` |
| `401` | Unauthorized | Missing token, expired token, revoked token, or wrong password | `"No token provided. Please log in."` / `"Token has been revoked. Please log in again."` |
| `404` | Not Found | Target user or resource was not found | `"User not found."` |
| `409` | Conflict | Email already registered | `"An account with this email already exists."` |
| `500` | Internal Error | Unexpected unhandled server or database exception | `"Internal server error."` |




### Ayush raj k gyan le lo, kaam ayga
In the users table (prisma/schema.prisma & src/services/onboarding.service.js), the difficulty and rating columns represent the user's initial skill calibration for Data Structures & Algorithms (DSA) and technical interview preparation.
1. What Each Column Represents
Column	Type	Default	Description
difficulty	String?	null	The user's overall skill tier. Normalized into one of three standard values: "easy", "medium", or "hard".
rating	Int	800	A numerical baseline skill score (analogous to competitive programming or chess ratings), used for matching problem recommendations.
2. How They Are Selected & Calculated
A. Initial State (Registration)
When a user registers (POST /auth/register):
difficulty is initially null because the user has not yet completed the calibration onboarding.
rating defaults to 800 (defined by @default(800) in schema.prisma).
onboarded is false.
B. During Onboarding / Calibration (POST /onboarding)
Users calibrate their profile through one of three modes:
If the user sets individual difficulty levels for each DSA topic (e.g. Arrays = Hard, Trees = Medium, Linked Lists = Easy):
Per-topic point scores:
easy (or beginner) = 800
medium (or mid, intermediate) = 1200
hard (or advanced) = 1600
Average Composite Rating:
Difficulty Tier Mapping:
If 
 
 "hard"
If 
 
 "medium"
If 
 
 "easy"
If a user selects a single difficulty across chosen topics:
Selecting "easy" 
 rating = 800, difficulty = "easy"
Selecting "medium" 
 rating = 1200, difficulty = "medium"
Selecting "hard" 
 rating = 1600, difficulty = "hard"
Sending { "beginner": true } or { "topicIds": "all", "difficulty": "easy" }:
Automatically selects all topics.
Sets difficulty = "easy" and rating = 800.
Sets onboarded = true.