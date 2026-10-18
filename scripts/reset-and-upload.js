import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('🔥 Step 1: Deleting all old problems & resetting numbers to 1...');
await prisma.$executeRawUnsafe(`TRUNCATE TABLE "problems", "testcases" RESTART IDENTITY CASCADE;`);
console.log('✅ Table cleaned, sequence reset to 1');

const problemsDir = './problems';
const files = fs.readdirSync(problemsDir)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`\n📂 Found ${files.length} problems:`, files);

for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
  const file = files[fileIdx];
  const fullPath = path.join(problemsDir, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const p = JSON.parse(raw);
  
  console.log(`\nPushing ${p.slug || file}...`);
  
  // Handle both old and new formats
  const timeLimit = p.timeLimit || p.time_limit || 1000;
  const memoryLimit = p.memoryLimit || p.memory_limit || 256;
  
  const testcases = p.testcases.map((tc, idx) => {
    const input = tc.input || tc.stdinSmall || tc.stdin || tc.stdin_small || '';
    const output = tc.output || tc.expectedSmall || tc.expected || tc.expected_small || '';
    return {
      testIndex: tc.testIndex ?? tc.index ?? idx,
      isVisible: tc.isVisible ?? (idx < 2), // first 2 visible if not specified
      stdinSmall: String(input),
      expectedSmall: String(output),
      sizeBytes: Buffer.byteLength(String(input), 'utf8')
    };
  });

  try {
    const created = await prisma.problem.create({
      data: {
        slug: p.slug || file.replace('.json',''),
        title: p.title || p.slug,
        description: p.description || p.title || 'No description',
        difficulty: p.difficulty || 'Easy',
        timeLimit: timeLimit,
        memoryLimit: memoryLimit,
        testcases: { create: testcases }
      }
    });
    console.log(`✅ #${created.problemNumber} - ${created.slug}`);
  } catch (e) {
    console.error(`❌ Failed ${file}:`, e.message);
  }
}

const all = await prisma.problem.findMany({ orderBy: { problemNumber: 'asc' }, select: { problemNumber: true, slug: true, title: true } });
console.log('\n🎉 FINAL LIST:');
console.table(all);

await prisma.$disconnect();
await pool.end();
console.log('\nDone! Numbering 1 se sahi hai');