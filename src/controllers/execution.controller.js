import {
  getLanguages,
  executeRun,
  submitSolution,
  getSubmissionById,
} from "../services/execution.service.js";

/**
 * GET /api/v1/languages or GET /api/languages
 * List enabled programming languages and starter template availability
 */
export const getAvailableLanguages = (req, res, next) => {
  try {
    const result = getLanguages();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/runs or POST /api/runs
 * Execute user solution against sample testcases (synchronous)
 */
export const runCode = async (req, res, next) => {
  try {
    const { problemId, slug, language, code } = req.body;
    const result = await executeRun({ problemId, slug, language, code });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/submissions or POST /api/submissions
 * Submit solution for complete evaluation
 */
export const submitCode = async (req, res, next) => {
  try {
    const { problemId, slug, language, code } = req.body;
    const userId = req.user ? req.user.id : null;
    const idempotencyKey = req.headers["idempotency-key"];

    const result = await submitSolution({
      userId,
      problemId,
      slug,
      language,
      code,
      idempotencyKey,
    });
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/submissions/:id or GET /api/submissions/:id
 * Get submission status, progress, and score verdict
 */
export const getSubmission = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await getSubmissionById(req.params.id, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
