# AI Coding Rules — Image Metadata Downloader

Node.js + Chromium extension for image metadata extraction via ExifTool.

**Stack:** JavaScript, Node.js, Express, browser extension APIs
**Structure:** Flat — server.js, popup.js, ai-detect.js, manifest.json, styles.css

## Change Discipline (HARD RULE)

- **Minimal diffs only.** Change the fewest lines possible to accomplish the task.
- Do not rewrite, reformat, or refactor code you were not asked to change.
- Do not add comments, JSDoc, error handling, or logging to existing code unless asked.
- Do not rename variables, functions, or files unless that is the task.
- Do not "modernize" syntax (e.g., `require` → `import`, `var` → `const`) unless asked.
- Do not bundle unrelated fixes into one change — one logical change per edit.
- State which files you will modify **before** modifying them.

## Scope Discipline (HARD RULE)

- **If it's not in spec.md, it's out of scope.**
- Only touch files relevant to the task. No "while I'm here" fixes.
- Unrelated bugs: log separately, do not fix inline.
- Creating new files/folders? Stop and ask.
- Changes >2x estimated scope? Stop and ask.

## Ambiguity Policy (HARD RULE)

- **Ask before assuming.** If requirements are unclear, stop and clarify.
- Missing error cases, test scenarios, unclear behavior, or no success criteria → ask.
- Provide 2–3 interpretations and ask which applies.
- Never silently assume defaults, auth flows, validation rules, or edge cases.
- Document every assumption in a code comment or back in spec.
- Write spec.md before implementing anything non-trivial.

## JavaScript Code Standards

- Use `const` by default, `let` when reassignment is needed, never `var`.
- Use JSDoc on all exported functions with `@param`, `@returns`, `@throws`.
- Handle errors explicitly: no silent catches, always log or rethrow with context.
- All config via environment variables — no hardcoded URLs, keys, or paths.
- Imports/requires at top of file, no dynamic requires unless justified in comment.
- Name files `kebab-case.js`, classes `PascalCase`, functions/variables `camelCase`.

## Forbidden Actions

- Do not install dependencies without asking.
- Do not touch deployment or secrets without explicit confirmation.
- Do not generate code you cannot explain.
- Do not silently expand scope.
- Do not fabricate APIs, packages, or endpoints.
- Do not hide uncertainty — flag low confidence instead.
- Do not make optimizations or improvements without explicit approval.
- Do not suggest follow-up tasks unless asked.

## Response Rules

- Be concise. No preamble, no summaries of what you are about to do.
- Show only changed lines/sections — do not echo entire files.
- Do not explain obvious changes. Explain only non-obvious reasoning.
- After completing a task, stop. Do not chain into unrequested follow-ups.
