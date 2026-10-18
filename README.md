Correct LeetCode-like Flow
RUN (Case 1, Case 2, Case 3 tabs):
FLOW 1: Jab user RUN click karta hai
FE: Run click -> POST /api/problems/8/run { language: "cpp", code: "class Solution..." }

Backend:
1. Neon se us problem ke saare VISIBLE testcases lao (Case1,2,3)
2. Har TC ke liye Judge0 ko batch bhejo
   - TC1: nums = [2,1,3]
   - TC2: nums = [5,5,5]
   - TC3: nums = [1]
3. Judge0 batch result -> Compare expected
4. FE ko array bhejo:
[
  { case:1, input:"[2,1,3]", expected:2, actual:2, status:"Passed" },
  { case:2, input:"[5,5,5]", expected:-1, actual:-1, status:"Passed" },
  { case:3, status:"Failed" }
]




FE me tabhi Case 1 green, Case 2 green, Case 3 red dikhega - exactly like your first image.

SUBMIT:
Same but visible + hidden saare TCs (e.g. 2 visible + 8 hidden = 10 batch). FE ko sirf final verdict "Accepted" ya "Wrong Answer on test 6" dikhana hai.