import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

<<<<<<< HEAD
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const dsaTopics = [
  { slug: "dsa-arrays", name: "DSA - Arrays" },
  { slug: "dsa-linked-list", name: "DSA - Linked List" },
  { slug: "dsa-stack-queue", name: "DSA - Stack & Queue" },
  { slug: "dsa-trees", name: "DSA - Trees" },
  { slug: "dsa-graphs-dp", name: "DSA - Graphs & DP" },
];

async function main() {
  await prisma.userTopic.deleteMany({});
  await prisma.topic.deleteMany({});
  for (const t of dsaTopics) {
    await prisma.topic.create({ data: t });
  }
  console.log("✅ Seeded 5 DSA topics");
=======
export const topics = [
  // DSA topics
  { slug: 'arrays', name: 'Arrays', category: 'DSA' },
  { slug: 'strings', name: 'Strings', category: 'DSA' },
  { slug: 'linked-lists', name: 'Linked Lists', category: 'DSA' },
  { slug: 'stacks-queues', name: 'Stacks & Queues', category: 'DSA' },
  { slug: 'trees', name: 'Trees & BST', category: 'DSA' },
  { slug: 'graphs', name: 'Graphs', category: 'DSA' },
  { slug: 'dynamic-programming', name: 'Dynamic Programming', category: 'DSA' },
  { slug: 'recursion-backtracking', name: 'Recursion & Backtracking', category: 'DSA' },
  { slug: 'sorting-searching', name: 'Sorting & Searching', category: 'DSA' },
  { slug: 'heaps-hashmaps', name: 'Heaps & HashMaps', category: 'DSA' },

  // Core CS topics
  { slug: 'dsa', name: 'DSA (General)', category: 'CORE' },
  { slug: 'dbms', name: 'DBMS', category: 'CORE' },
  { slug: 'oops', name: 'OOPs', category: 'CORE' },
  { slug: 'system-design', name: 'System Design', category: 'CORE' },
  { slug: 'aptitude', name: 'Aptitude', category: 'CORE' },
];

async function main() {
  for (const t of topics) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name, category: t.category },
      create: t,
    });
  }
  console.log(`✅ Seeded ${topics.length} topics successfully.`);
>>>>>>> c826f0c84177c59c7f4b51fd60975631fbada1c7
}
main().finally(() => prisma.$disconnect());
