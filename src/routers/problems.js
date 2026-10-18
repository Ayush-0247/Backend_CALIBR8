import express from "express";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { PrismaClient } = pkg;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// GET /api/problems - list all
router.get("/", async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
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
    res.json({ success: true, data: problems });
  } catch (e) {
    console.error("List error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/problems/:slug - detail with templates + testcases
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("Fetching problem:", slug);

    const isNumber = /^\d+$/.test(slug);
    const problem = await prisma.problem.findUnique({
      where: isNumber ? { problemNumber: Number(slug) } : { slug },
      include: {
        testcases: {
          orderBy: { testIndex: "asc" },
        },
        templates: true,
      },
    });

    if (!problem) {
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    }

    // Convert to frontend-friendly format
    const formatted = {
      id: problem.id,
      problemNumber: problem.problemNumber,
      slug: problem.slug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      testcases: problem.testcases.map((tc) => ({
        testIndex: tc.testIndex,
        isVisible: tc.isVisible,
        input: tc.stdinSmall,
        output: tc.expectedSmall,
        stdinSmall: tc.stdinSmall,
        expectedSmall: tc.expectedSmall,
      })),
      templates: problem.templates.reduce((acc, t) => {
        acc[t.language] = t.code;
        return acc;
      }, {}),
      templatesArray: problem.templates, // for debugging
    };

    res.json({ success: true, data: formatted });
  } catch (e) {
    console.error("Detail error:", e);
    console.error(e.stack);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error.",
        error: e.message,
      });
  }
});

export default router;
