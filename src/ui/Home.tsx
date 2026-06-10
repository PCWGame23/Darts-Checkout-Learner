import { useT } from '../i18n'
import {
  computeUnlockedStage,
  currentStageId,
  isStageComplete,
  practicedCount,
  stageProgress,
  STAGES
} from '../learn/progress'
import { allUnitsComplete } from '../learn/lessons'
import { todayISO, useAppState } from '../state/store'
import Mascot from './Mascot'

interface Props {
  onStartLesson: () => void
  onStartEndless: () => void
  onStartMiss: () => void
  onSettings: () => void
}

// Gentle left/right zig-zag down the path, like Duolingo's lesson trail.
const OFFSETS = [0, 54, 18, -54, -18]

export default function Home({ onStartLesson, onStartEndless, onStartMiss, onSettings }: Props) {
  const t = useT()
  const state = useAppState()
  const unlocked = computeUnlockedStage(state)
  const current = currentStageId(state)
  const doneToday = state.streak.lastLessonDate === todayISO()
  const endlessUnlocked = allUnitsComplete(state)

  return (
    <div className="screen home">
      <div className="topbar">
        <span className="streak-chip">🔥 {state.streak.current}</span>
        <span className="spacer" />
        <button
          className="btn-ghost mode-btn"
          onClick={onStartEndless}
          disabled={!endlessUnlocked}
          aria-label={t('home.endless')}
          title={t('home.endless')}
        >
          ♾️
        </button>
        <button
          className="btn-ghost mode-btn"
          onClick={onStartMiss}
          aria-label={t('home.miss')}
          title={t('home.miss')}
        >
          🎯
        </button>
        <button className="btn-ghost" onClick={onSettings} aria-label={t('settings.title')}>
          ⚙️
        </button>
      </div>

      <div className="unit-banner">
        <div className="unit-eyebrow">{t('home.unit', { n: current + 1 })}</div>
        <h2>{t(STAGES[current].nameKey)}</h2>
      </div>

      <div className="path">
        {STAGES.map((stage, i) => {
          const locked = stage.id > unlocked
          const done = isStageComplete(state, stage)
          const isCurrent = stage.id === current
          const pct = Math.round(stageProgress(state, stage) * 100)
          const practiced = practicedCount(state, stage)
          const face = locked ? '🔒' : done ? '★' : isCurrent ? (doneToday ? '✓' : '🎯') : '☆'

          return (
            <div
              key={stage.id}
              className="path-row"
              style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
            >
              {isCurrent && (
                <div className="start-bubble">
                  {doneToday ? t('home.node.review') : t('home.node.start')}
                </div>
              )}

              <button
                className={`node${locked ? ' locked' : ''}${done ? ' done' : ''}${
                  isCurrent ? ' current' : ''
                }`}
                disabled={locked}
                onClick={onStartLesson}
                aria-label={t(stage.nameKey)}
              >
                <svg className="node-ring" viewBox="0 0 36 36" aria-hidden="true">
                  <circle className="ring-bg" cx="18" cy="18" r="16" pathLength={100} />
                  <circle
                    className="ring-fg"
                    cx="18"
                    cy="18"
                    r="16"
                    pathLength={100}
                    style={{ strokeDasharray: `${pct} 100` }}
                  />
                </svg>
                <span className="node-face">{face}</span>
              </button>

              {isCurrent && (
                <div className="path-mascot">
                  <Mascot height={72} />
                </div>
              )}

              <div className="node-label">
                {t(stage.nameKey)}
                {!locked && (
                  <span className="node-sub">
                    {practiced}/{stage.scores.length}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
