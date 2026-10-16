import prisma from '../src/config/db.js';

const topics = [
  { slug: 'aptitude', name: 'Aptitude' },
  { slug: 'dsa', name: 'DSA' },
  { slug: 'dbms', name: 'DBMS' },
  { slug: 'oops', name: 'OOPs' },
  { slug: 'system-design', name: 'System Design' },
];

async function main() {
  for (const t of topics) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: t,
    });
  }
  console.log('✅ Seeded 5 topics successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());