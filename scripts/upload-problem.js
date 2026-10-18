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
  
  // No transaction for Prisma 7 - but we delete if fails to keep DB clean
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
  console.log(`Created problem ${problem.id} - ${problem.slug}`)

  try {
    for (let i = 0; i < data.testcases.length; i++) {
      const tc = data.testcases[i]
      const size = Buffer.byteLength(tc.input, 'utf8')
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
        console.log(`  TC ${i+1}: small (${size}B) -> Neon`)
      } else {
        if (!hasR2) {
          console.log(`  TC ${i+1}: large (${size}B) -> SKIPPED (R2 not configured)`)
          // still create placeholder so problem doesn't break
          await prisma.testcase.create({
            data: {
              problemId: problem.id,
              testIndex: i + 1,
              isVisible: tc.visible,
              sizeBytes: size,
              stdinSmall: null,
              expectedSmall: null,
              r2InputKey: `PENDING_R2_${problem.id}_${i+1}`,
              r2OutputKey: `PENDING_R2_${problem.id}_${i+1}`,
            }
          })
          continue
        }

        const inputKey = `problems/${problem.id}/input_${i+1}.txt`
        const outputKey = `problems/${problem.id}/output_${i+1}.txt`

        await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: inputKey, Body: tc.input }))
        await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: outputKey, Body: tc.output }))

        await prisma.testcase.create({
          data: {
            problemId: problem.id,
            testIndex: i+1,
            isVisible: tc.visible,
            sizeBytes: size,
            r2InputKey: inputKey,
            r2OutputKey: outputKey,
          }
        })
        console.log(`  TC ${i+1}: large (${size}B) -> R2`)
      }
    }
    console.log(`DONE - ${data.testcases.length} testcases uploaded\n`)
  } catch (e) {
    console.error("Failed, rolling back problem...", e)
    await prisma.problem.delete({ where: { id: problem.id } })
    throw e
  }
}

// BULK SUPPORT
const target = process.argv[2]
if (!target) {
  console.log("Usage: node scripts/upload-problem.js ./problems/two-sum.json OR ./problems")
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