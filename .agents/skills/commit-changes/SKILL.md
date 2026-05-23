---
name: commit-changes
description: Prepare and create PlainTab git commits. Use when the user asks to commit, 提交, create a git commit, stage changes, or asks for Conventional Commits / Google-style commit messages; especially when the worktree may contain unrelated user changes.
---

# Commit PlainTab Changes

Use this skill to make clean PlainTab commits without mixing unrelated work.

## Commit Style

- Use Conventional Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, `docs:`.
- Prefer Chinese commit subjects and bodies when the user asks in Chinese.
- Match the current repository history. Before committing, inspect recent subjects with `git log --oneline -10` and keep the same Chinese Conventional Commit rhythm unless the user asks for another style.
- Keep the subject as one concise sentence, but make it specific enough to explain the changed area and concrete action. Avoid subjects that are only a few vague characters, such as `fix: 更新文案` or `docs: 改文档`, when a slightly longer subject can be more accurate.
- Prefer `type: 动词 + 具体对象 + 结果/目的` when it still reads naturally, for example `fix: 更新 GitHub Release 安装入口并补齐 Edge 商店链接`.
- Add a body only when the subject cannot carry the context clearly enough. Use short bullet lines beginning with `-`, matching the current body style; do not introduce a new template or verbose PR-style prose.

Example:

```text
feat: 添加首次使用引导并接入运行时多语言文案

- 新增轻量首次使用提示，说明搜索和命令面板入口。
- 接入运行时 i18n 并补齐语言包。
```

## Workflow

1. Run `git status --short`.
2. Identify which files belong to the current user request. Do not stage unrelated modified or untracked files.
3. Inspect recent style with `git log --oneline -10` before choosing the commit subject.
4. Review the staged candidate with `git diff -- <files>` or `git diff --stat -- <files>`.
5. Run relevant checks for the touched files. Common checks:
   - JavaScript: `node --check <file>`
   - i18n: use `$update-i18n` validation when language packs or `t(key)` calls changed.
   - General whitespace: `git diff --check -- <files>`
6. Stage only the intended files with explicit paths.
7. Confirm staged contents with `git diff --cached --stat` and `git status --short`.
8. Commit using a Chinese Conventional Commit message unless the user requests another language.
9. After commit, run `git status --short` and report the commit hash.

## Safety

- Never use `git reset --hard`, `git checkout --`, or force operations to clean the tree unless the user explicitly asks.
- If unrelated changes are present, leave them unstaged and mention that they were preserved.
- If the user asks to commit all changes, still show awareness of untracked or surprising files before staging them.
- Do not amend, rebase, or push unless explicitly requested.
