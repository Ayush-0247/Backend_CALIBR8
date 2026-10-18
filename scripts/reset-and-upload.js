import 'dotenv/config';
import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { PrismaClient } = pkg;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('🔥 Step 1: Deleting all old problems & resetting...');

// Safe truncate - try with code_templates, if fails try without
try {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "problems", "testcases", "code_templates", "submissions" RESTART IDENTITY CASCADE;`);
  console.log('✅ Tables cleaned (with code_templates)');
} catch (e) {
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "problems", "testcases" RESTART IDENTITY CASCADE;`);
    console.log('✅ Tables cleaned (only problems & testcases, code_templates will be created by migration)');
  } catch (e2) {
    console.log('⚠️  TRUNCATE failed, trying DELETE...');
    await prisma.$executeRawUnsafe(`DELETE FROM "testcases"; DELETE FROM "code_templates"; DELETE FROM "problems";`);
    console.log('✅ Deleted via DELETE');
  }
}

const problemsDir = './problems';
const files = fs.readdirSync(problemsDir).filter(f => f.endsWith('.json')).sort();
console.log(`\n📂 Found ${files.length} problems:`, files);

for (const file of files) {
  const fullPath = path.join(problemsDir, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const p = JSON.parse(raw);
  console.log(`\nPushing ${p.slug || file}...`);

  const timeLimit = p.timeLimit || p.time_limit || 1000;
  const memoryLimit = p.memoryLimit || p.memory_limit || 256;

  const testcases = (p.testcases || []).map((tc, idx) => {
    const input = tc.input || tc.stdinSmall || tc.stdin || tc.stdin_small || '';
    const output = tc.output || tc.expectedSmall || tc.expected || tc.expected_small || '';
    const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
    const outputStr = typeof output === 'object' ? JSON.stringify(output) : String(output);
    return {
      testIndex: tc.testIndex ?? tc.index ?? idx,
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
        slug: p.slug || file.replace('.json',''),
        title: p.title || p.slug,
        description: p.description || p.title || 'No description',
        difficulty: p.difficulty || 'Easy',
        timeLimit,
        memoryLimit,
        testcases: { create: testcases },
        templates: { create: templates }
      }
    });
    console.log(`✅ #${created.problemNumber} - ${created.slug} (${testcases.length} TCs, ${templates.length} templates)`);
  } catch (e) {
    console.error(`❌ Failed ${file}:`, e.message);
  }
}

const all = await prisma.problem.findMany({ orderBy: { problemNumber: 'asc' }, select: { problemNumber: true, slug: true, title: true, _count: { select: { templates: true, testcases: true } } } });
console.log('\n🎉 FINAL LIST:');
console.table(all);

await prisma.$disconnect();
await pool.end();