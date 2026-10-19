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
await pool.end();

console.log(`\n🎉 DONE - Added: ${results.added}, Skipped: ${results.skipped}`);



// check for new file in problems folder and upload latest one, skip old ones
 //node scripts/upload-problem.js ./problems