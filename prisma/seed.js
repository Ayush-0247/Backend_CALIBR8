import prisma from '../src/config/db.js';

const topics = [
  { slug: 'dsa', name: 'DSA', active: true },
  { slug: 'system-design', name: 'System Design', active: true },
  { slug: 'dbms', name: 'DBMS', active: true },
  { slug: 'aptitude', name: 'Aptitude', active: true },
  { slug: 'oops', name: 'OOPs', active: false },
];

async function main() {
  for (const t of topics) {
    await prisma.topic.upsert({ where: { slug: t.slug }, update: t, create: t });
  }
  console.log('Seeded');
}
main().then(() => prisma.$disconnect());