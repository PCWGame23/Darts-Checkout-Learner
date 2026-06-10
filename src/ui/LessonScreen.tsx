import { useMemo, useState } from 'react'
import { routeLabel, routeValue, type Route } from '../engine/darts'
import { useT } from '../i18n'
import {
  buildEndlessLesson,
  buildLesson,
  buildMissLesson,
  completeLesson,
  recordAnswer,
  type LessonItem
} from '../learn/lessons'
import type { Grade } from '../learn/scheduler'
import { useAppState } from '../state/store'
import BoardEntry from './exercises/BoardEntry'
import MatchExercise from './exercises/MatchExercise'
import TileOrder from './exercises/TileOrder'
import Mascot from './Mascot'

export type LessonMode = 'lesson' | 'endless' | 'miss'

interface Props {
  onExit: () => void
  mode?: LessonMode
}

interface Feedback {
  grade: Grade
  item: LessonItem
  built?: Route
}

export default function LessonScreen({ onExit, mode = 'lesson' }: Props) {
  const t = useT()
  const state = useAppState()
  const lesson = useMemo(() => {
    if (mode === 'miss') return buildMissLesson()
    if (mode === 'endless') return buildEndlessLesson()
    return buildLesson()
  }, [mode])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [finished, setFinished] = useState(false)

  if (lesson.length === 0) {
    // Nothing due and nothing new — shouldn't normally happen.
    onExit()
    return null
  }

  const item = lesson[index]

  const handleAnswer = (grade: Grade, built?: Route) => {
    // A matching round credits every pair it covers and skips the per-item
    // feedback panel (Duolingo-style: solving it is its own confirmation).
    if (item.exercise === 'match' && item.match) {
      for (const pair of item.match) recordAnswer(pair.score, grade)
      setCorrect((c) => c + 1)
      next()
      return
    }
    if (mode !== 'miss' || grade !== 'again') {
      recordAnswer(item.score, grade)
    }
    if (grade !== 'again') setCorrect((c) => c + 1)
    setFeedback({ grade, item, built })
  }

  const next = () => {
    setFeedback(null)
    if (index + 1 >= lesson.length) {
      if (mode !== 'miss') completeLesson()
      setFinished(true)
    } else {
      setIndex(index + 1)
    }
  }

  if (finished) {
    return (
      <div className="screen">
        <div className="grow" />
        <div className="mascot mascot-celebrate">
          <Mascot height={120} />
        </div>
        <h1 className="center">{t('lesson.complete')}</h1>
        <p className="center">{t('lesson.summary', { correct, total: lesson.length })}</p>
        {mode !== 'miss' && (
          <p className="center" style={{ fontSize: '1.3rem' }}>
            {t('lesson.streakUp', { n: state.streak.current })}
          </p>
        )}
        <div className="grow" />
        <button className="btn-primary" onClick={onExit}>
          {t('lesson.continue')}
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="btn-ghost" onClick={onExit} aria-label={t('lesson.quit')}>
          ✕
        </button>
        <div className="progress-track grow">
          <div
            className="progress-fill"
            style={{ width: `${(index / lesson.length) * 100}%` }}
          />
        </div>
      </div>

      {feedback ? (
        <FeedbackPanel feedback={feedback} onContinue={next} />
      ) : (
        <>
          {item.exercise === 'board' && <BoardEntry item={item} onAnswer={handleAnswer} />}
          {item.exercise === 'tiles' && <TileOrder item={item} onAnswer={handleAnswer} />}
          {item.exercise === 'match' && <MatchExercise item={item} onAnswer={handleAnswer} />}
        </>
      )}
    </div>
  )
}

function FeedbackPanel({ feedback, onContinue }: { feedback: Feedback; onContinue: () => void }) {
  const t = useT()
  const { grade, item, built } = feedback

  if (item.miss) {
    return <MissFeedbackPanel feedback={feedback} onContinue={onContinue} />
  }

  const favRoute = routeLabel(item.taught.route)
  const proTip = item.taught.proTip ? routeLabel(item.taught.proTip) : null
  const builtLabel = built ? routeLabel(built) : null
  // Lead with what the player actually threw when it was correct; otherwise
  // show the recommended (favourite) route.
  const route = grade === 'good' && builtLabel ? builtLabel : favRoute
  // They found a valid finish that isn't the recommended one: nudge them to it.
  const showFavHint = grade === 'good' && builtLabel !== null && builtLabel !== favRoute
  const message =
    grade === 'good'
      ? t('lesson.correct')
      : grade === 'almost'
        ? t('lesson.alsoWorks', { route: favRoute })
        : t('lesson.wrong', { route: favRoute })

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="prompt-score">{item.score}</div>
      <div className="route-display">{route}</div>
      <div className={`feedback ${grade}`}>{message}</div>
      {showFavHint ? (
        <div className="pro-tip">{t('lesson.favRoute', { route: favRoute })}</div>
      ) : (
        proTip && <div className="pro-tip">{t('lesson.proTip', { route: proTip })}</div>
      )}
      <div className="grow" />
      <button className="btn-primary" onClick={onContinue}>
        {t('lesson.continue')}
      </button>
    </div>
  )
}

function MissFeedbackPanel({ feedback, onContinue }: { feedback: Feedback; onContinue: () => void }) {
  const t = useT()
  const { grade, item, built } = feedback
  const miss = item.miss!

  if (miss.kind === 'finish') {
    const favRoute = miss.taught ? routeLabel(miss.taught.route) : null
    const proTip = miss.taught?.proTip ? routeLabel(miss.taught.proTip) : null
    const builtLabel = built ? routeLabel(built) : null
    const route = (grade === 'good' && builtLabel) || favRoute || builtLabel || ''
    // Show the full visit: the dart already thrown (the miss) + the rescue route.
    const fullRoute = `${routeLabel([miss.hit])}  ${route}`
    const showFavHint =
      grade === 'good' && favRoute !== null && builtLabel !== null && builtLabel !== favRoute
    const message =
      grade === 'good'
        ? t('lesson.correct')
        : t('lesson.wrong', { route: favRoute ?? '' })

    return (
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="prompt-score">{item.score}</div>
        <div className="route-display">{fullRoute}</div>
        <div className={`feedback ${grade}`}>{message}</div>
        {showFavHint ? (
          <div className="pro-tip">{t('lesson.favRoute', { route: favRoute! })}</div>
        ) : (
          proTip && <div className="pro-tip">{t('lesson.proTip', { route: proTip })}</div>
        )}
        {miss.direct && grade !== 'good' && (
          <div className="pro-tip">{t('lesson.directHint', { dart: routeLabel([miss.direct]) })}</div>
        )}
        <div className="grow" />
        <button className="btn-primary" onClick={onContinue}>
          {t('lesson.continue')}
        </button>
      </div>
    )
  }

  // setup
  const bestSetup = miss.bestSetup!
  const bestLeave = miss.remainder - routeValue(bestSetup)
  const bestRouteLabel = routeLabel(bestSetup)
  const fullRoute = `${routeLabel([miss.hit])}  ${bestRouteLabel}`
  const userLeave = built ? miss.remainder - routeValue(built) : undefined

  const message =
    grade === 'good'
      ? t('lesson.miss.goodSetup', { leave: userLeave ?? bestLeave })
      : grade === 'almost'
        ? t('lesson.miss.almostSetup', {
            leave: userLeave ?? bestLeave,
            route: bestRouteLabel,
            bestLeave
          })
        : t('lesson.miss.wrongSetup', { route: bestRouteLabel, bestLeave })

  return (
    <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="prompt-score">{item.score}</div>
      <div className="route-display">{fullRoute}</div>
      <div className={`feedback ${grade}`}>{message}</div>
      <div className="grow" />
      <button className="btn-primary" onClick={onContinue}>
        {t('lesson.continue')}
      </button>
    </div>
  )
}
