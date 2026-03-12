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

  // Try to extract time offset
  let timestamp: number | undefined;
  const timeOffsetMatch = lower.match(/(\d+)\s*(?:min(?:ute)?s?|m)\s*ago/i);
  const hourOffsetMatch = lower.match(/(\d+)\s*(?:hour|hr|h)s?\s*ago/i);
  if (timeOffsetMatch) {
    timestamp = Date.now() - parseInt(timeOffsetMatch[1]) * 60 * 1000;
  } else if (hourOffsetMatch) {
    timestamp = Date.now() - parseInt(hourOffsetMatch[1]) * 60 * 60 * 1000;
  }

  // --- SLEEP patterns ---
  const sleepPatterns = [
    /(?:slept|sleeping|fell\s*asleep|went\s*to\s*sleep|nap(?:ping)?|asleep|put\s*(?:down|to\s*(?:bed|sleep)))/i,
  ];

  for (const pattern of sleepPatterns) {
    if (pattern.test(lower)) {
      return { type: 'sleep', babyName, timestamp };
    }
  }

  // --- WAKE patterns ---
  const wakePatterns = [
    /(?:woke|awake|waking|got\s*up|wake\s*up|woken)/i,
  ];

  for (const pattern of wakePatterns) {
    if (pattern.test(lower)) {
      return { type: 'wake', babyName, timestamp };
    }
  }

  // --- FEED patterns ---
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
      return { type: 'feed', quantity, unit, babyName, timestamp };
    }
  }

  // --- POOP patterns ---
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
      return { type: 'poop', size, babyName, timestamp };
    }
  }

  // --- PEE patterns ---
  const peePatterns = [
    /(?:pee(?:d|s)?|wet\s*(?:diaper|nappy)?|diaper\s*change|changed?\s*(?:diaper|nappy)|nappy\s*change|urin|wee|tinkle|💦)/i,
  ];

  for (const pattern of peePatterns) {
    if (pattern.test(lower)) {
      return { type: 'pee', babyName, timestamp };
    }
  }

  return null;
}
