import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('Usage: node scripts/bulk-push.js ./problems/file1.json ./problems/file2.json');
  process.exit(1);
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const p = JSON.parse(raw);
  console.log(`\nPushing ${p.slug}...`);
  try {
    const created = await prisma.problem.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        timeLimit: p.timeLimit,
        memoryLimit: p.memoryLimit,
        testcases: {
          create: p.testcases.map(tc => {
            const input = tc.input || tc.stdinSmall || '';
            const output = tc.output || tc.expectedSmall || '';
            return {
              testIndex: tc.testIndex,
              isVisible: tc.isVisible,
              stdinSmall: input,
              expectedSmall: output,
              sizeBytes: Buffer.byteLength(input, 'utf8')
            };
          })
        }
      },
      include: { _count: { select: { testcases: true } } }
    });
    console.log(`✅ Created ${created.slug} (#${created.problemNumber}) with ${created._count.testcases} TCs`);
  } catch (e) {
    if (e.code === 'P2002') {
      console.log(`⚠️  ${p.slug} already exists, deleting and re-creating...`);
      await prisma.problem.delete({ where: { slug: p.slug } });
      // retry
      const created = await prisma.problem.create({
        data: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          timeLimit: p.timeLimit,
          memoryLimit: p.memoryLimit,
          testcases: {
            create: p.testcases.map(tc => {
              const input = tc.input || tc.stdinSmall || '';
              const output = tc.output || tc.expectedSmall || '';
              return {
                testIndex: tc.testIndex,
                isVisible: tc.isVisible,
                stdinSmall: input,
                expectedSmall: output,
                sizeBytes: Buffer.byteLength(input, 'utf8')
              };
            })
          }
        },
        include: { _count: { select: { testcases: true } } }
      });
      console.log(`✅ Re-created ${created.slug} (#${created.problemNumber})`);
    } else {
      console.error(e);
    }
  }
}

await prisma.$disconnect();
await pool.end();
console.log('\nDone!');