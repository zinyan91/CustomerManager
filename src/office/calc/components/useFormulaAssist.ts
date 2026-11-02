import type React from 'react';
import { useState } from 'react';
import { applySuggestion, signatureAt, suggestFunctions, type ArgumentHint } from '../engine/formulaAssist';

export interface FormulaAssist {
  suggestions: string[];
  active: number;
  hint: ArgumentHint | null;
  /** Reads where the caret is; call it after a change, a click and a key that moves it. */
  track: (input: HTMLInputElement | HTMLTextAreaElement) => void;
  /** Handles the keys of the list; true when it took the key. */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, apply: (text: string, caret: number) => void) => boolean;
  pick: (name: string, input: HTMLInputElement | HTMLTextAreaElement | null, apply: (text: string, caret: number) => void) => void;
}

/** Function names under a formula being typed, Tab to take one, and the arguments of the call the caret is in. */
export function useFormulaAssist(text: string, enabled: boolean): FormulaAssist {
  const [caret, setCaret] = useState(0);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const suggestions = enabled && dismissed !== text ? suggestFunctions(text, caret) : [];
  const active = Math.min(index, Math.max(0, suggestions.length - 1));
  const hint = enabled ? signatureAt(text, caret) : null;

  const pick: FormulaAssist['pick'] = (name, input, apply) => {
    const next = applySuggestion(text, input?.selectionStart ?? caret, name);
    apply(next.text, next.caret);
    setIndex(0);
    if (input) requestAnimationFrame(() => input.setSelectionRange(next.caret, next.caret));
  };

  return {
    suggestions,
    active,
    hint,
    track: (input) => {
      setCaret(input.selectionStart ?? input.value.length);
    },
    onKeyDown: (event, apply) => {
      if (suggestions.length === 0) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setIndex((current) => (Math.min(current, suggestions.length - 1) + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
        return true;
      }
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        pick(suggestions[active], event.currentTarget, apply);
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(text);
        return true;
      }
      return false;
    },
    pick,
  };
}
