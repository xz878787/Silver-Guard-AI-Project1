import type { HistoryRecord, AnalysisMode } from "./types";

const STORAGE_KEY = "silver-guard-history";
const MAX_RECORDS = 50;

export function getHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as HistoryRecord[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function addRecord(mode: AnalysisMode, input: string, result: HistoryRecord["result"]) {
  const record: HistoryRecord = {
    id: generateId(),
    createdAt: Date.now(),
    mode,
    input,
    result,
  };

  const records = getHistory();
  records.unshift(record);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}

export function deleteRecord(id: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getHistory().filter((r) => r.id !== id)));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
