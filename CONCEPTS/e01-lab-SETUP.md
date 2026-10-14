# E-01 lab setup (one-time, tablet-friendly)

## 1. Upload workflow

1. Open `https://github.com/ecooorg/biforge-e01-lab`
2. Branch **main**
3. **Add file → Create new file**
4. Path: `.github/workflows/e01-task.yml`
5. Paste the full contents of `CONCEPTS/e01-task.yml` from the **bf** repository
6. Commit to **main**

No PAT. No Railway. Actions must be enabled for the repo.

## 2. Run a task

1. **Actions** → **E-01 task** → **Run workflow**
2. task: `t1` | `t2` | `t3`
3. side: `model` | `manual`
4. **Run workflow**
5. Open the run → Summary: branch, sha, PR link
6. Open the PR → wait for **ci** green (or note red)

## 3. Tell the Assistant (one line)

```text
t1 model done | ~8
```

Replace task/side and minutes. Assistant updates `ARCHIVE/E01-NOTES.md` on **bf** via patch.

## 4. Order

t1 model → t1 manual → t2 model → t2 manual → t3 model → t3 manual  
(or parallel model/manual per task if you prefer; still six runs total.)

## 5. Rules (unchanged)

- Do not merge lab PRs until all six rows are recorded (optional).
- Secrets never in chat.
- Production `bf` and Railway are not targets of this workflow.
