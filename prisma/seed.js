import prisma from '../src/config/db.js';

const topics = [
  // Your existing DSA dropdown topics
  { slug: 'dsa-arrays', name: 'DSA - Arrays', category: 'DSA' },
  { slug: 'dsa-linked-list', name: 'DSA - Linked List', category: 'DSA' },
  { slug: 'dsa-stack-queue', name: 'DSA - Stack & Queue', category: 'DSA' },
  { slug: 'dsa-trees', name: 'DSA - Trees', category: 'DSA' },
  { slug: 'dsa-graphs-dp', name: 'DSA - Graphs & DP', category: 'DSA' },

  // Merged - extra DSA sub-topics (problems filter karne ke kaam ayenge)
  { slug: 'dsa-strings', name: 'DSA - Strings', category: 'DSA' },
  { slug: 'dsa-two-pointers', name: 'DSA - Two Pointers', category: 'DSA' },
  { slug: 'dsa-binary-search', name: 'DSA - Binary Search', category: 'DSA' },
  { slug: 'dsa-heap', name: 'DSA - Heap', category: 'DSA' },
  { slug: 'dsa-recursion', name: 'DSA - Recursion', category: 'DSA' },

  // Your CORE subjects
  { slug: 'aptitude', name: 'Aptitude', category: 'CORE' },
  { slug: 'dbms', name: 'DBMS', category: 'CORE' },
  { slug: 'oops', name: 'OOPs', category: 'CORE' },
  { slug: 'system-design', name: 'System Design', category: 'CORE' },

  // Extra CORE for 50-100 users roadmap
  { slug: 'os', name: 'Operating System', category: 'CORE' },
  { slug: 'cn', name: 'Computer Networks', category: 'CORE' },
];

async function main() {
  console.log(`Seeding ${topics.length} topics...`);
  for (const t of topics) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name, category: t.category },
      create: t,
    });
    console.log(`  ✅ ${t.slug}`);
  }
  console.log(`\n✅ Seeded ${topics.length} topics successfully.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });