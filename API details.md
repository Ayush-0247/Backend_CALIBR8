# API Details — Calibr8 Backend

Base URL: `http://localhost:3000` (or your deployed app URL)

---

## 1. Health & Status

### `GET /`
- **Auth**: None
- **Body**: None
- **Response (200)**:
```json
{
  "name": "Calibr8 Backend API",
  "status": "online",
  "endpoints": ["/ping", "/health", "/topics", "/topic", "/auth/register", "/auth/login", "/me", "/onboarding"]
}
```

### `GET /ping`
- **Auth**: None
- **Body**: None
- **Response (200)**: `pong`

### `GET /health`
- **Auth**: None
- **Body**: None
- **Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-16T21:00:00.000Z"
}
```

---

## 2. Topics & DSA Dropdown

### `GET /topics` or `GET /topic`
- **Auth**: None
- **Query Params (Optional)**:
  - `?category=dsa` — returns DSA topics in `topics`
  - `?category=core` — returns Core subjects in `topics`
- **Response (200)**:
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

## 3. Authentication

### `POST /auth/register`
- **Auth**: None
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```
- **Response (201)**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": null,
    "rating": 800,
    "onboarded": false,
    "topics": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /auth/login`
- **Auth**: None
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```
- **Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": null,
    "rating": 800,
    "onboarded": false,
    "topics": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 4. User & Onboarding (Protected)

### `GET /me`
- **Auth**: Bearer Token
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "medium",
    "rating": 1200,
    "onboarded": true,
    "topics": [
      {
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

### `POST /onboarding`
- **Auth**: Bearer Token
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

#### Option A: Global Difficulty across all topics (e.g. beginner in all)
```json
{
  "difficulty": "beginner",
  "topicIds": "all"
}
```

#### Option B: Difficulty across selected DSA topics
```json
{
  "difficulty": "easy",
  "topicIds": [
    "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
    "379beec5-41a6-4dc8-b3b4-1beb98fe186d"
  ]
}
```
*(difficulty options: `easy` / `beginner` $\rightarrow$ 800 rating, `medium` / `mid` $\rightarrow$ 1200 rating, `hard` / `advanced` $\rightarrow$ 1600 rating)*

#### Option C: Granular topic selections
```json
{
  "topicSelections": [
    { "topicId": "682fa01e-c76b-4b5f-a59e-9ce3ac56f259", "difficulty": "easy" },
    { "topicId": "129c373a-45b9-4394-9a53-fedd8e720401", "difficulty": "medium" }
  ]
}
```

- **Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "difficulty": "easy",
    "rating": 800,
    "onboarded": true,
    "topics": [
      {
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
