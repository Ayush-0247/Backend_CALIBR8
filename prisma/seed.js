import prisma from '../src/config/db.js';

const topics = [
  // DSA topics for dropdown
  { slug: 'dsa-arrays', name: 'DSA - Arrays', category: 'DSA' },
  { slug: 'dsa-linked-list', name: 'DSA - Linked List', category: 'DSA' },
  { slug: 'dsa-stack-queue', name: 'DSA - Stack & Queue', category: 'DSA' },
  { slug: 'dsa-trees', name: 'DSA - Trees', category: 'DSA' },
  { slug: 'dsa-graphs-dp', name: 'DSA - Graphs & DP', category: 'DSA' },
  // Core subjects
  { slug: 'aptitude', name: 'Aptitude', category: 'CORE' },
  { slug: 'dbms', name: 'DBMS', category: 'CORE' },
  { slug: 'oops', name: 'OOPs', category: 'CORE' },
  { slug: 'system-design', name: 'System Design', category: 'CORE' },
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