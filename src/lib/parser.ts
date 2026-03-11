import type { ParsedInput, PoopSize } from './types';

/**
 * Local parser for baby activity input.
 * Handles common patterns without needing an LLM.
 */
export function parseInput(text: string, babyNames: string[] = []): ParsedInput | null {
  const lower = text.toLowerCase().trim();

  // Try to extract baby name
  let babyName: string | undefined;
  for (const name of babyNames) {
    if (lower.includes(name.toLowerCase())) {
      babyName = name;
      break;
    }
  }

  // --- FEED patterns ---
  // "fed 120 ml", "gave 4 oz", "bottle 120ml", "breastfed 5oz", "120 ml feed", "drank 4 oz"
  const feedPatterns = [
    /(?:fed|feed|gave|bottle|breastfed|drank|had|ate|drink|nursing|nursed)\s+(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)?/i,
    /(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)\s*(?:feed|fed|bottle|milk|formula|breast\s*milk)?/i,
    /(?:fed|feed|gave|bottle|breastfed|drank|had|ate)\s+(?:\w+\s+)?(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)?/i,
  ];

  for (const pattern of feedPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const quantity = parseFloat(match[1]);
      let unit: 'ml' | 'oz' | undefined;
      const rawUnit = match[2]?.toLowerCase();
      if (rawUnit) {
        unit = rawUnit.startsWith('oz') || rawUnit.startsWith('ounce') ? 'oz' : 'ml';
      }
      return { type: 'feed', quantity, unit, babyName };
    }
  }

  // --- POOP patterns ---
  // "pooped big", "big poop", "poop small", "pooped", "had a poop", "number 2"
  const poopPatterns = [
    /(?:poop(?:ed|s|y)?|poo(?:ed)?|number\s*2|bowel|stool|💩)/i,
  ];

  for (const pattern of poopPatterns) {
    if (pattern.test(lower)) {
      let size: PoopSize = 'medium';
      if (/\b(?:big|large|huge|lot|massive)\b/i.test(lower)) {
        size = 'big';
      } else if (/\b(?:small|little|tiny|bit|slight)\b/i.test(lower)) {
        size = 'small';
      } else if (/\b(?:medium|normal|regular|average)\b/i.test(lower)) {
        size = 'medium';
      }
      return { type: 'poop', size, babyName };
    }
  }

  // --- PEE patterns ---
  // "pee", "peed", "wet diaper", "diaper change for pee", "changed diaper", "wet"
  const peePatterns = [
    /(?:pee(?:d|s)?|wet\s*(?:diaper|nappy)?|diaper\s*change|changed?\s*(?:diaper|nappy)|nappy\s*change|urin|wee|tinkle|💦)/i,
  ];

  for (const pattern of peePatterns) {
    if (pattern.test(lower)) {
      return { type: 'pee', babyName };
    }
  }

  return null;
}
