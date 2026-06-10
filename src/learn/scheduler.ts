// SM-2-lite spaced repetition.
// Grades: 'good' (exact route), 'almost' (valid alternative — counts, but
// resurfaces sooner), 'again' (wrong / didn't know).

import { todayISO, type ItemProgress } from '../state/store'

export type Grade = 'good' | 'almost' | 'again'

const INTERVALS = [1, 3, 7, 14, 30, 90]

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

export function newItem(score: number, today = todayISO()): ItemProgress {
  return { score, reps: 0, intervalDays: 0, due: today, lapses: 0 }
}

export function gradeItem(item: ItemProgress, grade: Grade, today = todayISO()): ItemProgress {
  if (grade === 'again') {
    return { ...item, reps: 0, intervalDays: 1, due: addDays(today, 1), lapses: item.lapses + 1 }
  }
  const reps = item.reps + 1
  const base = INTERVALS[Math.min(reps - 1, INTERVALS.length - 1)]
  const interval = grade === 'almost' ? Math.max(1, Math.floor(base / 2)) : base
  return { ...item, reps, intervalDays: interval, due: addDays(today, interval) }
}

export function dueItems(items: Record<string, ItemProgress>, today = todayISO()): ItemProgress[] {
  return Object.values(items)
    .filter((it) => it.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due)) // most overdue first
}
