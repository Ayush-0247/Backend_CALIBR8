import 'dotenv/config';
import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';

const { PrismaClient } = pkg;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('Usage: node scripts/bulk-push.js ./problems/file1.json');
  process.exit(1);
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const p = JSON.parse(raw);
  console.log(`\nPushing ${p.slug}...`);
  
  const testcases = (p.testcases || []).map((tc, idx) => {
    const input = tc.input || tc.stdinSmall || '';
    const output = tc.output || tc.expectedSmall || '';
    const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
    const outputStr = typeof output === 'object' ? JSON.stringify(output) : String(output);
    return {
      testIndex: tc.testIndex ?? idx,
      isVisible: tc.isVisible ?? true,
      stdinSmall: inputStr,
      expectedSmall: outputStr,
      sizeBytes: Buffer.byteLength(inputStr, 'utf8'),
      r2Key: tc.r2Key || null
    };
  });

  const templates = Object.entries(p.templates || {}).map(([lang, code]) => ({
    language: lang,
    code: String(code)
  }));

  try {
    const created = await prisma.problem.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        timeLimit: p.timeLimit || 1000,
        memoryLimit: p.memoryLimit || 256,
        testcases: { create: testcases },
        templates: { create: templates }
      },
      include: { _count: { select: { testcases: true, templates: true } } }
    });
    console.log(`✅ Created ${created.slug} (#${created.problemNumber}) with ${created._count.testcases} TCs, ${created._count.templates} templates`);
  } catch (e) {
    if (e.code === 'P2002') {
      console.log(`⚠️  ${p.slug} exists, deleting...`);
      await prisma.problem.delete({ where: { slug: p.slug } });
      const created = await prisma.problem.create({
        data: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          timeLimit: p.timeLimit || 1000,
          memoryLimit: p.memoryLimit || 256,
          testcases: { create: testcases },
          templates: { create: templates }
        },
        include: { _count: { select: { testcases: true, templates: true } } }
      });
      console.log(`✅ Re-created ${created.slug}`);
    } else {
      console.error(e.message);
    }
  }
}

await prisma.$disconnect();
await pool.end();