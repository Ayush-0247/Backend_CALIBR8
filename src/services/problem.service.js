import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * List all problems with optional search and difficulty filtering
 * @param {object} options
 */
export const listProblems = async (options = {}) => {
  const { difficulty, search } = options;

  let where = {};
  if (difficulty) {
    where.difficulty = { equals: difficulty, mode: "insensitive" };
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy: { problemNumber: "asc" },
    select: {
      id: true,
      problemNumber: true,
      slug: true,
      title: true,
      difficulty: true,
      timeLimit: true,
      memoryLimit: true,
      _count: { select: { testcases: true, templates: true } },
    },
  });

  // Client-side search fallback if search keyword provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        String(p.problemNumber).includes(q),
    );
  }

  return problems;
};

/**
 * Get detailed problem definition by slug or numeric problem number
 * @param {string|number} identifier
 */
export const getProblemDetails = async (identifier) => {
  const isNumber = /^\d+$/.test(String(identifier));
  const where = isNumber
    ? { problemNumber: Number(identifier) }
    : { slug: String(identifier).toLowerCase() };

  let problem = await prisma.problem.findUnique({
    where,
    include: {
      testcases: {
        orderBy: { testIndex: "asc" },
      },
      templates: true,
    },
  });

  // If not found by exact slug, try case-insensitive or partial match
  if (!problem && !isNumber) {
    const all = await prisma.problem.findMany({
      include: {
        testcases: { orderBy: { testIndex: "asc" } },
        templates: true,
      },
    });
    problem = all.find(
      (p) =>
        p.slug.toLowerCase() === String(identifier).toLowerCase() ||
        p.slug.replace(/-\d+$/, "").toLowerCase() === String(identifier).toLowerCase(),
    );
  }

  if (!problem) {
    throw new ApiError(404, `Problem '${identifier}' not found.`);
  }

  // Format into frontend-friendly schema as documented in API details
  const formatted = {
    id: problem.id,
    problemNumber: problem.problemNumber,
    slug: problem.slug,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    testcases: (problem.testcases || []).map((tc) => ({
      testIndex: tc.testIndex,
      isVisible: tc.isVisible,
      input: tc.stdinSmall,
      output: tc.expectedSmall,
      stdinSmall: tc.stdinSmall,
      expectedSmall: tc.expectedSmall,
    })),
    templates: (problem.templates || []).reduce((acc, t) => {
      acc[t.language] = t.code;
      return acc;
    }, {}),
    templatesArray: problem.templates || [],
  };

  return formatted;
};

/**
 * Create a new problem with testcases and starter code templates
 * @param {object} problemData
 */
export const createProblem = async (problemData) => {
  const {
    slug,
    title,
    description,
    difficulty = "Easy",
    timeLimit = 1000,
    memoryLimit = 256,
    testcases = [],
    templates = {},
  } = problemData;

  if (!slug || !title) {
    throw new ApiError(400, "slug and title are required for a problem.");
  }

  const existing = await prisma.problem.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(409, `Problem with slug '${slug}' already exists.`);
  }

  const formattedTestcases = testcases.map((tc, idx) => ({
    testIndex: tc.testIndex ?? idx,
    isVisible: tc.isVisible ?? true,
    stdinSmall: String(tc.stdinSmall ?? tc.input ?? ""),
    expectedSmall: String(tc.expectedSmall ?? tc.output ?? ""),
    sizeBytes: Buffer.byteLength(String(tc.stdinSmall ?? tc.input ?? ""), "utf-8"),
    r2Key: tc.r2Key || null,
  }));

  const formattedTemplates = Array.isArray(templates)
    ? templates
    : Object.entries(templates).map(([lang, code]) => ({
        language: lang,
        code: String(code),
      }));

  const created = await prisma.problem.create({
    data: {
      slug,
      title,
      description: description || title,
      difficulty,
      timeLimit,
      memoryLimit,
      testcases: { create: formattedTestcases },
      templates: { create: formattedTemplates },
    },
    include: {
      testcases: true,
      templates: true,
      _count: { select: { testcases: true, templates: true } },
    },
  });

  return created;
};
