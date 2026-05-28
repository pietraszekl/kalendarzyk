<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentation policy

After every feature, bug fix, or meaningful change, update **both** `RELEASE_NOTES.md` and `README.md` before considering the work done.

## RELEASE_NOTES.md

- Add bullet points under the matching `###` section inside the `## Unreleased` block.
- Existing sections: `Brand And Interface`, `Onboarding`, `Summary Tab UX`, `Cycle History And Forecasting`, `Trips And Readiness`, `Holidays And Days Off`, `Calendar And Export`, `Privacy And Safety`, `CSS Fixes`, `Developer Notes`. Create a new section only if none fits.
- One bullet per change, past tense ("Added…", "Fixed…", "Removed…").
- New dependencies go in `Developer Notes`.

## README.md

- User-visible features → add/update a bullet in `## Features`.
- New dependencies → add to `## Tech Stack`.
- Setup/deployment changes → update the relevant section.
- Keep descriptions short and present-tense.

## Rules

- Never remove or rewrite existing entries — only append or update.
- Do not duplicate entries that are already documented.
- Match the tone and style of existing content.
