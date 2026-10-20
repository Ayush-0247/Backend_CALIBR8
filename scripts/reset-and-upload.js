import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../src/config/db.js';

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

// ==============================================================================
// SCRIPT DOCUMENTATION & USAGE GUIDE
// ==============================================================================
/**
 * WHAT IS THE NEED FOR THIS SCRIPT:
 * ---------------------------------
 * 1. Clean Slate Seeding / Database Reset:
 *    During development, testing, or database schema migrations, existing problem
 *    testcases, templates, or submissions might get into an inconsistent state.
 *    This script completely wipes (TRUNCATES or DELETES) all problems, testcases,
 *    code templates, and submissions tables, and restarts auto-incrementing IDs.
 *
 * 2. Complete Fresh Import of the Problem Catalogue:
 *    After cleaning, it iterates through all 15 JSON problem files in `./problems/`
 *    in sorted order and performs a fresh bulk creation with all testcases, starter
 *    templates, and limits, printing a formatted summary table at the end.
 *
 * ⚠️ WARNING:
 * -----------
 * This script is DESTRUCTIVE. It wipes existing problem data and testcases from the
 * connected database. Only run this in development, staging, or during initial setup.
 *
 * PREREQUISITES:
 * --------------
 * - A valid DATABASE_URL must be configured in your `.env` file.
 * - Database tables must be provisioned (`npm run db:push` or Prisma migrations).
 *
 * HOW TO USE THIS SCRIPT:
 * -----------------------
 * 1. Ensure `.env` has your DATABASE_URL set.
 * 2. Run the script via Node:
 *    $ node scripts/reset-and-upload.js
 *
 * 3. Or run with an explicit DATABASE_URL inline:
 *    $ DATABASE_URL="postgresql://user:pass@host/db" node scripts/reset-and-upload.js
 */


// node scripts/reset-and-upload.js