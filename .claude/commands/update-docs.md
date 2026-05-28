# Update docs after feature work

After implementing a feature, bug fix, or any meaningful change, update the project documentation so it stays in sync with the codebase.

## Steps

1. **Read the current state** of both `RELEASE_NOTES.md` and `README.md`.

2. **Identify what changed** since the docs were last updated:
   - Run `git diff HEAD -- . ':!package-lock.json'` and `git log --oneline -10` to see recent uncommitted and committed changes.
   - If the user described the change, use that context too.

3. **Update `RELEASE_NOTES.md`**:
   - Add new bullet points under the appropriate section in the `## Unreleased` block.
   - Use the existing section names (`Brand And Interface`, `Cycle History And Forecasting`, `Trips And Readiness`, `Holidays And Days Off`, `Calendar And Export`, `Privacy And Safety`, `Developer Notes`) when the change fits. Create a new `###` section only if no existing one applies.
   - Be concise: one bullet per distinct change, written in past tense ("Added…", "Fixed…", "Removed…").
   - If a new dependency was added, mention it in `Developer Notes`.

4. **Update `README.md`**:
   - If the change adds a user-visible feature, add or update a bullet in the `## Features` list.
   - If a new dependency was added, add it to the `## Tech Stack` list.
   - If the change affects setup, deployment, or verification, update the relevant section.
   - Keep descriptions short and present-tense ("First-time users see…", "Exports include…").

5. **Show a short summary** of what was added to each file so the user can review.

## Rules
- Do NOT remove or rewrite existing entries — only append or update.
- Do NOT add entries for changes that are already documented.
- Match the tone and style of existing entries.
- When in doubt about whether a change is worth documenting, include it — it's easier to remove than to forget.
