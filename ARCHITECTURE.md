# Architecture

## Runtime flow

```mermaid
flowchart LR
    EPUB[Uploaded EPUB] --> Reader[EPUB.js reader]
    Reader --> Context[CopilotKit agent context]
    Context --> Agent[Reader agent]
    Agent --> Text{Text provider}
    Text --> OpenAI[OpenAI]
    Text --> OpenRouter[OpenRouter]
    Agent --> Scene[Illustration frontend tool]
    Agent --> Ref[Reference frontend tool]
    Scene --> ImageAPI[/api/image]
    ImageAPI --> ImageProvider{Image provider}
    ImageProvider --> OpenAIImage[OpenAI Images]
    ImageProvider --> OpenRouterImage[OpenRouter Images]
    Ref --> Commons[/api/reference]
    Commons --> Wikimedia[Wikimedia Commons]
```

## Boundaries

| Area | Main files | Responsibility |
| --- | --- | --- |
| Reader | `components/epub-reader.tsx` | EPUB loading, metadata, pagination, selection, and reading context |
| Companion | `components/reader-companion.tsx` | CopilotKit context, popup, voice input, and frontend visual tools |
| Agent runtime | `app/api/copilotkit/[[...path]]/route.ts` | Reader prompt, provider selection, CopilotKit runtime, model calls |
| Generated visuals | `app/api/image/route.ts` | Grounded image prompt and OpenAI/OpenRouter image routing |
| Reference visuals | `app/api/reference/route.ts` | Wikimedia Commons search and normalized visual result |
| Presentation | `app/globals.css` | Reader layout, responsive behavior, CopilotKit styling, visual cards |

## Agent contract

The browser supplies `ReaderContext` through CopilotKit's `useAgentContext`:

```ts
type ReaderContext = {
  title: string;
  author: string;
  published: string;
  chapter: string;
  location: string;
  estimatedPage: string;
  progress: number;
  visibleText: string;
  surroundingText: string;
  selectedText: string;
};
```

The agent owns conversational judgment and chooses either `illustrate_book_scene` or `find_historical_reference` when a visual materially helps. Both tools normalize results into `VisualResult`, so the chat renders one reusable card.

## Provider strategy

Text routing happens only in `makeAgent()`. Image routing happens only in `/api/image`. The reader and tool components do not import provider SDKs or read credentials. This lets teammates replace either provider without touching the reading experience.

## Privacy boundary

Uploaded EPUB bytes stay in the browser. The server receives only the context included in an agent turn and the selected passage used for an illustration. The prototype has no database and does not persist books or conversations itself.
