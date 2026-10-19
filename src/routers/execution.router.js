import { Router } from "express";
import {
  getAvailableLanguages,
  runCode,
  submitCode,
  getSubmission,
} from "../controllers/execution.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/v1/languages - enabled languages & starter availability
router.get("/languages", getAvailableLanguages);

// POST /api/v1/runs - synchronous test execution against sample cases
router.post("/runs", runCode);

// POST /api/v1/submissions - submit code for full evaluation
router.post("/submissions", submitCode);

// GET /api/v1/submissions/:id - poll submission status & score
router.get("/submissions/:id", getSubmission);

export default router;
