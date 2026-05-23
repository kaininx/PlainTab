---
name: commit-changes
description: Prepare and create PlainTab git commits with scoped Conventional Commit subjects and detailed commit bodies. Use when the user asks to commit, 提交, create a git commit, stage changes, or asks for precise Conventional Commits / Google-style commit messages; especially when the worktree may contain unrelated user changes.
---

# Commit PlainTab Changes

Use this skill to make clean PlainTab commits without mixing unrelated work.

## Commit Style

- Use scoped Conventional Commits by default: `type(scope): 精准描述`.
- Allowed types include `feat`, `fix`, `perf`, `refactor`, `chore`, `docs`, `test`, `style`, and other Conventional Commit types only when they accurately describe the change.
- Always include a scope when a clear module or area exists, for example `fix(wallpaper): ...`, `refactor(storage): ...`, `docs(rules): ...`, `test(import-export): ...`. Omit scope only when the change is genuinely cross-cutting and no honest scope fits.
- Prefer Chinese commit subjects and bodies when the user asks in Chinese.
- Match the current repository history. Before committing, inspect recent subjects with `git log --oneline -10` and keep the same Chinese Conventional Commit rhythm unless the user asks for another style.
- Make the subject long enough to be precise. It should name the changed behavior or module and the concrete result, not just the activity. Avoid vague subjects such as `fix(settings): 修复问题`, `docs(rules): 更新文档`, or `chore: 调整代码`.
- Prefer `type(scope): 动词 + 具体对象/行为 + 结果/目的`, for example `fix(wallpaper): 补齐用户数据备份中的 IndexedDB Blob 恢复顺序`.
- The body is required for non-trivial commits. Use it to explain what changed, why it changed, how it was verified, and any storage/migration/UI risk boundary. Keep it factual and specific; do not pad with generic release-note language.
- Write multiple body bullets when needed. A good body usually has 3-6 bullets covering:
  - the concrete code paths or modules changed;
  - the user-visible behavior or data-safety effect;
  - migration/import-export/i18n implications when relevant;
  - verification commands or focused manual checks that passed;
  - intentionally preserved limitations or excluded files.

Example:

```text
fix(settings): 统一数据备份口令可见性并补齐导入按钮状态

- 将加密导出和 .ptab 导入口令收口到同一套显示/隐藏状态逻辑，只保留图标按钮。
- 选择 JSON 备份时保持导入口令禁用，选择 .ptab 后再启用口令输入和可见性切换。
- 复用现有口令 i18n 标签，避免新增无可见文案的显示/隐藏翻译 key。
- 验证通过 node --check js/settings-panel.js 和数据导入控件回归脚本。
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
8. Commit using a Chinese scoped Conventional Commit message unless the user requests another language. Make the subject precise and include a detailed body for any meaningful code, storage, UI, i18n, rules, or test change.
9. After commit, run `git status --short` and report the commit hash.

## Safety

- Never use `git reset --hard`, `git checkout --`, or force operations to clean the tree unless the user explicitly asks.
- If unrelated changes are present, leave them unstaged and mention that they were preserved.
- If the user asks to commit all changes, still show awareness of untracked or surprising files before staging them.
- Do not amend, rebase, or push unless explicitly requested.
