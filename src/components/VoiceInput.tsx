'use client';

import { useState, useRef, useEffect } from 'react';
import { parseInput } from '@/lib/parser';
import type { ParsedInput } from '@/lib/types';

interface VoiceInputProps {
  babyNames: string[];
  onParsed: (result: ParsedInput) => void;
  disabled?: boolean;
}

export default function VoiceInput({ babyNames, onParsed, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const resetSilenceTimer = (recognition: any, finalTranscript: string) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      recognition.stop();
      // If we have a transcript but no final result yet, process it
      if (finalTranscript) {
        processText(finalTranscript);
      }
    }, 3000);
  };

  const startListening = () => {
    setError('');
    setTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Use the text input below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let lastTranscript = '';

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1];
      const text = current[0].transcript;
      setTranscript(text);
      lastTranscript = text;

      if (current.isFinal) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        recognition.stop();
        processText(text);
      } else {
        // Reset silence timer on each interim result
        resetSilenceTimer(recognition, lastTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied.');
      } else if (event.error !== 'aborted') {
        setError('Could not hear you. Try again or type below.');
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setListening(true);

    // Safety timeout: stop after 10 seconds no matter what
    resetSilenceTimer(recognition, '');
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setListening(false);
  };

  const processText = async (text: string) => {
    const localResult = parseInput(text, babyNames);
    if (localResult) {
      onParsed(localResult);
      setTranscript('');
      return;
    }

    try {
      const res = await fetch('/api/parse-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, babyNames }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          onParsed(data.result);
          setTranscript('');
          return;
        }
      }
    } catch {
      // LLM not available
    }

    setError(`couldn't understand: "${text}". try "fed 120 ml", "pooped big", "slept 30 min ago".`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processText(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className="space-y-2">
      {/* Voice + text in one row */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          className={`shrink-0 px-4 rounded-xl transition-all ${
            listening
              ? 'bg-accent-600 text-white animate-pulse'
              : 'bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700'
          } disabled:opacity-50`}
        >
          <MicIcon />
        </button>
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder='try: "fed 120ml at 2pm"'
          disabled={disabled}
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 text-lg focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !manualInput.trim()}
          className="shrink-0 px-4 py-3 rounded-xl bg-dark-700 text-gray-200 font-medium hover:bg-dark-600 disabled:opacity-50 text-lg"
        >
          log
        </button>
      </form>

      {transcript && (
        <p className="text-center text-gray-400 text-base italic">
          &ldquo;{transcript}&rdquo;
        </p>
      )}
      {error && (
        <p className="text-center text-red-400 text-base">{error}</p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
