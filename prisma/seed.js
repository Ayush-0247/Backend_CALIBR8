import prisma from '../src/config/db.js';

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
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());