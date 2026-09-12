# Team handoff

The code is intentionally split so several Codex agents can work without editing the same files.

## Suggested ownership

### Reader and EPUB context

Own `components/epub-reader.tsx` and `lib/reader-types.ts`.

- Improve surrounding-context extraction across adjacent EPUB spine items
- Persist the furthest-read CFI and restore reading position
- Add typography controls and table of contents
- Test varied EPUB structures

### Agent behavior and evaluation

Own `app/api/copilotkit/[[...path]]/route.ts` plus a future `evals/` folder.

- Refine grounding and spoiler rules
- Add representative questions for fiction, philosophy, and education
- Compare OpenRouter models for cost, tool calling, and latency
- Add citations back to exact passage fragments

### Visual intelligence

Own `app/api/image/route.ts`, `app/api/reference/route.ts`, and `components/visual-card.tsx`.

- Improve image-model selection and provider-specific options
- Rank historical references instead of returning the first result
- Add attribution, licensing, caching, and image retry behavior
- Create visual-detail annotations tied to passage evidence

### Product experience

Own `app/globals.css`, `components/reader-companion.tsx`, and accessibility QA.

- Refine mobile layout and popup interactions
- Add a proper voice-input state inside the CopilotKit input
- Design onboarding, empty, loading, and error states
- Test keyboard navigation, screen readers, and reduced motion

## Coordination rules

- Read `AGENTS.md` before changing Next.js code.
- Keep provider credentials server-side and out of commits.
- Update `ReaderContext` deliberately; it is the interface between reader and agent.
- Run `npm run build` before handing work to another teammate.
- Avoid editing another owner's files without coordinating first.

## Demo script

1. Open the built-in *A Study in Scarlet* passage.
2. Ask: “Help me imagine this room.” Show the generated illustration and grounded detail explanation.
3. Upload an EPUB and turn a page. Point out that the title, chapter, location, and visible text update automatically.
4. Select an unfamiliar object and ask what a contemporary reader would know about it. Show the Wikimedia reference card.
5. Ask a follow-up such as “Why does that detail make the scene feel neglected?”
6. Use the microphone button for one question to demonstrate that the companion belongs inside the reading moment.
