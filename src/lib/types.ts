export interface Baby {
  id: string;
  name: string;
  createdAt: number;
}

export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  joinedAt: number;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  defaultUnit: 'ml' | 'oz' | null;
  createdBy: string;
  createdAt: number;
  babies: Baby[];
  members: FamilyMember[];
}

export type EventType = 'feed' | 'poop' | 'pee';
export type PoopSize = 'big' | 'medium' | 'small';

export interface BabyEvent {
  id: string;
  familyId: string;
  babyId: string;
  babyName: string;
  type: EventType;
  timestamp: number;
  createdBy: string;
  createdByName: string;
  // feed
  quantity?: number;
  unit?: 'ml' | 'oz';
  // poop
  size?: PoopSize;
}

export interface DaySummary {
  lastFeedTime: number | null;
  lastFeedQuantity: number | null;
  lastFeedUnit: string | null;
  totalMilk: number;
  milkUnit: string;
  poopCount: number;
  peeCount: number;
}

export interface ParsedInput {
  type: EventType;
  quantity?: number;
  unit?: 'ml' | 'oz';
  size?: PoopSize;
  babyName?: string;
}
