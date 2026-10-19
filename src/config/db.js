import dotenv from "dotenv";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMockPrisma() {
  const topicsStore = new Map([
    // DSA topics
    [
      "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
      {
        id: "682fa01e-c76b-4b5f-a59e-9ce3ac56f259",
        slug: "dsa-arrays",
        name: "DSA - Arrays",
        category: "DSA",
      },
    ],
    [
      "129c373a-45b9-4394-9a53-fedd8e720401",
      {
        id: "129c373a-45b9-4394-9a53-fedd8e720401",
        slug: "dsa-graphs-dp",
        name: "DSA - Graphs & DP",
        category: "DSA",
      },
    ],
    [
      "d0184833-be8d-467b-81e4-ebc4e2ccbd9d",
      {
        id: "d0184833-be8d-467b-81e4-ebc4e2ccbd9d",
        slug: "dsa-linked-list",
        name: "DSA - Linked List",
        category: "DSA",
      },
    ],
    [
      "307747ce-a84c-44b9-9369-918891d20e3a",
      {
        id: "307747ce-a84c-44b9-9369-918891d20e3a",
        slug: "dsa-stack-queue",
        name: "DSA - Stack & Queue",
        category: "DSA",
      },
    ],
    [
      "379beec5-41a6-4dc8-b3b4-1beb98fe186d",
      {
        id: "379beec5-41a6-4dc8-b3b4-1beb98fe186d",
        slug: "dsa-trees",
        name: "DSA - Trees",
        category: "DSA",
      },
    ],
    // Core subjects
    [
      "core-aptitude",
      {
        id: "core-aptitude",
        slug: "aptitude",
        name: "Aptitude",
        category: "CORE",
      },
    ],
    [
      "core-dbms",
      { id: "core-dbms", slug: "dbms", name: "DBMS", category: "CORE" },
    ],
    [
      "core-oops",
      { id: "core-oops", slug: "oops", name: "OOPs", category: "CORE" },
    ],
    [
      "core-system-design",
      {
        id: "core-system-design",
        slug: "system-design",
        name: "System Design",
        category: "CORE",
      },
    ],
  ]);

  const usersStore = new Map();
  const userTopicsStore = new Map();
  const socialAccountsStore = new Map();
  const problemsStore = new Map();
  const testcasesStore = new Map();
  const templatesStore = new Map();
  const submissionsStore = new Map();

  // Pre-load problems from problems directory
  try {
    const problemsDir = path.resolve(__dirname, "../../problems");
    if (fs.existsSync(problemsDir)) {
      const files = fs.readdirSync(problemsDir).filter((f) => f.endsWith(".json"));
      let probNum = 1;

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(problemsDir, file), "utf-8");
          const data = JSON.parse(raw);
          const slug = data.slug || path.basename(file, ".json").toLowerCase();
          const probId = `prob-${slug}`;

          const problem = {
            id: probId,
            problemNumber: data.problemNumber || probNum++,
            slug,
            title: data.title || slug,
            description: data.description || "",
            difficulty: data.difficulty || "Easy",
            timeLimit: data.timeLimit || data.time_limit || 1000,
            memoryLimit: data.memoryLimit || data.memory_limit || 256,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          problemsStore.set(problem.id, problem);

          // Testcases
          const tcs = data.testcases || [];
          tcs.forEach((tc, idx) => {
            const input = tc.input ?? tc.stdinSmall ?? tc.stdin ?? "";
            const output = tc.output ?? tc.expectedSmall ?? tc.expected ?? "";
            const tcId = `tc-${problem.id}-${idx}`;
            testcasesStore.set(tcId, {
              id: tcId,
              problemId: problem.id,
              testIndex: tc.testIndex ?? idx,
              isVisible: tc.isVisible ?? true,
              stdinSmall: typeof input === "object" ? JSON.stringify(input) : String(input),
              expectedSmall: typeof output === "object" ? JSON.stringify(output) : String(output),
              sizeBytes: Buffer.byteLength(String(input), "utf-8"),
              r2Key: tc.r2Key || null,
            });
          });

          // Code Templates
          const tpls = data.templates || {};
          Object.entries(tpls).forEach(([lang, code]) => {
            const tplId = `tpl-${problem.id}-${lang}`;
            templatesStore.set(tplId, {
              id: tplId,
              problemId: problem.id,
              language: lang,
              code: String(code),
            });
          });
        } catch (e) {
          console.warn(`[Mock DB] Failed to parse problem file ${file}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.warn("[Mock DB] Error reading problems directory:", err.message);
  }

  const populateUser = (u) => {
    if (!u) return null;
    const uTopics = Array.from(userTopicsStore.values())
      .filter((ut) => ut.userId === u.id)
      .map((ut) => ({
        id: ut.id,
        userId: ut.userId,
        topicId: ut.topicId,
        level: ut.level || "easy",
        topic: topicsStore.get(ut.topicId) || null,
      }));
    return {
      ...u,
      preferredLanguage: u.preferredLanguage || "cpp",
      topics: uTopics,
      socialAccounts: Array.from(socialAccountsStore.values()).filter(
        (account) => account.userId === u.id,
      ),
    };
  };

  const populateProblem = (p, include = {}) => {
    if (!p) return null;
    const res = { ...p };
    const tcs = Array.from(testcasesStore.values())
      .filter((tc) => tc.problemId === p.id)
      .sort((a, b) => a.testIndex - b.testIndex);
    const tpls = Array.from(templatesStore.values()).filter(
      (tpl) => tpl.problemId === p.id,
    );

    if (include.testcases) res.testcases = tcs;
    if (include.templates) res.templates = tpls;
    res._count = { testcases: tcs.length, templates: tpls.length };
    return res;
  };

  const mock = {
    $connect: async () => {
      console.log("✅ Connected to in-memory mock database");
    },
    $disconnect: async () => {},
    $transaction: async (fn) => {
      return fn(mock);
    },
    topic: {
      findMany: async (args = {}) => {
        let list = Array.from(topicsStore.values());
        if (args?.where) {
          if (args.where.id?.in) {
            list = list.filter((t) => args.where.id.in.includes(t.id));
          }
          if (args.where.category) {
            const raw =
              typeof args.where.category === "string"
                ? args.where.category
                : args.where.category.equals || "";
            const target = raw.trim().toLowerCase();
            if (target === "dsa") {
              list = list.filter(
                (t) =>
                  (t.category && t.category.toLowerCase() === "dsa") ||
                  t.slug.toLowerCase().startsWith("dsa"),
              );
            } else if (target === "core") {
              list = list.filter(
                (t) =>
                  (t.category && t.category.toLowerCase() === "core") ||
                  (!t.slug.toLowerCase().startsWith("dsa") &&
                    t.category !== "DSA"),
              );
            } else {
              list = list.filter(
                (t) => t.category && t.category.toLowerCase() === target,
              );
            }
          }
        }
        if (args?.orderBy?.name === "asc") {
          list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
      },
      findUnique: async ({ where }) => {
        if (where?.id) return topicsStore.get(where.id) || null;
        if (where?.slug) {
          return (
            Array.from(topicsStore.values()).find(
              (t) => t.slug === where.slug,
            ) || null
          );
        }
        return null;
      },
      upsert: async ({ where, update, create }) => {
        let existing = Array.from(topicsStore.values()).find(
          (t) => t.slug === where?.slug,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const newTopic = { id: create.id || crypto.randomUUID(), ...create };
        topicsStore.set(newTopic.id, newTopic);
        return newTopic;
      },
    },
    user: {
      findUnique: async ({ where, select, include }) => {
        let u = null;
        if (where?.email) {
          u = Array.from(usersStore.values()).find(
            (user) => user.email === where.email,
          );
        } else if (where?.id) {
          u = usersStore.get(where.id);
        }
        if (!u) return null;
        const populated = populateUser(u);
        if (select) {
          const res = {};
          for (const key of Object.keys(select)) {
            if (select[key]) res[key] = populated[key];
          }
          return res;
        }
        return populated;
      },
      create: async ({ data, select }) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const user = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
          difficulty: data.difficulty || null,
          rating: data.rating || 800,
          onboarded: data.onboarded || false,
          preferredLanguage: data.preferredLanguage || "cpp",
          createdAt: now,
          updatedAt: now,
        };
        usersStore.set(id, user);
        const populated = populateUser(user);
        if (select) {
          const res = {};
          for (const key of Object.keys(select)) {
            if (select[key]) res[key] = populated[key];
          }
          return res;
        }
        return populated;
      },
      update: async ({ where, data, select }) => {
        const u = usersStore.get(where.id);
        if (!u) throw new Error("User not found");
        Object.assign(u, data, { updatedAt: new Date() });
        const populated = populateUser(u);
        if (select) {
          const res = {};
          for (const key of Object.keys(select)) {
            if (select[key]) res[key] = populated[key];
          }
          return res;
        }
        return populated;
      },
    },
    userTopic: {
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [id, ut] of userTopicsStore.entries()) {
          if (ut.userId === where.userId) {
            userTopicsStore.delete(id);
            count++;
          }
        }
        return { count };
      },
      createMany: async ({ data }) => {
        for (const item of data) {
          const id = crypto.randomUUID();
          userTopicsStore.set(id, { id, ...item });
        }
        return { count: data.length };
      },
    },
    socialAccount: {
      findUnique: async ({ where }) => {
        const byProviderUser = where?.provider_providerUserId;
        const byUserProvider = where?.userId_provider;
        return (
          Array.from(socialAccountsStore.values()).find((account) =>
            byProviderUser
              ? account.provider === byProviderUser.provider &&
                account.providerUserId === byProviderUser.providerUserId
              : byUserProvider
                ? account.userId === byUserProvider.userId &&
                  account.provider === byUserProvider.provider
                : false,
          ) || null
        );
      },
      upsert: async ({ where, create, update }) => {
        const key = where?.userId_provider;
        const existing = Array.from(socialAccountsStore.values()).find(
          (account) =>
            account.userId === key?.userId &&
            account.provider === key?.provider,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const account = {
          id: crypto.randomUUID(),
          connectedAt: new Date(),
          ...create,
        };
        socialAccountsStore.set(account.id, account);
        return account;
      },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [id, account] of socialAccountsStore.entries()) {
          if (
            account.userId === where.userId &&
            account.provider === where.provider
          ) {
            socialAccountsStore.delete(id);
            count++;
          }
        }
        return { count };
      },
    },
    problem: {
      findMany: async (args = {}) => {
        let list = Array.from(problemsStore.values()).map((p) =>
          populateProblem(p, args.include),
        );
        if (args?.where) {
          if (args.where.difficulty) {
            const diff = String(args.where.difficulty).toLowerCase();
            list = list.filter((p) => p.difficulty?.toLowerCase() === diff);
          }
          if (args.where.slug) {
            list = list.filter((p) => p.slug === args.where.slug);
          }
        }
        if (args?.orderBy?.problemNumber === "asc") {
          list.sort((a, b) => a.problemNumber - b.problemNumber);
        }
        if (args?.select) {
          return list.map((p) => {
            const res = {};
            for (const key of Object.keys(args.select)) {
              if (args.select[key]) res[key] = p[key];
            }
            return res;
          });
        }
        return list;
      },
      findUnique: async ({ where, include }) => {
        let p = null;
        if (where?.id) p = problemsStore.get(where.id);
        else if (where?.slug) {
          p = Array.from(problemsStore.values()).find(
            (item) => item.slug === where.slug || item.slug.toLowerCase() === where.slug.toLowerCase(),
          );
        } else if (where?.problemNumber !== undefined) {
          p = Array.from(problemsStore.values()).find(
            (item) => item.problemNumber === Number(where.problemNumber),
          );
        }
        return p ? populateProblem(p, include || { testcases: true, templates: true }) : null;
      },
      findFirst: async ({ where, include }) => {
        return mock.problem.findUnique({ where, include });
      },
      create: async ({ data, include }) => {
        const id = data.id || crypto.randomUUID();
        const problemNumber =
          data.problemNumber || problemsStore.size + 1;
        const problem = {
          id,
          problemNumber,
          slug: data.slug,
          title: data.title,
          description: data.description,
          difficulty: data.difficulty || "Easy",
          timeLimit: data.timeLimit || 1000,
          memoryLimit: data.memoryLimit || 256,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        problemsStore.set(id, problem);

        if (data.testcases?.create) {
          data.testcases.create.forEach((tc, idx) => {
            const tcId = `tc-${id}-${idx}`;
            testcasesStore.set(tcId, {
              id: tcId,
              problemId: id,
              testIndex: tc.testIndex ?? idx,
              isVisible: tc.isVisible ?? true,
              stdinSmall: tc.stdinSmall ?? "",
              expectedSmall: tc.expectedSmall ?? "",
              sizeBytes: tc.sizeBytes ?? 0,
              r2Key: tc.r2Key ?? null,
            });
          });
        }
        if (data.templates?.create) {
          data.templates.create.forEach((tpl) => {
            const tplId = `tpl-${id}-${tpl.language}`;
            templatesStore.set(tplId, {
              id: tplId,
              problemId: id,
              language: tpl.language,
              code: tpl.code,
            });
          });
        }
        return populateProblem(problem, include || { testcases: true, templates: true });
      },
      count: async () => problemsStore.size,
    },
    testcase: {
      findMany: async ({ where, orderBy }) => {
        let list = Array.from(testcasesStore.values());
        if (where?.problemId) {
          list = list.filter((tc) => tc.problemId === where.problemId);
        }
        if (where?.isVisible !== undefined) {
          list = list.filter((tc) => tc.isVisible === where.isVisible);
        }
        if (orderBy?.testIndex === "asc") {
          list.sort((a, b) => a.testIndex - b.testIndex);
        }
        return list;
      },
    },
    codeTemplate: {
      findMany: async ({ where }) => {
        let list = Array.from(templatesStore.values());
        if (where?.problemId) {
          list = list.filter((tpl) => tpl.problemId === where.problemId);
        }
        return list;
      },
    },
    submission: {
      create: async ({ data }) => {
        const id = crypto.randomUUID();
        const submission = {
          id,
          createdAt: new Date(),
          passedCount: 0,
          totalCount: 0,
          time: null,
          memory: null,
          ...data,
        };
        submissionsStore.set(id, submission);
        return submission;
      },
      findUnique: async ({ where }) => {
        return submissionsStore.get(where.id) || null;
      },
      update: async ({ where, data }) => {
        const sub = submissionsStore.get(where.id);
        if (!sub) throw new Error("Submission not found");
        Object.assign(sub, data);
        return sub;
      },
      findMany: async ({ where, orderBy }) => {
        let list = Array.from(submissionsStore.values());
        if (where?.userId) {
          list = list.filter((s) => s.userId === where.userId);
        }
        if (where?.problemId) {
          list = list.filter((s) => s.problemId === where.problemId);
        }
        if (orderBy?.createdAt === "desc") {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return list;
      },
    },
  };

  return mock;
}

let prismaInstance;
const connectionString = process.env.DATABASE_URL;

if (connectionString) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const { neonConfig } = await import("@neondatabase/serverless");
    const { default: ws } = await import("ws");
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString });
    prismaInstance = new PrismaClient({ adapter });
  } catch (err) {
    console.warn(
      "[AI Studio] Failed to initialize live Prisma client, using mock fallback:",
      err.message,
    );
    prismaInstance = createMockPrisma();
  }
} else {
  prismaInstance = createMockPrisma();
}

const mockPrisma = createMockPrisma();
let activePrisma = prismaInstance;

// Helper to wrap model methods with automatic fallback to mock store
function wrapModel(modelName) {
  return new Proxy(
    {},
    {
      get(_, method) {
        return async (...args) => {
          try {
            if (
              activePrisma &&
              activePrisma !== mockPrisma &&
              activePrisma[modelName] &&
              typeof activePrisma[modelName][method] === "function"
            ) {
              try {
                return await activePrisma[modelName][method](...args);
              } catch (innerErr) {
                // Topic category column schema fallback
                if (
                  modelName === "topic" &&
                  method === "findMany" &&
                  innerErr.message &&
                  innerErr.message.toLowerCase().includes("column")
                ) {
                  const res = await activePrisma.topic.findMany({
                    select: { id: true, slug: true, name: true },
                    ...(args[0]?.orderBy ? { orderBy: args[0].orderBy } : {}),
                  });
                  return res.map((t) => ({
                    ...t,
                    category:
                      t.slug && t.slug.toLowerCase().startsWith("dsa")
                        ? "DSA"
                        : "CORE",
                  }));
                }
                throw innerErr;
              }
            }
          } catch (dbErr) {
            console.warn(
              `[AI Studio] Database call ${modelName}.${method} failed (${dbErr.message || "connection error"}), using in-memory store.`,
            );
            activePrisma = mockPrisma;
          }
          if (
            mockPrisma[modelName] &&
            typeof mockPrisma[modelName][method] === "function"
          ) {
            return mockPrisma[modelName][method](...args);
          }
          return null;
        };
      },
    },
  );
}

export function setPrismaFallback() {
  activePrisma = mockPrisma;
}

const proxy = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === "$fallback") return setPrismaFallback;
      if (prop === "$isMock") return () => activePrisma === mockPrisma;
      if (prop === "$isLive") return () => activePrisma !== mockPrisma;
      if (prop === "$connect") {
        return async () => {
          if (
            activePrisma &&
            activePrisma !== mockPrisma &&
            typeof activePrisma.$connect === "function"
          ) {
            try {
              await activePrisma.$connect();
              try {
                await activePrisma.topic.findMany({ take: 1 });
              } catch (queryErr) {
                if (
                  queryErr.message &&
                  queryErr.message.toLowerCase().includes("column")
                ) {
                  await activePrisma.topic.findMany({
                    select: { id: true, slug: true, name: true },
                    take: 1,
                  });
                  return;
                }
                throw queryErr;
              }
              return;
            } catch (err) {
              console.warn(
                "[AI Studio] Live database unreachable, using in-memory store:",
                err.message || err,
              );
              activePrisma = mockPrisma;
            }
          }
        };
      }
      if (prop === "$disconnect") {
        return async () => {
          if (activePrisma && typeof activePrisma.$disconnect === "function") {
            try {
              await activePrisma.$disconnect();
            } catch (_) {}
          }
        };
      }
      if (prop === "$transaction") {
        return async (fn) => {
          try {
            if (
              activePrisma &&
              activePrisma !== mockPrisma &&
              typeof activePrisma.$transaction === "function"
            ) {
              return await activePrisma.$transaction(fn);
            }
          } catch (err) {
            console.warn(
              "[AI Studio] Transaction failed on live DB, falling back to mock:",
              err.message || err,
            );
            activePrisma = mockPrisma;
          }
          return mockPrisma.$transaction(fn);
        };
      }
      return wrapModel(prop);
    },
  },
);

export default proxy;
