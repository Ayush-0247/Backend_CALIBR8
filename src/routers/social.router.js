import { Router } from "express";
import {
  getLinkUrl,
  handleCallback,
  unlinkProvider,
} from "../controllers/social.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/social/:provider/link-url - get OAuth authorization URL
router.get("/:provider/link-url", protect, getLinkUrl);

// GET /api/social/:provider/callback - OAuth callback handler
router.get("/:provider/callback", handleCallback);

// DELETE /api/social/:provider - unlink provider from account
router.delete("/:provider", protect, unlinkProvider);

export default router;
