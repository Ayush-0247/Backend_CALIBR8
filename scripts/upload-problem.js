import dotenv from "dotenv"
dotenv.config()
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2 } from "../lib/storage.js"
import fs from "fs"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function uploadProblem(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  const existing = await prisma.problem.findUnique({ where: { slug: data.slug } })
  if (existing) {
    console.log(`SKIP ${data.slug} - already exists, keeping old one`);
    return
  }

  const problem = await prisma.problem.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      timeLimit: data.time_limit || 1000,
      memoryLimit: data.memory_limit || 256,
    }
  })

  console.log(`Created ${data.slug} (${problem.id})`)

  for (let i = 0; i < data.testcases.length; i++) {
    const tc = data.testcases[i]
    const inputText = tc.input || tc.stdinSmall || tc.stdin || '';
    const hasR2 = process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_ACCOUNT_ID

    if (size < 64000) {
      await prisma.testcase.create({
        data: {
          problemId: problem.id,
          testIndex: i + 1,
          isVisible: tc.visible,
          sizeBytes: size,
          stdinSmall: tc.input,
          expectedSmall: tc.output,
        }
      })
      console.log(`  TC ${i + 1}: small -> Neon`)
    } else {
      if (!hasR2) {
        console.log(`  TC ${i + 1}: large (${size}B) -> SKIPPED (R2 not configured, placeholder saved)`)
        await prisma.testcase.create({
          data: {
            problemId: problem.id,
            testIndex: i + 1,
            isVisible: tc.visible,
            sizeBytes: size,
            r2InputKey: `PENDING_${problem.id}_${i+1}`,
            r2OutputKey: `PENDING_${problem.id}_${i+1}`,
          }
        })
        continue
      }
      const inputKey = `problems/${problem.id}/input_${i + 1}.txt`
      const outputKey = `problems/${problem.id}/output_${i + 1}.txt`
      await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: inputKey, Body: tc.input }))
      await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: outputKey, Body: tc.output }))
      await prisma.testcase.create({
        data: {
          problemId: problem.id,
          testIndex: i + 1,
          isVisible: tc.visible,
          sizeBytes: size,
          r2InputKey: inputKey,
          r2OutputKey: outputKey,
        }
      })
      console.log(`  TC ${i + 1}: large -> R2`)
    }
  }
  console.log(`  DONE ${data.testcases.length} testcases\n`)
}

const target = process.argv[2]
if (!target) {
  console.log("Usage: node scripts/upload-problem.js ./problems/problem.json OR ./problems")
  process.exit(1)
}

if (fs.statSync(target).isDirectory()) {
  const files = fs.readdirSync(target).filter(f => f.endsWith('.json'))
  console.log(`Found ${files.length} problems in ${target}\n`)
  for (const f of files) {
    await uploadProblem(`${target}/${f}`)
  }
} else {
  await uploadProblem(target)
}

await prisma.$disconnect()
await pool.end()
console.log("ALL DONE - old problems kept, new ones uploaded")