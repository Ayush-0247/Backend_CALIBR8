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

async function main() {
  const subjects = fs.readdirSync(STUDY_DIR);
  for (const subjectSlug of subjects) {
    const subjectPath = path.join(STUDY_DIR, subjectSlug);
    if (!fs.statSync(subjectPath).isDirectory()) continue;
    console.log(`\n📚 Subject: ${subjectSlug}`);
    
    const subject = await prisma.studySubject.upsert({
      where: { slug: subjectSlug },
      update: {},
      create: { slug: subjectSlug, name: subjectSlug.toUpperCase(), order: 0 }
    });

    const chapters = fs.readdirSync(subjectPath);
    let chapterOrder = 1;
    for (const chapterFolder of chapters) {
      const chapterPath = path.join(subjectPath, chapterFolder);
      if (!fs.statSync(chapterPath).isDirectory()) continue;
      const chapterSlug = chapterFolder.split('-').slice(1).join('-') || chapterFolder;
      const chapterName = chapterFolder.replace(/^\d+-/, '').replace(/-/g, ' ');
      console.log(`  📖 Chapter: ${chapterSlug}`);

      const chapter = await prisma.studyChapter.upsert({
        where: { subjectId_slug: { subjectId: subject.id, slug: chapterSlug } },
        update: {},
        create: { slug: chapterSlug, name: chapterName, subjectId: subject.id, order: chapterOrder++ }
      });

      const topicFiles = fs.readdirSync(chapterPath).filter(f => f.endsWith('.json'));
      for (const file of topicFiles) {
        const filePath = path.join(chapterPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`    📝 Topic: ${data.topic}`);

        const topic = await prisma.studyTopic.upsert({
          where: { chapterId_slug: { chapterId: chapter.id, slug: data.topic } },
          update: { name: data.topicName, content: data.content, order: data.order },
          create: { slug: data.topic, name: data.topicName, chapterId: chapter.id, order: data.order, content: data.content }
        });

        await prisma.studyMCQ.deleteMany({ where: { topicId: topic.id } });
        if (data.mcqs?.length > 0) {
          for (const mcq of data.mcqs) {
            await prisma.studyMCQ.create({
              data: {
                topicId: topic.id,
                question: mcq.question,
                options: mcq.options,
                correctIndex: mcq.correctIndex,
                explanation: mcq.explanation,
                difficulty: mcq.difficulty || 'Easy',
                order: mcq.order,
              }
            });
          }
          console.log(`      ✅ ${data.mcqs.length} MCQs added`);
        }
      }
    }
  }
  console.log('\n🎉 All Study Material Uploaded!');
}

main().catch(e => { console.error(e); process.exit(1); })
.finally(async () => { await prisma.$disconnect(); await pool.end(); });