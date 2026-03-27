export type BabySex = 'male' | 'female';

export interface Baby {
  id: string;
  name: string;
  createdAt: number;
  birthday?: number; // Unix timestamp
  sex?: BabySex;
}

export interface GrowthRecord {
  id: string;
  familyId: string;
  babyId: string;
  date: number; // Unix timestamp
  weight?: number; // kg
  length?: number; // cm
  headCircumference?: number; // cm
  createdBy: string;
  createdAt: number;
}

export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  joinedAt: number;
}

export type VolumeUnit = 'ml' | 'oz';
export type WeightUnit = 'kg' | 'lbs';
export type LengthUnit = 'cm' | 'in';
export type FeedingMode = 'formula' | 'breast' | 'both';

export interface Family {
  id: string;
  name: string;
  code: string;
  defaultUnit: VolumeUnit | null;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
  feedingMode?: FeedingMode;
  createdBy: string;
  createdAt: number;
  babies: Baby[];
  members: FamilyMember[];
}

export type EventType = 'feed' | 'breast' | 'poop' | 'pee' | 'sleep' | 'wake' | 'solid' | 'tummytime' | 'milestone';
export type PoopSize = 'big' | 'medium' | 'small';
export type BreastSide = 'left' | 'right' | 'both';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const COMMON_ALLERGENS = [
  'dairy', 'eggs', 'peanuts', 'tree nuts', 'wheat', 'soy', 'fish', 'shellfish', 'sesame',
] as const;
export type Allergen = typeof COMMON_ALLERGENS[number];

export const COMMON_MILESTONES = [
  'first smile', 'holds head up', 'rolls over', 'sits unassisted', 'first tooth',
  'crawling', 'pulls to stand', 'first steps', 'first words', 'clapping',
  'waving', 'pincer grasp', 'walks independently', 'runs', 'first sentence',
] as const;

export interface BabyEvent {
  id: string;
  familyId: string;
  babyId: string;
  babyName: string;
  type: EventType;
  timestamp: number;
  createdBy: string;
  createdByName: string;
  // feed (formula)
  quantity?: number;
  unit?: 'ml' | 'oz';
  // poop
  size?: PoopSize;
  // breast
  breastSide?: BreastSide;
  breastDuration?: number; // minutes
  // solid food
  foodName?: string;
  mealType?: MealType;
  allergens?: Allergen[];
  // tummy time
  tummyDuration?: number; // minutes
  // milestone
  milestoneName?: string;
}

export interface DaySummary {
  lastFeedTime: number | null;
  lastFeedQuantity: number | null;
  lastFeedUnit: string | null;
  totalMilk: number;
  milkUnit: string;
  breastfeedCount: number;
  lastBreastfeedTime: number | null;
  totalBreastMinutes: number;
  poopCount: number;
  peeCount: number;
  lastSleepEvent: BabyEvent | null;
  sleepCount: number;
  totalNapMinutes: number;
  lastNapMinutes: number | null;
  solidCount: number;
  tummyTimeMinutes: number;
}

export interface ParsedInput {
  type: EventType;
  quantity?: number;
  unit?: 'ml' | 'oz';
  size?: PoopSize;
  breastSide?: BreastSide;
  breastDuration?: number;
  foodName?: string;
  mealType?: MealType;
  allergens?: Allergen[];
  tummyDuration?: number;
  milestoneName?: string;
  babyName?: string;
  timestamp?: number;
}
