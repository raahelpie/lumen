"use client";

import { forwardRef, useState } from "react";
import {
  CopilotChatToggleButton,
  CopilotPopup,
  useAgentContext,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { BookOpenText, Mic, MicOff, Sparkles } from "lucide-react";
import { z } from "zod";
import type { ReaderContext } from "@/lib/reader-types";
import { VisualCard } from "./visual-card";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const ReaderBubble = forwardRef<HTMLButtonElement, React.ComponentProps<typeof CopilotChatToggleButton>>(function ReaderBubble(props, ref) {
  return (
    <CopilotChatToggleButton
      {...props}
      ref={ref}
      aria-label="Open Marginalia"
      className={`reader-bubble ${props.className || ""}`}
      openIcon={() => (
        <span className="reader-bubble__mark" aria-hidden="true">
          <BookOpenText size={25} />
          <Sparkles size={12} />
        </span>
      )}
    />
  );
});

export function ReaderCompanion({ context }: { context: ReaderContext }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");

  useAgentContext({
    description: "The reader's current book, reading position, visible passage, nearby context, and selected text. Never spoil beyond this supplied position.",
    value: context,
  });

  useFrontendTool(
    {
      name: "illustrate_book_scene",
      description: "Generate an interpretive illustration grounded in the reader's visible passage. Use whenever the reader asks to imagine, picture, visualize, or illustrate a scene.",
      parameters: z.object({
        prompt: z.string().describe("A precise, historically plausible description of the requested scene, grounded in the passage"),
      }),
      handler: async ({ prompt }) => {
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            title: context.title,
            year: context.published,
            passage: context.selectedText || context.visibleText,
          }),
        });
        const data = await response.json();
        return JSON.stringify(data);
      },
      render: ({ status, result }) => <VisualCard status={status} result={result} />,
    },
    [context],
  );

  useFrontendTool(
    {
      name: "find_historical_reference",
      description: "Find a real public-domain or freely licensed visual reference for a historical object, place, garment, vehicle, or practice mentioned on the page.",
      parameters: z.object({
        query: z.string().describe("A specific, era-aware Wikimedia Commons image search query"),
      }),
      handler: async ({ query }) => {
        const response = await fetch(`/api/reference?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return JSON.stringify(data);
      },
      render: ({ status, result }) => <VisualCard status={status} result={result} />,
    },
    [],
  );

  const startListening = () => {
    const host = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError("Voice input works in Chrome, Edge, and supported mobile browsers.");
      setOpen(true);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join("");
      setDraft(transcript);
      setOpen(true);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setSpeechError("I couldn't hear that. Try again or type your question.");
    };
    setSpeechError("");
    setListening(true);
    recognition.start();
  };

  return (
    <>
      <button
        className={`voice-orb ${listening ? "voice-orb--listening" : ""}`}
        onClick={startListening}
        aria-label={listening ? "Listening" : "Ask with your voice"}
        title="Ask with your voice"
      >
        {listening ? <MicOff size={19} /> : <Mic size={19} />}
        <span>{listening ? "Listening" : "Ask aloud"}</span>
      </button>

      {speechError && <div className="speech-note">{speechError}</div>}

      <CopilotPopup
        agentId="reader"
        open={open}
        onOpenChange={setOpen}
        width="min(440px, calc(100vw - 28px))"
        height="min(680px, calc(100vh - 120px))"
        clickOutsideToClose
        toggleButton={ReaderBubble}
        header={{ title: "Marginalia" }}
        labels={{
          modalHeaderTitle: "Marginalia",
          welcomeMessageText: context.visibleText
            ? "I’m here in the margin. Ask me to picture this scene, explain an unfamiliar object, or untangle the passage."
            : "Upload an EPUB and I’ll read alongside you.",
          chatInputPlaceholder: "Ask about this page…",
        }}
        inputValue={draft}
        onInputChange={setDraft}
      />
    </>
  );
}
