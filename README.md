# UI polish v2 — must land on Railway

## Why v1 looked like “nothing changed”
Production screenshots still showed:
- Access password / this deployment
- Welcome + Start
- Passport, JSON state, Task Graph, E-01 / CODE_EXECUTOR

That means **the new `src/*.tsx` never reached the running server** (not committed, not pushed, wrong branch, or deploy used an old build). The patch content itself was fine; it was not deployed.

## Apply (repo root = bf-main)

```bash
# 1. Unpack INTO the repo root (so src/App.tsx is replaced)
unzip -o ui-polish-all-screens-v2.zip

# 2. Verify markers (must all say OK)
bash APPLY.sh

# 3. Commit and push the branch Railway builds from
git add src/App.tsx src/ProjectMode.tsx src/en.ts src/ConversationFiles.tsx
git status   # must show App.tsx and ProjectMode.tsx modified
git commit -m "UI: skip Welcome, human labels, restore Project Mode tabs + Create program"
git push

# 4. Wait for GitHub Actions build + Railway deploy
# 5. Hard refresh browser (or private window) — SPA assets are cached
```

## How to know deploy worked
| Screen | Old (still on prod now) | New after this patch |
|--------|-------------------------|----------------------|
| Login | Access password / this deployment | Sign in / open this app |
| After login | Welcome + Start | Straight to workspace |
| Project Mode | Passport, JSON state, Task Graph | Tabs + Project description; JSON only under Data |

## Files
- `src/App.tsx` — Welcome removed, human copy
- `src/ProjectMode.tsx` — tabs + Create program + human labels
- `src/en.ts`, `src/ConversationFiles.tsx`, `src/errors.ts`

Server APIs unchanged. Only frontend sources (Vite rebuild required — CI `npm run build`).
