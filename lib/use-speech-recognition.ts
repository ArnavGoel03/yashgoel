"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClientValue } from "@/lib/use-client-value";

// Minimal SpeechRecognition typings , the DOM lib doesn't ship them; we
// only touch the surface we use.
type SpeechResult = { transcript: string };
type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<SpeechResult> & { isFinal: boolean }>;
  resultIndex: number;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Single-utterance dictation hook with live interim transcripts. Used
 * by the standalone /search page and the global command palette so
 * voice input feels the same in both places. Safari on macOS 14.5+
 * supports webkitSpeechRecognition; Chrome/Edge support the
 * unprefixed name. Returns supported = false where the API is missing
 * so callers can hide the mic button.
 */
export type VoiceErrorKind = "unsupported" | "denied" | "no-speech" | "other";

export function useSpeechRecognition({
  onTranscript,
}: {
  onTranscript: (transcript: string) => void;
}) {
  // Whether the browser has SpeechRecognition at all is fixed for the
  // life of the page, so it is read, not stored.
  const supported = useClientValue(() => getSpeechRecognition() !== null, false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceErrorKind | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  useEffect(() => {
    callbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggle = useCallback(() => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      callbackRef.current(transcript.trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      const code = (e as { error?: string } | null)?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("denied");
      } else if (code === "no-speech") {
        setError("no-speech");
      } else {
        setError("other");
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("other");
    }
  }, [listening]);

  return { supported, listening, error, toggle };
}
