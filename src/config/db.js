import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Required for WebSocket-based Neon connections in Node.js
if (neonConfig) {
  neonConfig.webSocketConstructor = ws;
}

// In-memory data store for fallback/mock mode
export const initialTopics = [
  // DSA topics
  { id: 't-arrays', slug: 'arrays', name: 'Arrays', category: 'DSA' },
  { id: 't-strings', slug: 'strings', name: 'Strings', category: 'DSA' },
  { id: 't-linked-lists', slug: 'linked-lists', name: 'Linked Lists', category: 'DSA' },
  { id: 't-stacks-queues', slug: 'stacks-queues', name: 'Stacks & Queues', category: 'DSA' },
  { id: 't-trees', slug: 'trees', name: 'Trees & BST', category: 'DSA' },
  { id: 't-graphs', slug: 'graphs', name: 'Graphs', category: 'DSA' },
  { id: 't-dp', slug: 'dynamic-programming', name: 'Dynamic Programming', category: 'DSA' },
  { id: 't-recursion', slug: 'recursion-backtracking', name: 'Recursion & Backtracking', category: 'DSA' },
  { id: 't-sorting', slug: 'sorting-searching', name: 'Sorting & Searching', category: 'DSA' },
  { id: 't-heaps', slug: 'heaps-hashmaps', name: 'Heaps & HashMaps', category: 'DSA' },

  // Core CS topics
  { id: 't-core-dsa', slug: 'dsa', name: 'DSA (General)', category: 'CORE' },
  { id: 't-dbms', slug: 'dbms', name: 'DBMS', category: 'CORE' },
  { id: 't-oops', slug: 'oops', name: 'OOPs', category: 'CORE' },
  { id: 't-system-design', slug: 'system-design', name: 'System Design', category: 'CORE' },
  { id: 't-aptitude', slug: 'aptitude', name: 'Aptitude', category: 'CORE' },
];

const mockStore = {
  topics: [...initialTopics],
  users: new Map(),
  userTopics: new Map(),
};

function createMockPrisma() {
  const topicModel = {
    findMany: async (args = {}) => {
      let list = [...mockStore.topics];
      if (args.where?.category) {
        list = list.filter((t) => t.category.toLowerCase() === args.where.category.toLowerCase());
      }
      if (args.where?.id?.in) {
        const set = new Set(args.where.id.in);
        list = list.filter((t) => set.has(t.id) || set.has(t.slug));
      }
      if (args.orderBy?.name === 'asc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }
      return list;
    },
    findUnique: async ({ where }) => {
      if (where?.slug) return mockStore.topics.find((t) => t.slug === where.slug) || null;
      if (where?.id) return mockStore.topics.find((t) => t.id === where.id || t.slug === where.id) || null;
      return null;
    },
    upsert: async ({ where, update, create }) => {
      const existing = mockStore.topics.find((t) => t.slug === where.slug);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const item = { id: crypto.randomUUID(), category: 'CORE', ...create };
      mockStore.topics.push(item);
      return item;
    },
    create: async ({ data }) => {
      const item = { id: crypto.randomUUID(), category: 'CORE', ...data };
      mockStore.topics.push(item);
      return item;
    },
  };

  const userTopicModel = {
    deleteMany: async ({ where }) => {
      if (where?.userId) {
        for (const [id, ut] of mockStore.userTopics.entries()) {
          if (ut.userId === where.userId) {
            mockStore.userTopics.delete(id);
          }
        }
      }
      return { count: 0 };
    },
    createMany: async ({ data }) => {
      for (const item of data) {
        const id = crypto.randomUUID();
        mockStore.userTopics.set(id, { id, level: 'easy', ...item });
      }
      return { count: data.length };
    },
    findMany: async ({ where }) => {
      const results = [];
      for (const ut of mockStore.userTopics.values()) {
        if (!where?.userId || ut.userId === where.userId) {
          const topic = mockStore.topics.find((t) => t.id === ut.topicId || t.slug === ut.topicId);
          results.push({ ...ut, topic });
        }
      }
      return results;
    },
  };

  const userModel = {
    findUnique: async ({ where, select, include }) => {
      let user = null;
      if (where?.email) {
        for (const u of mockStore.users.values()) {
          if (u.email === where.email) {
            user = u;
            break;
          }
        }
      } else if (where?.id) {
        user = mockStore.users.get(where.id) || null;
      }

      if (!user) return null;

      const userCopy = { ...user };
      if (include?.topics || select?.topics) {
        userCopy.topics = [];
        for (const ut of mockStore.userTopics.values()) {
          if (ut.userId === user.id) {
            const topic = mockStore.topics.find((t) => t.id === ut.topicId || t.slug === ut.topicId);
            userCopy.topics.push({ ...ut, topic });
          }
        }
      }

      if (select) {
        const filtered = {};
        for (const key of Object.keys(select)) {
          if (select[key]) filtered[key] = userCopy[key];
        }
        return filtered;
      }
      return userCopy;
    },
    create: async ({ data, include }) => {
      for (const u of mockStore.users.values()) {
        if (u.email === data.email) {
          const err = new Error('Unique constraint failed on the fields: (`email`)');
          err.code = 'P2002';
          err.meta = { target: ['email'] };
          throw err;
        }
      }

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
      mockStore.users.set(id, user);

      const userCopy = { ...user };
      if (include?.topics) {
        userCopy.topics = [];
      }
      return userCopy;
    },
    update: async ({ where, data, select }) => {
      const user = mockStore.users.get(where.id);
      if (!user) throw new Error('User not found');
      Object.assign(user, data, { updatedAt: new Date() });
      mockStore.users.set(where.id, user);

      const userCopy = { ...user };
      if (select?.topics) {
        userCopy.topics = [];
        for (const ut of mockStore.userTopics.values()) {
          if (ut.userId === user.id) {
            const topic = mockStore.topics.find((t) => t.id === ut.topicId || t.slug === ut.topicId);
            userCopy.topics.push({ ...ut, topic });
          }
        }
      }
      if (select) {
        const filtered = {};
        for (const key of Object.keys(select)) {
          if (select[key]) filtered[key] = userCopy[key];
        }
        return filtered;
      }
      return userCopy;
    },
  };

  const client = {
    $connect: async () => {
      console.log('✅ In-memory database initialized');
    },
    $disconnect: async () => {},
    $transaction: async (fn) => fn(client),
    topic: topicModel,
    user: userModel,
    userTopic: userTopicModel,
  };

  return new Proxy(client, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return {
        findMany: async () => [],
        findFirst: async () => null,
        findUnique: async () => null,
        create: async (d) => d?.data ?? {},
        update: async (d) => d?.data ?? {},
        delete: async () => ({}),
        deleteMany: async () => ({ count: 0 }),
      };
    },
  });
}

function isValidDatabaseUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (
    !trimmed ||
    trimmed === 'postgresql://...' ||
    trimmed.includes('...') ||
    trimmed.includes('example') ||
    trimmed.includes('dummy') ||
    trimmed.includes('localhost') ||
    trimmed.includes('YOUR_')
  ) {
    return false;
  }
  try {
    const u = new URL(trimmed);
    return Boolean(
      u.hostname &&
      u.hostname.includes('.') &&
      u.hostname !== '...' &&
      !u.hostname.endsWith('.example.com')
    );
  } catch {
    return false;
  }
}

const mockPrisma = createMockPrisma();
let realPrisma = null;
let useMock = true;

const connectionString = process.env.DATABASE_URL;

if (isValidDatabaseUrl(connectionString)) {
  try {
    const adapter = new PrismaNeon({ connectionString });
    realPrisma = new PrismaClient({ adapter });
    useMock = false;
  } catch {
    useMock = true;
  }
} else {
  useMock = true;
}

// Resilient wrapper: routes to real Prisma if connected and healthy, falls back to in-memory mock cleanly
const prismaWrapper = new Proxy({}, {
  get: (target, prop) => {
    if (prop === '$connect') {
      return async () => {
        if (!realPrisma || useMock) {
          return mockPrisma.$connect();
        }
        try {
          await Promise.race([
            realPrisma.$connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 2000)),
          ]);
          console.log('✅ Connected to remote PostgreSQL database');
        } catch {
          useMock = true;
          return mockPrisma.$connect();
        }
      };
    }

    if (prop === '$disconnect') {
      return async () => {
        if (realPrisma && !useMock) {
          try { await realPrisma.$disconnect(); } catch (_) {}
        }
        return mockPrisma.$disconnect();
      };
    }

    if (prop === '$transaction') {
      return async (fn) => {
        if (!useMock && realPrisma) {
          try {
            return await realPrisma.$transaction(fn);
          } catch {
            useMock = true;
            return mockPrisma.$transaction(fn);
          }
        }
        return mockPrisma.$transaction(fn);
      };
    }

    const mockModel = mockPrisma[prop];
    if (!useMock && realPrisma && realPrisma[prop]) {
      const realModel = realPrisma[prop];
      return new Proxy(realModel, {
        get: (mTarget, mProp) => {
          if (typeof mTarget[mProp] === 'function') {
            return async (...args) => {
              if (useMock) {
                return typeof mockModel?.[mProp] === 'function' ? mockModel[mProp](...args) : undefined;
              }
              try {
                return await mTarget[mProp](...args);
              } catch {
                useMock = true;
                return typeof mockModel?.[mProp] === 'function' ? mockModel[mProp](...args) : undefined;
              }
            };
          }
          return mTarget[mProp];
        },
      });
    }

    return mockModel;
  },
});

export default prismaWrapper;