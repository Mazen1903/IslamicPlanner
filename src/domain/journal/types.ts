export interface JournalReflections {
  gratitude: string;
  wentWell: string;
  improvement: string;
  dua: string;
}

export interface JournalPayload {
  body: string;
  reflections: JournalReflections;
}

export interface JournalEntry {
  id: string;
  planningDayKey: string;
  payload: JournalPayload;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryRow {
  id: string;
  planningDayKey: string;
  encryptedPayload: string;
  encryptionVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryMetadata {
  id: string;
  planningDayKey: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntrySaveInput {
  planningDayKey: string;
  payload: JournalPayload;
  revision?: number;
}

export interface JournalListOptions {
  limit?: number;
  offset?: number;
}
