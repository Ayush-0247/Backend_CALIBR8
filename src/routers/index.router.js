import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./auth.router.js";
import userRouter from "./user.router.js";
import topicRouter from "./topic.router.js";
import onboardingRouter from "./onboarding.router.js";
import socialRoutes from "./social.routes.js";
import problemRoutes from "./problems.js";

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

// Feature routers
router.use("/auth", authRouter);
router.use("/topics", topicRouter);
router.use("/topic", topicRouter);
router.use("/onboarding", onboardingRouter);
router.use("/", userRouter);
router.use("/api/social", socialRoutes);
router.use("/api/problems", problemRoutes);
router.use("/api/users", onboardingRouter);


// Root endpoint: API info & interactive UI
router.get("/", (req, res) => {
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "../../public/index.html"));
  } else {
    res.status(200).json({
      service: "Calibr8 Backend API",
      status: "online",
      version: "1.1.0",
      features: [
        "User Registration, Login, Logout & Token Revocation",
        "DSA Topic Level Calibration (Easy, Mid, Hard)",
        "Beginner 1-Click Preset (Auto-sets all DSA topics to Easy, rating 800)",
        "Composite Rating Calculation & Difficulty Mapping",
        "Profile Management & Password Change",
      ],
      endpoints: [
        { method: "GET", path: "/health", description: "Health check" },
        { method: "GET", path: "/ping", description: "Ping check" },
        { method: "GET", path: "/topics", description: "List all topics" },
        {
          method: "GET",
          path: "/topics/dsa",
          description: "List DSA topics specifically",
        },
        {
          method: "POST",
          path: "/auth/register",
          description: "Register user",
        },
        { method: "POST", path: "/auth/login", description: "Login user" },
        {
          method: "POST",
          path: "/auth/logout",
          description: "Logout user / invalidate token (Protected)",
        },
        {
          method: "GET",
          path: "/auth/me",
          description: "Verify token & get current user (Protected)",
        },
        {
          method: "POST",
          path: "/auth/change-password",
          description: "Change password (Protected)",
        },
        {
          method: "GET",
          path: "/me",
          description: "Get authenticated user (Protected)",
        },
        {
          method: "PUT",
          path: "/me",
          description: "Update profile (Protected)",
        },
        {
          method: "POST",
          path: "/onboarding",
          description:
            "Complete onboarding / set topic levels / beginner preset (Protected)",
        },
        {
          method: "GET",
          path: "/onboarding/status",
          description: "Get onboarding status & topic levels (Protected)",
        },
      ],
    });
  }
});

export default router;
