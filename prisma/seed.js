import prisma from '../src/config/db.js';

const topics = [
  // 5 DSA Topics
  { slug: 'dsa-arrays', name: 'DSA - Arrays', category: 'DSA' },
  { slug: 'dsa-graphs-dp', name: 'DSA - Graphs & DP', category: 'DSA' },
  { slug: 'dsa-linked-list', name: 'DSA - Linked List', category: 'DSA' },
  { slug: 'dsa-stack-queue', name: 'DSA - Stack & Queue', category: 'DSA' },
  { slug: 'dsa-trees', name: 'DSA - Trees', category: 'DSA' },

  // 4 CORE Topics
  { slug: 'aptitude', name: 'Aptitude', category: 'CORE' },
  { slug: 'dbms', name: 'DBMS', category: 'CORE' },
  { slug: 'oops', name: 'OOPs', category: 'CORE' },
  { slug: 'system-design', name: 'System Design', category: 'CORE' },
];

async function main() {
  console.log(`🌱 Seeding ${topics.length} topics...`);
  for (const t of topics) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name, category: t.category },
      create: t,
    });
    console.log(`  ✅ [${t.category}] ${t.slug} - ${t.name}`);
  }
  console.log(`\n🎉 Successfully seeded ${topics.length} topics.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });