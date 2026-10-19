import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./auth.router.js";
import userRouter from "./user.router.js";
import topicRouter from "./topic.router.js";
import onboardingRouter from "./onboarding.router.js";
import socialRouter from "./social.router.js";
import problemRouter from "./problem.router.js";
import executionRouter from "./execution.router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Health & utility routes
router.get("/ping", (req, res) => res.status(200).send("pong"));
router.get("/health", (req, res) =>
  res.status(200).json({
    status: "ok",
    service: "Calibr8 Backend",
    timestamp: new Date().toISOString(),
  }),
);

// Authentication API (/auth & /api/auth)
router.use("/auth", authRouter);
router.use("/api/auth", authRouter);

// Topics API (/topics, /topic & /api/topics)
router.use("/topics", topicRouter);
router.use("/topic", topicRouter);
router.use("/api/topics", topicRouter);

// Onboarding & Calibration API (/onboarding & /api/onboarding)
router.use("/onboarding", onboardingRouter);
router.use("/api/onboarding", onboardingRouter);

// User Profile API (/me, /users, /api/users)
router.use("/users", userRouter);
router.use("/api/users", userRouter);
router.use("/", userRouter);

// Social & OAuth API (/api/social & /social)
router.use("/api/social", socialRouter);
router.use("/social", socialRouter);

// Problems API (/api/problems & /problems)
router.use("/api/problems", problemRouter);
router.use("/problems", problemRouter);

// Code Execution & Runner API (/api/v1 & /api)
router.use("/api/v1", executionRouter);
router.use("/api/execution", executionRouter);
router.use("/api", executionRouter);

// Root endpoint: API documentation & interactive developer dashboard
router.get("/", (req, res) => {
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "../../public/index.html"));
  } else {
    res.status(200).json({
      service: "Calibr8 Backend API",
      status: "online",
      version: "1.2.0",
      architecture: {
        pattern: "Router-Controller-Service-Model",
        namingConvention: "*.router.js, *.controller.js, *.service.js",
      },
      features: [
        "User Registration, Login, Logout & Token Revocation",
        "DSA Topic Level Calibration (Easy, Mid, Hard)",
        "Beginner 1-Click Preset (Auto-sets all DSA topics to Easy, rating 800)",
        "Composite Rating Calculation & Difficulty Mapping",
        "Profile Management & Language Preferences",
        "Problem Catalogue (15 coding problems with testcases & multi-language starter templates)",
        "Code Execution Runner & Submission Pipeline (Python, JavaScript, C++, Java)",
        "GitHub OAuth Account Linking",
      ],
      apiGroups: {
        auth: "/api/auth or /auth",
        users: "/api/users or /me",
        topics: "/api/topics or /topics",
        onboarding: "/api/onboarding or /onboarding",
        problems: "/api/problems or /problems",
        execution: "/api/v1 or /api",
        social: "/api/social",
      },
      endpoints: [
        { method: "GET", path: "/health", description: "Health check" },
        { method: "GET", path: "/ping", description: "Ping check" },
        { method: "GET", path: "/topics", description: "List all topics with categories" },
        { method: "GET", path: "/topics/dsa", description: "List DSA topics specifically" },
        { method: "POST", path: "/auth/register", description: "Register new user account" },
        { method: "POST", path: "/auth/login", description: "Authenticate and get JWT token" },
        { method: "POST", path: "/auth/logout", description: "Revoke token (Protected)" },
        { method: "GET", path: "/auth/me", description: "Verify token & retrieve current user (Protected)" },
        { method: "POST", path: "/auth/change-password", description: "Change user password (Protected)" },
        { method: "GET", path: "/me", description: "Get authenticated profile (Protected)" },
        { method: "PUT", path: "/me", description: "Update profile name (Protected)" },
        { method: "PATCH", path: "/me/language", description: "Update preferred programming language (Protected)" },
        { method: "POST", path: "/onboarding", description: "Complete skill calibration & set topic levels (Protected)" },
        { method: "GET", path: "/onboarding/status", description: "Get onboarding calibration status (Protected)" },
        { method: "GET", path: "/api/problems", description: "List all problems with difficulty, testcase count & templates" },
        { method: "GET", path: "/api/problems/:slug", description: "Get problem details with testcases & language starter templates" },
        { method: "GET", path: "/api/v1/languages", description: "List supported runner languages (Python, JS, C++, Java)" },
        { method: "POST", path: "/api/v1/runs", description: "Run code against sample test cases synchronously" },
        { method: "POST", path: "/api/v1/submissions", description: "Submit code for tier evaluation" },
        { method: "GET", path: "/api/v1/submissions/:id", description: "Poll submission result and score" },
        { method: "GET", path: "/api/social/:provider/link-url", description: "Get GitHub OAuth link URL (Protected)" },
        { method: "DELETE", path: "/api/social/:provider", description: "Unlink social provider (Protected)" },
      ],
    });
  }
});

export default router;
