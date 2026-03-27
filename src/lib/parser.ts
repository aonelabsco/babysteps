import type { ParsedInput, PoopSize, BreastSide, MealType, Allergen } from './types';
import { COMMON_ALLERGENS } from './types';

/**
 * Extract time from text, returning the timestamp and text with time removed.
 */
function extractTime(text: string): { timestamp: number; remaining: string } | null {
  // "at 3:30pm", "at 14:00", "3:30pm", "12:15"
  let m = text.match(/\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (m) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3]?.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, min, 0, 0);
    if (d.getTime() > Date.now() + 60000) d.setDate(d.getDate() - 1);
    return { timestamp: d.getTime(), remaining: text.replace(m[0], ' ').trim() };
  }

  // "at 1pm", "at 8am"
  m = text.match(/\bat\s+(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1]);
    const ap = m[2].toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    if (d.getTime() > Date.now() + 60000) d.setDate(d.getDate() - 1);
    return { timestamp: d.getTime(), remaining: text.replace(m[0], ' ').trim() };
  }

  // "30 min ago", "2 hours ago"
  m = text.match(/(\d+)\s*(?:min(?:ute)?s?|m)\s*ago/i);
  if (m) {
    return { timestamp: Date.now() - parseInt(m[1]) * 60000, remaining: text.replace(m[0], ' ').trim() };
  }
  m = text.match(/(\d+)\s*(?:hour|hr|h)s?\s*ago/i);
  if (m) {
    return { timestamp: Date.now() - parseInt(m[1]) * 3600000, remaining: text.replace(m[0], ' ').trim() };
  }

  return null;
}

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

  // Extract time first, then use remaining text for event parsing
  // This prevents "at 1pm" from having "1" parsed as a feed quantity
  const timeResult = extractTime(lower);
  const timestamp = timeResult?.timestamp;
  const remaining = timeResult?.remaining || lower;

  // --- SLEEP patterns ---
  if (/(?:slept|sleeping|fell\s*asleep|went\s*to\s*sleep|nap(?:ping)?|asleep|put\s*(?:down|to\s*(?:bed|sleep)))/i.test(remaining)) {
    return { type: 'sleep', babyName, timestamp };
  }

  // --- WAKE patterns ---
  if (/(?:woke|awake|waking|got\s*up|wake\s*up|woken)/i.test(remaining)) {
    return { type: 'wake', babyName, timestamp };
  }

  // --- BREASTFEED patterns (check before formula feed) ---
  if (/\b(?:breastfe(?:d|ed|eding)|nurs(?:ed|ing)|breast\s*fed|breast\s*feed|latched)\b/i.test(remaining)) {
    let breastSide: BreastSide = 'both';
    if (/\bleft\b/i.test(remaining)) breastSide = 'left';
    else if (/\bright\b/i.test(remaining)) breastSide = 'right';

    let breastDuration: number | undefined;
    const durMatch = remaining.match(/(\d+)\s*(?:min(?:ute)?s?|m)\b/i);
    if (durMatch) breastDuration = parseInt(durMatch[1]);

    return { type: 'breast', breastSide, breastDuration, babyName, timestamp };
  }

  // --- FEED patterns (formula — use remaining text so time numbers are stripped) ---
  const feedPatterns = [
    /(?:fed|feed|gave|bottle|drank|had|ate|drink)\s+(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)?/i,
    /(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)\s*(?:feed|fed|bottle|milk|formula)?/i,
    /(?:fed|feed|gave|bottle|drank|had|ate)\s+(?:\w+\s+)?(\d+(?:\.\d+)?)\s*(ml|oz|ounce|ounces|milliliters?)?/i,
  ];

  for (const pattern of feedPatterns) {
    const match = remaining.match(pattern);
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

  // "fed" / "feed" without quantity (formula)
  if (/\b(?:fed|feed|bottle|formula)\b/i.test(remaining)) {
    return { type: 'feed', babyName, timestamp };
  }

  // --- SOLID FOOD patterns ---
  if (/\b(?:solids?|puree|cereal|fruit|veggie|vegetable|avocado|banana|rice|oat|sweet\s*potato)\b/i.test(remaining) ||
      /\b(?:ate|eaten|eating)\s+(?!.*\d+\s*(?:ml|oz))/i.test(remaining)) {
    const foodMatch = remaining.match(/(?:ate|had|eating|tried|gave)\s+(.+)/i);
    const foodName = foodMatch ? foodMatch[1].replace(/\b(at|around|about)\b.*$/i, '').trim() : undefined;
    let mealType: MealType | undefined;
    if (/\bbreakfast\b/i.test(remaining)) mealType = 'breakfast';
    else if (/\blunch\b/i.test(remaining)) mealType = 'lunch';
    else if (/\bdinner\b/i.test(remaining)) mealType = 'dinner';
    else if (/\bsnack\b/i.test(remaining)) mealType = 'snack';
    const allergens = COMMON_ALLERGENS.filter((a) => remaining.toLowerCase().includes(a)) as Allergen[];
    return { type: 'solid', foodName, mealType, allergens: allergens.length > 0 ? allergens : undefined, babyName, timestamp };
  }

  // --- TUMMY TIME patterns ---
  if (/\b(?:tummy\s*time|tummy|prone|on\s*(?:his|her|their)\s*tummy)\b/i.test(remaining)) {
    let tummyDuration: number | undefined;
    const durMatch = remaining.match(/(\d+)\s*(?:min(?:ute)?s?|m)\b/i);
    if (durMatch) tummyDuration = parseInt(durMatch[1]);
    return { type: 'tummytime', tummyDuration, babyName, timestamp };
  }

  // --- MILESTONE patterns ---
  if (/\b(?:milestone|first\s+(?:smile|tooth|step|word|crawl|roll|laugh|wave|clap))\b/i.test(remaining) ||
      /\b(?:roll(?:ed|ing)\s*over|crawl(?:ed|ing)|walk(?:ed|ing)|stand(?:ing)?|sit(?:ting)?|clap(?:ped|ping))\b/i.test(remaining)) {
    const milestoneName = remaining.replace(/\b(baby|at|around|about|just|started)\b/gi, '').trim();
    return { type: 'milestone', milestoneName, babyName, timestamp };
  }

  // --- POOP patterns ---
  if (/(?:poop(?:ed|s|y)?|poo(?:ed)?|number\s*2|bowel|stool|💩)/i.test(remaining)) {
    let size: PoopSize = 'medium';
    if (/\b(?:big|large|huge|lot|massive)\b/i.test(remaining)) {
      size = 'big';
    } else if (/\b(?:small|little|tiny|bit|slight)\b/i.test(remaining)) {
      size = 'small';
    }
    return { type: 'poop', size, babyName, timestamp };
  }

  // --- PEE patterns ---
  if (/(?:pee(?:d|s)?|wet\s*(?:diaper|nappy)?|diaper\s*change|changed?\s*(?:diaper|nappy)|nappy\s*change|urin|wee|tinkle|💦)/i.test(remaining)) {
    return { type: 'pee', babyName, timestamp };
  }

  return null;
}
