"use client";

import { forwardRef, useState } from "react";
import {
  CopilotChatToggleButton,
  CopilotPopup,
  useAgentContext,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { BookOpenText, MessageSquarePlus, Mic, MicOff, Sparkles } from "lucide-react";
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
  const [chatSession, setChatSession] = useState(0);

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

  const startFreshChat = () => {
    setDraft("");
    setSpeechError("");
    setChatSession((session) => session + 1);
    setOpen(true);
  };

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
    <div className="companion-dock" aria-label="Reading companion controls">
      <style jsx global>{`
        [data-copilot-popup] {
          font-family: var(--font-book), Georgia, serif !important;
          color: var(--ink) !important;
          background:
            linear-gradient(90deg, rgba(118, 89, 51, 0.045), transparent 9%, transparent 91%, rgba(118, 89, 51, 0.05)),
            var(--paper) !important;
          border: 1px solid #b99c6e !important;
          border-radius: 6px !important;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42), inset 0 0 38px rgba(127, 92, 45, 0.04) !important;
        }

        [data-popup-chat],
        [data-testid="copilot-chat"],
        [data-testid="copilot-scroll-content"],
        [data-testid="copilot-input-overlay"] {
          background:
            linear-gradient(90deg, rgba(118, 89, 51, 0.035), transparent 10%, transparent 90%, rgba(118, 89, 51, 0.04)),
            var(--paper) !important;
          color: var(--ink) !important;
        }

        [data-popup-chat] > div,
        [data-testid="copilot-chat"] > div:not([data-testid="copilot-input-overlay"]),
        [data-testid="copilot-scroll-content"] > div {
          background: transparent !important;
        }

        [data-slot="copilot-modal-header"] {
          background: rgba(245, 237, 221, 0.96) !important;
          border-bottom: 1px solid #cdbb99 !important;
          padding: 12px 14px !important;
          backdrop-filter: none !important;
        }

        .marginalia-header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
        }

        .marginalia-header__left {
          justify-self: start;
        }

        .marginalia-header__title {
          justify-self: center;
          min-width: 0;
        }

        .marginalia-header__right {
          justify-self: end;
        }

        .marginalia-new-chat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          padding: 5px 9px;
          border: 1px solid rgba(185, 147, 84, 0.42) !important;
          border-radius: 3px;
          background: rgba(255, 248, 233, 0.42) !important;
          color: var(--ink-soft) !important;
          cursor: pointer;
          font-family: var(--font-mono), monospace !important;
          font-size: 0.65rem;
          letter-spacing: 0.035em;
        }

        .marginalia-new-chat:hover {
          color: var(--wine-dark) !important;
          border-color: var(--brass) !important;
          background: rgba(185, 147, 84, 0.1) !important;
        }

        [data-testid="copilot-header-title"] {
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 20px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          letter-spacing: 0.015em !important;
          color: var(--ink) !important;
        }

        [data-testid="copilot-close-button"] {
          color: var(--brass) !important;
          border: 1px solid transparent !important;
        }

        [data-testid="copilot-close-button"]:hover {
          color: var(--wine-dark) !important;
          background: rgba(126, 48, 40, 0.07) !important;
          border-color: rgba(126, 48, 40, 0.14) !important;
        }

        [data-testid="copilot-chat"] h1 {
          max-width: 350px !important;
          margin-inline: auto !important;
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 26px !important;
          line-height: 1.35 !important;
          font-weight: 400 !important;
          letter-spacing: 0 !important;
          color: var(--ink) !important;
        }

        [data-testid="copilot-chat"] h1::before {
          content: "◆";
          display: block;
          margin-bottom: 16px;
          color: var(--brass);
          font-size: 11px;
          line-height: 1;
        }

        [data-testid="copilot-chat-input"] {
          background: #fbf4e6 !important;
          border: 1px solid #c8b38e !important;
          border-radius: 5px !important;
          box-shadow: 0 7px 20px rgba(61, 45, 26, 0.12), inset 0 1px rgba(255, 255, 255, 0.72) !important;
        }

        [data-testid="copilot-chat-input"]:focus-within {
          border-color: var(--brass) !important;
          box-shadow: 0 0 0 2px rgba(185, 147, 84, 0.16), 0 8px 24px rgba(61, 45, 26, 0.14) !important;
        }

        [data-testid="copilot-chat-textarea"],
        [data-copilot-popup] textarea,
        [data-copilot-popup] input,
        [data-copilot-popup] [contenteditable="true"] {
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 20px !important;
          line-height: 1.48 !important;
          color: var(--ink) !important;
          caret-color: var(--wine) !important;
          letter-spacing: 0 !important;
        }

        [data-testid="copilot-chat-textarea"]::placeholder,
        [data-copilot-popup] textarea::placeholder,
        [data-copilot-popup] input::placeholder {
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 17px !important;
          color: #857968 !important;
          opacity: 1 !important;
        }

        [data-testid="copilot-add-menu-button"] {
          color: var(--brass) !important;
          background: transparent !important;
        }

        [data-testid="copilot-send-button"] {
          background: var(--wine-dark) !important;
          color: #fff8e9 !important;
          border: 1px solid rgba(126, 48, 40, 0.55) !important;
          border-radius: 3px !important;
          box-shadow: inset 0 1px rgba(255, 255, 255, 0.12) !important;
        }

        [data-testid="copilot-send-button"]:hover:not(:disabled) {
          background: var(--wine) !important;
          transform: translateY(-1px);
        }

        [data-testid="copilot-assistant-message"],
        [data-testid="copilot-assistant-message"] [class*="prose"] {
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 18px !important;
          line-height: 1.62 !important;
          color: var(--ink) !important;
          background: transparent !important;
        }

        [data-testid="copilot-user-message"] > [class*="prose"] {
          font-family: var(--font-book), Georgia, serif !important;
          font-size: 18px !important;
          line-height: 1.5 !important;
          color: #fff8e9 !important;
          background: var(--wine-dark) !important;
          border: 1px solid rgba(126, 48, 40, 0.45) !important;
          border-radius: 4px !important;
          padding: 10px 13px !important;
        }

        [data-testid="copilot-scroll-content"] {
          padding-inline: 2px;
        }

        [data-copilot-popup] button {
          font-family: inherit;
          transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        @media (max-width: 520px) {
          .marginalia-new-chat span {
            display: none;
          }

          .marginalia-new-chat {
            width: 32px;
            padding: 0;
            justify-content: center;
          }
        }
      `}</style>

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
        key={chatSession}
        agentId="reader"
        open={open}
        onOpenChange={setOpen}
        width="min(470px, calc(100vw - 28px))"
        height="min(680px, calc(100vh - 120px))"
        clickOutsideToClose
        toggleButton={ReaderBubble}
        input={{ showDisclaimer: false }}
        header={{
          title: "Marginalia",
          children: ({ titleContent, closeButton }) => (
            <header data-slot="copilot-modal-header" className="marginalia-header">
              <div className="marginalia-header__left">
                <button
                  type="button"
                  className="marginalia-new-chat"
                  onClick={startFreshChat}
                  aria-label="Start a fresh chat"
                  title="Start a fresh chat"
                >
                  <MessageSquarePlus size={15} aria-hidden="true" />
                  <span>New chat</span>
                </button>
              </div>
              <div className="marginalia-header__title">{titleContent}</div>
              <div className="marginalia-header__right">{closeButton}</div>
            </header>
          ),
        }}
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
    </div>
  );
}
