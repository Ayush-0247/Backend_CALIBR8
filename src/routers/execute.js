import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

const LANG_MAP = {
  python: { language: 'python', version: '3.10.0', file: 'main.py' },
  cpp: { language: 'c++', version: '10.2.0', file: 'main.cpp' },
  javascript: { language: 'javascript', version: '18.15.0', file: 'main.js' },
  java: { language: 'java', version: '15.0.2', file: 'Main.java' }
};

async function runWithPiston(language, code, stdin) {
  const langCfg = LANG_MAP[language];
  if (!langCfg) throw new Error(`Unsupported language: ${language}`);

  console.log(`[Piston] Running ${language} with stdin: ${stdin.substring(0,50)}`);

  const payload = {
    language: langCfg.language,
    version: langCfg.version,
    files: [{ name: langCfg.file, content: code }],
    stdin: stdin,
    run_timeout: 3000,
    compile_timeout: 10000
  };

  const res = await fetch(PISTON_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Piston HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  
  if (!data.run) {
    throw new Error('Piston no run data: ' + JSON.stringify(data));
  }

  return {
    stdout: (data.run.stdout || '').trim(),
    stderr: (data.run.stderr || '').trim(),
    code: data.run.code,
    signal: data.run.signal
  };
}

// POST /api/problems/:slug/run
router.post('/:slug/run', async (req, res) => {
  console.log('[RUN] Body:', req.body);
  try {
    const { slug } = req.params;
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({ success: false, message: 'language and code required' });
    }

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: { testcases: { orderBy: { testIndex: 'asc' } } }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: `Problem ${slug} not found` });
    }

    console.log(`[RUN] Problem ${slug} has ${problem.testcases.length} testcases`);

    const visibleCases = problem.testcases.filter(tc => tc.isVisible).slice(0, 3);
    
    const results = [];
    for (const tc of visibleCases) {
      try {
        const output = await runWithPiston(language, code, tc.stdinSmall);
        const passed = output.stdout === tc.expectedSmall.trim() && output.code === 0;
        
        results.push({
          testIndex: tc.testIndex,
          input: tc.stdinSmall,
          expected: tc.expectedSmall,
          actual: output.stdout,
          stderr: output.stderr,
          passed,
          status: output.code === 0 ? (passed ? 'Passed' : 'Wrong Answer') : 'Runtime Error'
        });
      } catch (err) {
        console.error(`[RUN] TC ${tc.testIndex} error:`, err.message);
        results.push({
          testIndex: tc.testIndex,
          input: tc.stdinSmall,
          expected: tc.expectedSmall,
          actual: '',
          stderr: err.message,
          passed: false,
          status: 'Error'
        });
      }
    }

    const allPassed = results.every(r => r.passed);
    
    res.json({
      success: true,
      data: {
        slug: problem.slug,
        allPassed,
        results
      }
    });

  } catch (e) {
    console.error('[RUN] Fatal error:', e);
    res.status(500).json({ success: false, message: e.message, stack: e.stack });
  }
});

// POST /api/problems/:slug/submit
router.post('/:slug/submit', async (req, res) => {
  console.log('[SUBMIT] Body:', req.body);
  try {
    const { slug } = req.params;
    const { language, code, userId } = req.body;

    if (!language || !code) {
      return res.status(400).json({ success: false, message: 'language and code required' });
    }

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: { testcases: { orderBy: { testIndex: 'asc' } } }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    console.log(`[SUBMIT] Problem ${slug} has ${problem.testcases.length} TCs`);

    const results = [];
    for (const tc of problem.testcases) {
      try {
        const output = await runWithPiston(language, code, tc.stdinSmall);
        const passed = output.stdout === tc.expectedSmall.trim() && output.code === 0;
        
        results.push({
          testIndex: tc.testIndex,
          passed,
          status: output.code === 0 ? (passed ? 'Passed' : 'Wrong Answer') : 'Runtime Error',
          input: tc.isVisible ? tc.stdinSmall : undefined,
          expected: tc.isVisible ? tc.expectedSmall : undefined,
          actual: tc.isVisible ? output.stdout : undefined
        });

      } catch (err) {
        console.error(`[SUBMIT] TC ${tc.testIndex} error:`, err.message);
        results.push({
          testIndex: tc.testIndex,
          passed: false,
          status: 'Error',
          error: err.message
        });
        break;
      }
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = problem.testcases.length;
    const verdict = passedCount === totalCount ? 'Accepted' : 'Wrong Answer';

    console.log(`[SUBMIT] Verdict: ${verdict} ${passedCount}/${totalCount}`);

    res.json({
      success: true,
      data: {
        slug: problem.slug,
        verdict,
        passedCount,
        totalCount,
        results
      }
    });

  } catch (e) {
    console.error('[SUBMIT] Fatal error:', e);
    res.status(500).json({ success: false, message: e.message, stack: e.stack });
  }
});

export default router;