## What this changes

<!-- One or two sentences. -->

## Checklist

- [ ] `npm run verify` passes locally. It checks every lesson, quiz, answer key, code solution and the capstone, so it is required for any content change.
- [ ] For content: every quiz question has exactly one correct option and an explanation, and I read the answer key against the lesson text.
- [ ] For code challenges: the reference solution passes in the server sandbox and the starter does not (`verify` runs both).
- [ ] For numbers in worked examples, calculators or the capstone: I worked each one by hand.
- [ ] For anything touching accounts, sessions, certificates or grading: I ran `npm run e2e` and `npm run edge` against a real database.
- [ ] No secrets, personal hostnames or real email addresses are in the diff.

> CI runs typecheck, lint, `verify`, the build, `e2e` and `edge` on every pull request. The repository should be set to
> require that check before merging (Settings, Branches, Branch protection rules).
