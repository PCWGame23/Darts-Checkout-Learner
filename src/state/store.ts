// App state: a tiny pub-sub store persisted to localStorage.
// Installed home-screen PWAs keep their storage on iOS, but the user can
// still export/import a JSON backup from Settings as insurance.

import { useSyncExternalStore } from 'react'

export type Language = 'de' | 'en'

export interface ItemProgress {
  score: number
  /** consecutive successful reviews */
  reps: number
  intervalDays: number
  /** ISO date (yyyy-mm-dd) when next due */
  due: string
  lapses: number
}

export interface AppState {
  schemaVersion: 1
  language: Language
  /** SHA-256 hex of the PIN; null = lock disabled */
  pinHash: string | null
  /** favourite doubles as labels, e.g. "D20", "Bull" */
  favorites: { first?: string; second?: string }
  onboarded: boolean
  streak: { current: number; best: number; lastLessonDate: string | null }
  /** per-score learning progress, keyed by score */
  items: Record<string, ItemProgress>
  /** highest unlocked stage index (0-based) */
  stageUnlocked: number
}

const STORAGE_KEY = 'darts-checkout-learner-v1'

function detectLanguage(): Language {
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function defaultState(): AppState {
  return {
    schemaVersion: 1,
    language: detectLanguage(),
    pinHash: null,
    favorites: {},
    onboarded: false,
    streak: { current: 0, best: 0, lastLessonDate: null },
    items: {},
    stageUnlocked: 0
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.schemaVersion !== 1) return defaultState()
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

export function setState(update: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const patch = typeof update === 'function' ? update(state) : update
  state = { ...state, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full/unavailable — keep going in-memory
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: re-renders on any state change. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

// --- PIN -----------------------------------------------------------------

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`dcl:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// --- Backup --------------------------------------------------------------

export function exportBackup(): string {
  return JSON.stringify(state, null, 2)
}

export function importBackup(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as AppState
    if (parsed.schemaVersion !== 1 || typeof parsed.items !== 'object') return false
    state = { ...defaultState(), ...parsed }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    listeners.forEach((l) => l())
    return true
  } catch {
    return false
  }
}

/** Today as ISO date (local time). */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
