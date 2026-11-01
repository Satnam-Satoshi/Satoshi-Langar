# Sikh Bitcoin: the open school

October 5, 2026 design release. Human owner: Satnam Satoshi founder. AI mission: make the existing open curriculum easier to navigate, understand and practice. The learner retains control over progress and any real-world decisions.

The hub leads to three open courses, each with three named seven-lesson chapters. All 63 original lesson URLs, content, primary references, paper exercises and previous/next relationships remain. Lessons have learning maps, eight topic-specific explanatory diagrams, 129 selectable practice questions, worked explanations and optional local completion notes. The generated open-road illustration is conceptual artwork, not a data chart or religious endorsement.

The practice lab has four local experiments: BTC-to-sat conversions, fictional input/output/change accounting, distinct 2-of-3 signer counting, and suspicious-request reasoning. It generates no keys, transactions, payment requests or real advice. The fixed 500-sat fee is an illustration and is not a network fee quote. All primary source links remain visible; new lab sources were checked October 5, while original curriculum dates remain October 1.

## Progressive enhancement

Server-rendered content stays usable without JavaScript. The portable exporter removes Next runtime scripts and allowlists the existing learning.js enhancement when a hub, lab or progress marker is present. Source lives in scripts/browser/learning.mjs; build-browser.mjs generates the bundle. No added library or external runtime is required. Games and answers remain in page memory; only the existing self-reported completion marks use the same local storage keys. These do not sync or constitute certification. Reset has a confirmation. Changing an answer clears stale feedback. Radio choices and buttons work by keyboard without drag gestures. Focus indicators and live feedback are visible.

The explicit reviewed answer map in app/data/learning-quiz-answers.ts covers all 129 questions. Most original questions use yes/no with the same original answer position. Presentation rotates choices, but correctness never constitutes assessment or proof of mastery; no score, leaderboard, streak pressure, cash reward or badge is issued. Independent human curriculum review remains pending.

## Review and verification

Required checks include complete answer-map coverage and bounds, all fictional accounting combinations, distinct signer combinations, conversions, static internal links, and browser flows. Exercise correct/incorrect/no-selection feedback, changing a selected answer, progress persistence and resume, all three course maps, all four games/reset/next controls, and representative desktop/mobile lessons. Preserve the public content and worked-answer fallback when scripts are unavailable. The 63 lesson bodies and source records in courses.ts are unchanged.

Routine LTC publication may rebuild these accepted files but may not modify learning implementation, claims, game models or source methods. The accepted implementation digest is recorded privately after release. Any discovered issue should be recorded in GitHub or the private release handoff; do not hide it with a false completion claim. No membership, social account, OAuth or newsletter activation is part of this design release. Stop changes if the founder asks; roll back using the saved Vercel deployment receipt if public verification fails.
