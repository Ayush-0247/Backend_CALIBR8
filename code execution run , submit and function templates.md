# Calibr8 PRD: Code Execution (Run, Submit and Function Templates)

Prepared for: Ayush and team | Phase 2 | Draft v0.1 | October 2026

## 1. Summary

Students pick a language from a dropdown, write code inside a given function template (LeetCode style), and press **Run** (sample tests only) or **Submit** (all tests, scored by tier). Your backend sends the code to a self-hosted **Judge0** engine, collects the results, and returns one clean response to the browser.

**One-line goal:** a student can write a function in Python or JavaScript, press Run and see sample results in a few seconds, press Submit and watch tier-by-tier progress ending in a verdict and points.

## 2. Scope

### In scope (Phase 2)

- Language dropdown with starter templates, Monaco editor, draft saving
- Run: all sample tests in one Judge0 batch, results returned in the same request
- Submit: asynchronous, tier by tier, with progress polling and a final verdict
- Function-style problems with a hidden driver, for **Python 3 and JavaScript first**
- Judge0 client, result normalisation, status mapping, limits and error handling

### Out of scope (later)

- C++ and Java drivers (Phase 2b, after Python and JavaScript are solid)
- Custom input box, special checkers (many valid answers), float tolerance and unordered comparison
- Strict mode, hints, dry run, similarity checks
- Moving to your own judge (Phase 14)

## 3. Decisions (do not change without a reason)

1. **The browser never talks to Judge0.** Frontend, then your backend, then Judge0. This keeps the Judge0 token private and the hidden tests hidden.
2. **The backend compares results, not Judge0.** Students add print statements, which pollute stdout, so the driver prints the answer on a marked line and the backend extracts and compares it.
3. **One Judge0 batch per tier.** Tests inside a tier run in parallel; tiers run one after another and stop at the first failing tier.
4. **Run is synchronous, Submit is asynchronous.** Run holds the HTTP request for a few seconds. Submit returns 202 at once and the frontend polls.
5. **Test inputs are JSON lines**: one JSON value per function argument, in signature order. The same test files work for every language.
6. **Hidden tests never leave the backend.** Sample tests are the only ones whose input and expected output are ever sent to the browser.
7. **Language ids, versions and multipliers live in configuration**, never hardcoded in code.

## 4. User stories and acceptance criteria

| ID | Story | Acceptance criteria |
| --- | --- | --- |
| C-1 | Choose a language | Dropdown lists only enabled languages with their version (for example Python 3.8); switching loads that language's starter code; the student's code for the other language is kept |
| C-2 | Start from a template | Starter code has the right function name, parameters and a placeholder body; a Reset button restores it after a confirmation |
| C-3 | Run my code | Run executes every sample test; I see each case with input, expected output, my output, my own printed output, time, and status; total wait is normally under 5 seconds |
| C-4 | See errors clearly | Compile errors, runtime errors (with the error text) and time limit show a clear message; line numbers refer to my own code |
| C-5 | Submit my code | Submit returns at once; I see progress such as Tier 1 passed, running Tier 2; at the end I see the verdict, tier reached and points |
| C-6 | Not lose work | My code is saved per problem and language as a draft every few seconds and restored on reload |
| C-7 | Be protected from abuse | Too many Run or Submit requests show a polite wait message; oversized code is rejected with a clear reason |
| C-8 | Hidden tests stay hidden | No API response ever includes a hidden test input or expected output beyond the rules in section 9 |

## 5. Architecture and data flow

| Piece | Role |
| --- | --- |
| Frontend (React) | Editor, dropdown, Run and Submit buttons, result panels |
| Backend (Express) | Auth, rate limits, loads tests, builds the source (student code plus driver), calls Judge0, compares, scores, saves |
| Neon Postgres | Problems, versions, sample tests, small hidden tests, submissions |
| Cloudflare R2 | Large hidden test files (cached in backend memory by hash) |
| Judge0 on a VPS | Compiles and runs code in a sandbox; returns status, time, memory, stdout, stderr |

### Run flow

1. Frontend sends POST /runs with the problem id, language and code.
2. Backend validates, checks rate limits and loads the problem's **sample tests** from Neon.
3. Backend builds the source: student code plus the language's driver (with a random result marker).
4. Backend sends all sample tests in **one batch** to Judge0 (stdin is the JSON lines; no expected output is sent).
5. Backend polls Judge0 until all tests are finished, extracts the marker line from each stdout, compares with the expected value, and returns one response.
6. Nothing is scored and nothing is saved.

### Submit flow

1. Frontend sends POST /submissions with the attempt id, language and code, plus an Idempotency-Key header.
2. Backend validates, saves the submission as queued, returns 202 with the submission id.
3. A background runner (in-process for now) processes tiers in order. For each tier it loads the tests (Neon for inline, R2 for large), sends one batch (chunks of at most 20, also capped by total size), waits, and compares.
4. After each tier the progress is saved. If any test in the tier fails, stop.
5. At the end: set the verdict, tier reached and points, then mark the submission done.
6. The frontend polls GET /submissions/:id every second and shows progress.

## 6. API specification (all under /api/v1)

| Endpoint | Auth | Request fields | Response |
| --- | --- | --- | --- |
| GET /languages | Yes | none | List of enabled languages: key, label, version, starter availability |
| GET /problems/:slug | Yes | none | Statement, signature, sample tests, starter code per language (never hidden tests) |
| POST /runs | Yes | problemId, language, code | 200 with overall status, optional compileOutput, and a list of cases (index, input, expected, actual, studentStdout, status, timeMs, memoryKb, errorText) |
| POST /submissions | Yes, plus Idempotency-Key | attemptId, language, code | 202 with submissionId and status queued |
| GET /submissions/:id | Yes (owner only) | none | status (queued, running, done, error), progress (current tier, tiers passed), and when done: verdict, tierReached, scoreUnitsAwarded, maxTimeMs, maxMemoryKb, compileOutput, firstFailure (only per section 9) |

**Errors** use the standard error format from the Phase 1 PRD. Additional codes: CODE\_TOO\_LARGE (413), UNSUPPORTED\_LANGUAGE (422), RATE\_LIMITED (429), JUDGE\_UNAVAILABLE (503).

**Limits (starting values):** code at most 64 KB; Run at most 10 per minute per user; Submit at most 6 per minute; at most 2 jobs in flight per user.

## 7. Problem signature and templates

Each problem declares its function in problem.yaml, and the importer generates starter code per language from it.

```
signature:
  function: longestCalm
  params:
    - { name: readings, type: 'int[]' }
    - { name: k, type: int }
  returns: int
```

**Supported types, version 1:** int, string, bool, double (avoid), int\[\], string\[\], int\[\]\[\]. Avoid long, because JSON numbers lose precision in JavaScript above 2 to the power 53. Add more types only when a real problem needs them.

**Test file format.** For readings \[4, 8, 5, 1, 7\] and k = 4 the input file has two lines and the expected output is one JSON value:

```
[4, 8, 5, 1, 7]
4
```

Expected output: 3

**Consequences for authoring.** Generators print JSON lines (not space-separated numbers), the validator parses them, and the reference solutions are written as functions with the same signature, with a small runner used only by the importer.

### Python starter and driver

Starter shown to the student (note: use List from typing, because older Python versions reject list\[int\]):

```
from typing import List

class Solution:
    def longestCalm(self, readings: List[int], k: int) -> int:
        pass
```

Driver appended by the backend (never shown):

```
import sys, json
_MARK = '__RESULT_a1b2c3d4__'   # random per run, inserted by the backend
_args = [json.loads(l) for l in sys.stdin.read().split('\n') if l.strip()]
_result = Solution().longestCalm(*_args)
print(_MARK + json.dumps(_result))
```

### JavaScript starter and driver

```
class Solution {
  longestCalm(readings, k) {
  }
}
```

```
const _MARK = '__RESULT_a1b2c3d4__';
const _args = require('fs').readFileSync(0, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
console.log(_MARK + JSON.stringify(new Solution().longestCalm(..._args)));
```

### Driver rules

- The student's code goes first and the driver last, so error line numbers match the student's editor.
- The result marker is random for every execution. The backend uses the **last** marker line in stdout and shows all other output as the student's own prints.
- If no marker is found (crash, exit, infinite loop), the case is a runtime error or time limit; show stderr.
- Drivers are backend code (templates plus type handlers), not stored in the database and never sent to the browser.
- Java needs a class named Main and C++ needs includes; these come in Phase 2b with their own type handlers.

## 8. Judge0 integration rules

- **Languages:** read GET /languages from your Judge0 once and store id, label and version in app\_config. Judge0 ids and compiler versions differ between releases, and older built-in versions may reject modern syntax. Show the real version in the dropdown.
- **Per test:** send language\_id, source\_code, stdin (all base64), cpu\_time\_limit (seconds), wall\_time\_limit (twice the CPU limit plus one second) and memory\_limit (KB). Do not send expected\_output.
- **Limits:** CPU limit = the problem's tier limit times the language multiplier. Run uses the Tier 1 limit.
- **Batching:** one batch per tier, at most 20 submissions per batch (check your judge0.conf), chunked further if the total payload gets large. Never use wait=true with batches; poll instead.
- **Polling:** every 500 ms, give up after about 60 seconds, then mark the submission as an internal error that does not count as an attempt.
- **Status mapping:** Accepted and Wrong Answer both mean the program ran (we compare ourselves); Time Limit, Compilation Error, the runtime error family and internal errors map to our own statuses. Memory kills appear as runtime errors.
- **Borderline timing:** if a test fails on time but finished within about 20 percent of the limit, re-run it up to twice and use the best time.
- **Workers:** set Judge0's worker count below the number of CPU cores so tests do not slow each other and cause unfair time limits.
- **Compile cost:** Judge0 compiles once per test for compiled languages, so a batch of tests compiles repeatedly. Acceptable for Python and JavaScript; plan for it with C++ and Java.

## 9. Results and what may be shown

| Situation | Run | Submit |
| --- | --- | --- |
| Sample test | Show input, expected, actual, student prints, time | Same, if a sample fails |
| Hidden Tier 1 test fails | not applicable | Show the failure type, and the input and expected output only if the input is under about 2 KB |
| Hidden Tier 2 or 3 fails | not applicable | Show only the type (wrong answer, time limit, runtime error), never the data |
| Compile error | Show compiler output | Show compiler output |
| Internal or judge error | Show a retry message, nothing counted | Same, not counted as an attempt |

Tier verdicts: Tier 0 reached means a failure type; Tier 1 or 2 reached is a partial result (a faster approach exists); Tier 3 is accepted. Points use the Phase 2 formula (base points times tier share).

## 10. Security requirements

- Judge0 is reachable only over HTTPS with an auth token; the plain Judge0 port is closed in the firewall.
- The token lives only in backend environment variables.
- Code size and returned output size are capped; student output is shown as plain text (never as HTML).
- Student code can never run on the API server or the Neon database host; it runs only inside Judge0.
- Keep network access disabled for submissions in Judge0's configuration (verify the setting in your release).
- Never log full test inputs or the Judge0 token; log request ids, ids, statuses and timings.
- Rate limits apply to Run and Submit separately and together (in-flight cap).

## 11. Do and do not

### Do

- Put Judge0 behind a thin judge adapter so the engine can be swapped later
- Record the Judge0 version and language version on every submission
- Make Submit idempotent (Idempotency-Key) so a double click never judges twice
- Test with a 5 MB input early to find real payload limits
- Cache recently used large tests in memory by hash, with a small cap (about 100 MB)
- Write a golden test set per problem (known solutions and their expected tiers) and re-run it on every judge change
- Keep the Python and JavaScript drivers tiny and covered by tests

### Do not

- Do not call Judge0 from the browser or expose its URL or token
- Do not send hidden tests, reference solutions or drivers to the frontend
- Do not trust Judge0's Accepted or Wrong Answer for function-style problems
- Do not run Tier 2 or 3 if the previous tier failed
- Do not hold a Submit request open while judging
- Do not hardcode Judge0 language ids or assume versions
- Do not build all 19 languages now; ship Python and JavaScript first
- Do not count judge or internal errors as the student's attempt
- Do not run Judge0 on Render or other platforms that lack privileged container access

## 12. Checks

### Test matrix (run for every supported language)

| Case | Expected result |
| --- | --- |
| Correct brute force on a three-tier problem | Tier 1 only |
| Correct better solution | Tier 2 |
| Correct optimal solution | Tier 3 |
| Wrong answer on a sample | Run shows the differing case |
| Infinite loop | Time limit, request finishes within the wall limit |
| Memory flood | Runtime error or memory kill, no server impact |
| Compile or syntax error | Compile error text with correct line numbers |
| Uncaught exception | Runtime error with the error text |
| Student print statements | Shown as the student's output; result still correct |
| Student prints the marker text | Ignored in favour of the last real marker |
| Calls exit before the driver | Runtime error, no false pass |
| Reads stdin itself | No crash of the judge; fails or passes on its own merits |
| Network call attempt | Fails inside the sandbox |
| Huge output | Truncated and flagged, no crash |
| Judge0 down | JUDGE\_UNAVAILABLE and nothing counted |

### Acceptance checklist

- [ ] Run returns in under about 5 seconds for sample tests on Python and JavaScript
- [ ] Submit shows live tier progress and a final verdict
- [ ] No response contains hidden test data beyond section 9
- [ ] Rate limits and the in-flight cap work
- [ ] The browser never contacts Judge0 (check the network tab)
- [ ] Draft saving works per problem and language
- [ ] A repeated Submit with the same Idempotency-Key creates one submission
- [ ] The golden test set passes after any change to the driver or Judge0 setup

## 13. Build order and estimates (rough, two developers)

### Backend (Developer A)

| # | Task | Days |
| --- | --- | --- |
| B1 | Set up the Judge0 VPS and smoke-test it with curl | 1 |
| B2 | Judge0 client, status mapping, languages in app\_config, GET /languages | 1.5 |
| B3 | Python driver, source builder, result extractor | 1.5 |
| B4 | POST /runs end to end with a hardcoded problem | 1 |
| B5 | POST /submissions, tier loop, progress saving, GET /submissions/:id | 2 |
| B6 | JavaScript driver and golden tests | 1.5 |
| B7 | Test matrix, limits, rate limits, error handling | 1.5 |

### Frontend (Developer B)

| # | Task | Days |
| --- | --- | --- |
| F1 | Language dropdown, starter templates, Monaco setup | 1.5 |
| F2 | Run button and result panel (cases, tabs, student output) | 1.5 |
| F3 | Submit button, polling and tier progress UI | 1.5 |
| F4 | Compile, runtime and judge error states | 0.5 |
| F5 | Draft saving and Reset | 0.5 |
| F6 | Tests and polish | 1 |

## 14. Suggestions beyond the brief

- **Schema update:** add two fields to ProblemVersion: signature (JSON) and starterCode (JSON map of language to code). Make this change before the first migration if possible.
- **Ship two languages first.** Python and JavaScript drivers are tiny; C++ and Java need a type handler per type.
- **Show the language version** in the dropdown to avoid confusing syntax errors on older runtimes.
- **Keep a judge health check** (a tiny known-good submission every few minutes) so you notice when the VPS is down before students do.
- **Add a custom input box** later; it reuses the Run path.
- **Plan the VPS region** next to your Render region (for example both in Singapore) so the backend and judge talk quickly.
- **Keep a paid hosted judge plan as a fallback** only if setting up the VPS is blocked; the adapter makes switching easy.

## 15. Risks and open questions

| Risk or question | Plan |
| --- | --- |
| Nobody is comfortable setting up Docker and the VPS | Ask a senior to set it up once (about half a day) or follow a step-by-step guide; Docker is needed only on the VPS |
| Older Python and Node versions in Judge0 break modern syntax | Check versions early, show them in the UI, test the starter templates |
| Timing noise unfairly fails honest solutions | Lower worker count, re-run borderline tests, calibrate limits on the same judge |
| Large inputs are slow end to end | Cap Tier 3 size in Phase 2, cache tests, keep VPS and storage in nearby regions |
| Function drivers for many types become a large job | Limit the type list, add types only when needed |
| Open: which two languages first, who sets up the VPS, which VPS provider | Decide before starting B1 |

## Appendix A: Judge0 on a VPS, beginner steps

Follow the README of the exact Judge0 release you download, because details change.

1. Rent a Linux VPS with at least 2 vCPU and 2 to 4 GB RAM, ideally in the same region as your Render service.
2. Connect with ssh and install Docker and Docker Compose.
3. Judge0 relies on cgroup v1; many modern Linux systems default to v2, so apply the cgroup fix described in the Judge0 documentation and reboot.
4. Download the Judge0 CE release, unzip it, and edit judge0.conf: set the database and Redis passwords and an auth token (header X-Auth-Token).
5. Start the database and Redis first, then everything else, using docker-compose up -d.
6. Add a reverse proxy such as Caddy for HTTPS on your domain, and close every port except 22, 80 and 443.
7. Test GET /languages with the token, then run one tiny submission with curl.
8. Set containers to restart automatically after a reboot, and write the token and URL into your backend environment variables.
