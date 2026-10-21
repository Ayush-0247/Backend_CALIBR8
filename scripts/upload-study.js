import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STUDY_DIR = path.join(__dirname, '../study-material');

function getOrderFromName(name) {
  const match = name.match(/^(\d+)-/);
  return match ? parseInt(match[1]) : 999;
}
function getSlugFromName(name) {
  return name.replace(/^\d+-/, '').toLowerCase();
}
function getNameFromSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function main() {
  console.log(`🚀 Starting Full Sync from: ${STUDY_DIR}\n`);

  const subjectFolders = fs.readdirSync(STUDY_DIR).filter(f => 
    fs.statSync(path.join(STUDY_DIR, f)).isDirectory()
  );

  for (const subjectFolder of subjectFolders) {
    const subjectPath = path.join(STUDY_DIR, subjectFolder);
    const subjectSlug = getSlugFromName(subjectFolder);
    const subjectName = getNameFromSlug(subjectSlug);
    const subjectOrder = getOrderFromName(subjectFolder);

    console.log(`\n📚 SUBJECT: ${subjectName} (${subjectSlug})`);

    const subject = await prisma.studySubject.upsert({
      where: { slug: subjectSlug },
      update: { name: subjectName, order: subjectOrder },
      create: { slug: subjectSlug, name: subjectName, order: subjectOrder },
    });

    const chapterFolders = fs.readdirSync(subjectPath).filter(f =>
      fs.statSync(path.join(subjectPath, f)).isDirectory()
    );

    for (const chapterFolder of chapterFolders) {
      const chapterPath = path.join(subjectPath, chapterFolder);
      const chapterSlug = getSlugFromName(chapterFolder);
      const chapterName = getNameFromSlug(chapterSlug);
      const chapterOrder = getOrderFromName(chapterFolder);

      console.log(`  📖 CHAPTER: ${chapterName} [${chapterSlug}]`);

      const chapter = await prisma.studyChapter.upsert({
        where: { subjectId_slug: { subjectId: subject.id, slug: chapterSlug } },
        update: { name: chapterName, order: chapterOrder },
        create: { slug: chapterSlug, name: chapterName, subjectId: subject.id, order: chapterOrder },
      });

      const topicFiles = fs.readdirSync(chapterPath).filter(f => f.endsWith('.json'));

      for (const topicFile of topicFiles) {
        const filePath = path.join(chapterPath, topicFile);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let data;
        try {
          data = JSON.parse(fileContent);
        } catch (e) {
          console.log(`    ❌ Invalid JSON: ${topicFile}`);
          continue;
        }

        const existingTopic = await prisma.studyTopic.findUnique({
          where: { chapterId_slug: { chapterId: chapter.id, slug: data.topic } },
          include: { mcqs: true }
        });

        // --- YAHAN FIX HAI ---
        // Ab pura file ka hash check karega, sirf content nahi
        const newMcqString = JSON.stringify(data.mcqs || []);
        const oldMcqString = JSON.stringify(existingTopic?.mcqs.map(m => ({
          question: m.question, options: m.options, correctIndex: m.correctIndex, explanation: m.explanation, difficulty: m.difficulty, order: m.order
        })) || []);

        const isChanged = !existingTopic || 
                          existingTopic.content !== data.content || 
                          existingTopic.name !== data.topicName ||
                          newMcqString !== oldMcqString;

        // Topic hamesha upsert - latest content
        const topic = await prisma.studyTopic.upsert({
          where: { chapterId_slug: { chapterId: chapter.id, slug: data.topic } },
          update: { name: data.topicName, content: data.content, order: data.order || 0 },
          create: {
            slug: data.topic,
            name: data.topicName,
            chapterId: chapter.id,
            order: data.order || 0,
            content: data.content,
          }
        });

        if (isChanged) {
          await prisma.studyMCQ.deleteMany({ where: { topicId: topic.id } });
          if (data.mcqs && data.mcqs.length > 0) {
            await prisma.studyMCQ.createMany({
              data: data.mcqs.map(mcq => ({
                topicId: topic.id,
                question: mcq.question,
                options: mcq.options,
                correctIndex: mcq.correctIndex,
                explanation: mcq.explanation || "",
                difficulty: mcq.difficulty || "Easy",
                order: mcq.order || 0,
              }))
            });
          }
          const status = existingTopic ? "🔄 UPDATED" : "✨ CREATED";
          console.log(`    ${status} Topic: ${data.topic} (${data.mcqs?.length || 0} MCQs)`);
        } else {
          console.log(`    ⏭️  SKIPPED (No Change): ${data.topic}`);
        }
      }
    }
  }
  console.log('\n🎉 Full Sync Completed!');
}

main().catch(e => { console.error(e); process.exit(1); })
.finally(async () => { await prisma.$disconnect(); await pool.end(); });


// node scripts/upload-study.js