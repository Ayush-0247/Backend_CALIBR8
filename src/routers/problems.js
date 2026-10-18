import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const router = Router();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GET /api/problems -> list all (no TCs)
router.get("/", async (req, res, next) => {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { problemNumber: "asc" },
      select: {
        id: true,
        problemNumber: true,
        slug: true,
        title: true,
        difficulty: true,
        // timeLimit: true,
        //  memoryLimit: true,
        //  _count: { select: { testcases: true } }
      },
    });
    res.json(problems);
  } catch (e) {
    next(e);
  }
});

// GET /api/problems/:slugOrNumber - WORKS WITH BOTH slug and number
router.get("/:slugOrNumber", async (req, res, next) => {
  try {
    const { slugOrNumber } = req.params;
    const isNumber = /^\d+$/.test(slugOrNumber);
    const problem = await prisma.problem.findFirst({
      where: isNumber
        ? { problemNumber: Number(slugOrNumber) }
        : { slug: slugOrNumber },
      include: {
        testcases: {
          where: { isVisible: true },
          orderBy: { testIndex: "asc" },
        },
      },
    });
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json(problem);
  } catch (e) {
    next(e);
  }
});
export default router;
