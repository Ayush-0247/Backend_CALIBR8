import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

export function createMockPrisma() {
  const topicsStore = new Map([
    // DSA topics for dropdown
    ['682fa01e-c76b-4b5f-a59e-9ce3ac56f259', { id: '682fa01e-c76b-4b5f-a59e-9ce3ac56f259', slug: 'dsa-arrays', name: 'DSA - Arrays', category: 'DSA' }],
    ['129c373a-45b9-4394-9a53-fedd8e720401', { id: '129c373a-45b9-4394-9a53-fedd8e720401', slug: 'dsa-graphs-dp', name: 'DSA - Graphs & DP', category: 'DSA' }],
    ['d0184833-be8d-467b-81e4-ebc4e2ccbd9d', { id: 'd0184833-be8d-467b-81e4-ebc4e2ccbd9d', slug: 'dsa-linked-list', name: 'DSA - Linked List', category: 'DSA' }],
    ['307747ce-a84c-44b9-9369-918891d20e3a', { id: '307747ce-a84c-44b9-9369-918891d20e3a', slug: 'dsa-stack-queue', name: 'DSA - Stack & Queue', category: 'DSA' }],
    ['379beec5-41a6-4dc8-b3b4-1beb98fe186d', { id: '379beec5-41a6-4dc8-b3b4-1beb98fe186d', slug: 'dsa-trees', name: 'DSA - Trees', category: 'DSA' }],
    // Core subjects
    ['core-aptitude', { id: 'core-aptitude', slug: 'aptitude', name: 'Aptitude', category: 'CORE' }],
    ['core-dbms', { id: 'core-dbms', slug: 'dbms', name: 'DBMS', category: 'CORE' }],
    ['core-oops', { id: 'core-oops', slug: 'oops', name: 'OOPs', category: 'CORE' }],
    ['core-system-design', { id: 'core-system-design', slug: 'system-design', name: 'System Design', category: 'CORE' }],
  ]);

  const usersStore = new Map();
  const userTopicsStore = new Map();

  const populateUser = (u) => {
    if (!u) return null;
    const uTopics = Array.from(userTopicsStore.values())
      .filter((ut) => ut.userId === u.id)
      .map((ut) => ({
        id: ut.id,
        userId: ut.userId,
        topicId: ut.topicId,
        topic: topicsStore.get(ut.topicId) || null,
      }));
    return {
      ...u,
      topics: uTopics,
    };
  };

  const mock = {
    $connect: async () => {
      console.log('✅ Connected to in-memory mock database');
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
            const raw = typeof args.where.category === 'string'
              ? args.where.category
              : (args.where.category.equals || '');
            const target = raw.trim().toLowerCase();
            if (target === 'dsa') {
              list = list.filter((t) => (t.category && t.category.toLowerCase() === 'dsa') || t.slug.toLowerCase().startsWith('dsa'));
            } else if (target === 'core') {
              list = list.filter((t) => (t.category && t.category.toLowerCase() === 'core') || (!t.slug.toLowerCase().startsWith('dsa') && t.category !== 'DSA'));
            } else {
              list = list.filter((t) => t.category && t.category.toLowerCase() === target);
            }
          }
        }
        if (args?.orderBy?.name === 'asc') {
          list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
      },
      findUnique: async ({ where }) => {
        if (where?.id) return topicsStore.get(where.id) || null;
        if (where?.slug) {
          return Array.from(topicsStore.values()).find((t) => t.slug === where.slug) || null;
        }
        return null;
      },
      upsert: async ({ where, update, create }) => {
        let existing = Array.from(topicsStore.values()).find((t) => t.slug === where?.slug);
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
      findUnique: async ({ where, select }) => {
        let u = null;
        if (where?.email) {
          u = Array.from(usersStore.values()).find((user) => user.email === where.email);
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
      update: async ({ where, data }) => {
        const u = usersStore.get(where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, data, { updatedAt: new Date() });
        return populateUser(u);
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
  };

  return mock;
}

let prismaInstance;
const connectionString = process.env.DATABASE_URL;

if (connectionString) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const { neonConfig } = await import('@neondatabase/serverless');
    const { default: ws } = await import('ws');
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString });
    prismaInstance = new PrismaClient({ adapter });
  } catch (err) {
    console.warn('[AI Studio] Failed to initialize Neon Prisma client, using mock fallback:', err.message);
    prismaInstance = createMockPrisma();
  }
} else {
  prismaInstance = createMockPrisma();
}

const mockPrisma = createMockPrisma();
let activePrisma = prismaInstance;

// Helper to wrap model methods with automatic fallback to mock store
function wrapModel(modelName) {
  return new Proxy({}, {
    get(_, method) {
      return async (...args) => {
        try {
          if (activePrisma && activePrisma !== mockPrisma && activePrisma[modelName] && typeof activePrisma[modelName][method] === 'function') {
            return await activePrisma[modelName][method](...args);
          }
        } catch (dbErr) {
          console.warn(`[AI Studio] Database call ${modelName}.${method} failed (${dbErr.message || 'connection error'}), switching permanently to in-memory store.`);
          activePrisma = mockPrisma;
        }
        if (mockPrisma[modelName] && typeof mockPrisma[modelName][method] === 'function') {
          return mockPrisma[modelName][method](...args);
        }
        return null;
      };
    }
  });
}

export function setPrismaFallback() {
  activePrisma = mockPrisma;
}

const proxy = new Proxy({}, {
  get(_, prop) {
    if (prop === '$fallback') return setPrismaFallback;
    if (prop === '$connect') {
      return async () => {
        if (activePrisma && activePrisma !== mockPrisma && typeof activePrisma.$connect === 'function') {
          try {
            await activePrisma.$connect();
            // Test a quick query to verify network reachability
            await activePrisma.topic.findMany({ take: 1 });
            return;
          } catch (err) {
            console.warn('[AI Studio] Live database unreachable, using in-memory store:', err.message || err);
            activePrisma = mockPrisma;
          }
        }
      };
    }
    if (prop === '$disconnect') {
      return async () => {
        if (activePrisma && typeof activePrisma.$disconnect === 'function') {
          try { await activePrisma.$disconnect(); } catch (_) {}
        }
      };
    }
    if (prop === '$transaction') {
      return async (fn) => {
        try {
          if (activePrisma && activePrisma !== mockPrisma && typeof activePrisma.$transaction === 'function') {
            return await activePrisma.$transaction(fn);
          }
        } catch (err) {
          console.warn('[AI Studio] Transaction failed on live DB, falling back to mock:', err.message || err);
          activePrisma = mockPrisma;
        }
        return mockPrisma.$transaction(fn);
      };
    }
    // Model proxies: topic, user, userTopic, etc.
    return wrapModel(prop);
  }
});

export default proxy;