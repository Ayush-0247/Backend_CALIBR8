import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedProblems() {
  const problemsDir = path.resolve(__dirname, '../problems');

  if (!fs.existsSync(problemsDir)) {
    console.error(`❌ Problems directory not found at: ${problemsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(problemsDir).filter((f) => f.endsWith('.json')).sort();
  console.log(`📂 Found ${files.length} problem JSON files to seed into database\n`);

  let added = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const fullPath = path.join(problemsDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(raw);
      const slug = data.slug || path.basename(file, '.json').toLowerCase();

      // Check if problem already exists
      const existing = await prisma.problem.findUnique({ where: { slug } });
      if (existing) {
        console.log(`⏭️  SKIP ${slug} - already exists in database`);
        skipped++;
        continue;
      }

      const timeLimit = data.timeLimit || data.time_limit || 1000;
      const memoryLimit = data.memoryLimit || data.memory_limit || 256;

      const testcases = (data.testcases || []).map((tc, idx) => {
        const input = tc.input ?? tc.stdinSmall ?? tc.stdin ?? '';
        const output = tc.output ?? tc.expectedSmall ?? tc.expected ?? '';
        const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
        const outputStr = typeof output === 'object' ? JSON.stringify(output) : String(output);
        return {
          testIndex: tc.testIndex ?? tc.index ?? idx,
          isVisible: tc.isVisible ?? tc.visible ?? true,
          stdinSmall: inputStr,
          expectedSmall: outputStr,
          sizeBytes: Buffer.byteLength(inputStr, 'utf8'),
          r2Key: tc.r2Key || null,
        };
      });

      const templates = Object.entries(data.templates || {}).map(([lang, code]) => ({
        language: lang,
        code: String(code),
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
          templates: { create: templates },
        },
        include: {
          _count: { select: { testcases: true, templates: true } },
        },
      });

      console.log(
        `✅ Created #${created.problemNumber} ${created.slug} (${created._count.testcases} TCs, ${created._count.templates} templates)`
      );
      added++;
    } catch (err) {
      console.error(`❌ Failed to process ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 Problem Seeding Finished — Added: ${added}, Skipped: ${skipped}`);
}

seedProblems()
  .catch((e) => {
    console.error('❌ Seeding problems failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
