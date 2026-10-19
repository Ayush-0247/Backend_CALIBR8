import {
  listProblems,
  getProblemDetails,
  createProblem,
} from "../services/problem.service.js";

/**
 * GET /api/problems or GET /problems
 * List all problems
 */
export const getAllProblems = async (req, res, next) => {
  try {
    const { difficulty, search } = req.query;
    const problems = await listProblems({ difficulty, search });
    res.status(200).json({ success: true, count: problems.length, data: problems });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/problems/:slug
 * Fetch problem details with testcases & starter code templates
 */
export const getProblemBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const problem = await getProblemDetails(slug);
    res.status(200).json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/problems
 * Create a new problem (e.g. from admin or problem loader)
 */
export const addProblem = async (req, res, next) => {
  try {
    const problem = await createProblem(req.body);
    res.status(201).json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};
