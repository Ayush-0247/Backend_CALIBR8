import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../src/config/db.js';

async function uploadProblem(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const slug = data.slug || path.basename(jsonPath, '.json');

  // Agar already hai to SKIP - yehi tujhe chahiye
  const existing = await prisma.problem.findUnique({ where: { slug } });
  if (existing) {
    console.log(`⏭️  SKIP ${slug} - already exists in DB, keeping old one`);
    return { skipped: true, slug };
  }

  const timeLimit = data.timeLimit || data.time_limit || 1000;
  const memoryLimit = data.memoryLimit || data.memory_limit || 256;

  const testcases = (data.testcases || []).map((tc, idx) => {
    const input = tc.input ?? tc.stdinSmall ?? tc.stdin ?? tc.stdin_small ?? '';
    const output = tc.output ?? tc.expectedSmall ?? tc.expected ?? tc.expected_small ?? '';
    const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
    const outputStr = typeof output === 'object' ? JSON.stringify(output) : String(output);
    return {
      testIndex: tc.testIndex ?? tc.index ?? idx,
      isVisible: tc.isVisible ?? tc.visible ?? true,
      stdinSmall: inputStr,
      expectedSmall: outputStr,
      sizeBytes: Buffer.byteLength(inputStr, 'utf8'),
      r2Key: tc.r2Key || null
    };
  });

  const templates = Object.entries(data.templates || {}).map(([lang, code]) => ({
    language: lang,
    code: String(code)
  }));

  const created = await prisma.problem.create({
    data: {
      slug,
      title: data.title || slug,
      description: data.description || data.title || 'No description',
      difficulty: data.difficulty || 'Easy',
      timeLimit,
      memoryLimit,
      testcases: { create: testcases },
      templates: { create: templates }
    },
    include: { _count: { select: { testcases: true, templates: true } } }
  });

  console.log(`✅ NEW ${created.slug} (#${created.problemNumber}) - ${created._count.testcases} TCs, ${created._count.templates} templates`);
  return { skipped: false, slug: created.slug };
}

const target = process.argv[2];
if (!target) {
  console.log("Usage: node scripts/upload-problem.js ./problems");
  process.exit(1);
}

let results = { added: 0, skipped: 0 };

if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
  const files = fs.readdirSync(target).filter(f => f.endsWith('.json')).sort();
  console.log(`📂 Found ${files.length} JSON files in ${target}\n`);
  for (const f of files) {
    const fullPath = path.join(target, f);
    const res = await uploadProblem(fullPath);
    if (res.skipped) results.skipped++;
    else results.added++;
  }
} else {
  const res = await uploadProblem(target);
  if (res.skipped) results.skipped++;
  else results.added++;
}

await prisma.$disconnect();

console.log(`\n🎉 DONE - Added: ${results.added}, Skipped: ${results.skipped}`);



// ==============================================================================
// SCRIPT DOCUMENTATION & USAGE GUIDE
// ==============================================================================
/**
 * WHAT IS THE NEED FOR THIS SCRIPT:
 * ---------------------------------
 * 1. Incremental Problem Ingestion:
 *    When you add a new problem JSON file or multiple problem definitions to the
 *    `./problems` directory, this script reads each JSON file, parses its metadata,
 *    testcases, and starter templates, and inserts them into PostgreSQL via Prisma.
 *
 * 2. Idempotent & Safe against Duplication:
 *    Unlike naive insert scripts, `upload-problem.js` checks if the problem slug
 *    already exists in the database. If it exists, it safely SKIPS it, ensuring
 *    existing problem records and primary keys are preserved without P2002 errors.
 *
 * 3. Supports Single File or Entire Folder:
 *    Allows developers to either ingest one specific problem or bulk-process all
 *    JSON files present in a target folder.
 *
 * PREREQUISITES:
 * --------------
 * - A valid DATABASE_URL must be defined in your `.env` file.
 * - Database tables must exist (run `npm run db:push` or apply Prisma migrations).
 *
 * HOW TO USE THIS SCRIPT:
 * -----------------------
 * 1. To upload/sync all JSON problem files in the problems directory:
 *    $ node scripts/upload-problem.js ./problems
 *
 * 2. To upload a single problem JSON file:
 *    $ node scripts/upload-problem.js ./problems/two-sum.json
 *
 * 3. To run with custom environment variables:
 *    $ DATABASE_URL="postgresql://user:pass@host/db" node scripts/upload-problem.js ./problems
 */


// node scripts/upload-problem.js ./problems