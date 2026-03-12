'use client';

import { useState, useRef } from 'react';
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

  const startListening = () => {
    setError('');
    setTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Use the text input below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1];
      const text = current[0].transcript;
      setTranscript(text);

      if (current.isFinal) {
        processText(text);
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError('Could not hear you. Try again or type below.');
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const processText = async (text: string) => {
    // Try local parser first
    const localResult = parseInput(text, babyNames);
    if (localResult) {
      onParsed(localResult);
      setTranscript('');
      return;
    }

    // Try LLM parser
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
      // LLM not available, fall through
    }

    setError(`Couldn't understand: "${text}". Try saying "fed 120 ml", "pooped big", or "diaper changed".`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processText(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className="space-y-3">
      {/* Voice button */}
      <button
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`w-full py-4 rounded-2xl text-lg font-medium transition-all ${
          listening
            ? 'bg-accent-600 text-white animate-pulse'
            : 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {listening ? (
          <span className="flex items-center justify-center gap-2">
            <MicIcon /> Listening...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <MicIcon /> Tap to speak
          </span>
        )}
      </button>

      {/* Transcript */}
      {transcript && (
        <p className="text-center text-gray-400 text-sm italic">
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-red-400 text-sm">{error}</p>
      )}

      {/* Manual text input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder='Or type: "fed 120 ml", "pooped big"...'
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !manualInput.trim()}
          className="px-5 py-3 rounded-xl bg-dark-700 text-gray-200 font-medium hover:bg-dark-600 disabled:opacity-50"
        >
          Log
        </button>
      </form>

      {/* Quick action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => processText('diaper changed for pee')}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl border border-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-800 active:bg-dark-700 disabled:opacity-50"
        >
          Pee
        </button>
        <button
          onClick={() => processText('pooped medium')}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl border border-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-800 active:bg-dark-700 disabled:opacity-50"
        >
          Poop
        </button>
        <button
          onClick={() => {
            const qty = prompt('How much milk? (e.g., 120 ml or 4 oz)');
            if (qty) processText(`fed ${qty}`);
          }}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl border border-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-800 active:bg-dark-700 disabled:opacity-50"
        >
          Feed
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
