import { useCallback, useEffect, useRef, useState } from "react";

type SpeakOptions = { rate?: number; pitch?: number; lang?: string };

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined");
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // Speech synthesis may be unavailable in some embedded browsers.
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // Ignore.
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported) return false;
      const clean = text
        .replace(/```[\s\S]*?```/g, " code block ")
        .replace(/[#*_`>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return false;

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 12000));
        utterance.rate = Math.min(1.5, Math.max(0.6, options?.rate ?? 0.95));
        utterance.pitch = Math.min(1.5, Math.max(0.5, options?.pitch ?? 1));
        utterance.lang = options?.lang || "en-IN";
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((voice) => voice.lang === utterance.lang) ||
          voices.find((voice) => voice.lang?.startsWith("en-IN")) ||
          voices.find((voice) => voice.lang?.startsWith("en"));
        if (preferred) utterance.voice = preferred;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
        return true;
      } catch {
        setSpeaking(false);
        return false;
      }
    },
    [supported],
  );

  return { speak, stop, speaking, supported };
}
