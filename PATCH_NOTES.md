# CI fix: version-consistency + typecheck

## 3 FAIL names
1. version-consistency — README.md title lacks v24
2. test:version — same (README overwritten by old patch notes)
3. typecheck — WorkspacePanel.tsx: persisted.code on un-narrowed union

## NOT caused by UI label changes
README was accidentally replaced by patch instructions (ui-polish v2 zip contained README.md).
WorkspacePanel error is P27 typing; fixed with `persisted.ok === false` for TS narrowing.

## Apply
```bash
unzip -o ci-fix-readme-typecheck.zip
bash APPLY.sh
git add README.md src/WorkspacePanel.tsx
git commit -m "fix CI: restore README v24 title, narrow PersistIngest fail type"
git push
```
