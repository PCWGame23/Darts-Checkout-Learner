import { useState } from 'react'
import { useAppState } from './state/store'
import { LessonMode } from './ui/LessonScreen'
import PinLock from './ui/PinLock'
import Onboarding from './ui/Onboarding'
import Home from './ui/Home'
import LessonScreen from './ui/LessonScreen'
import Settings from './ui/Settings'

export type View = 'home' | 'lesson' | 'settings'

export default function App() {
  const state = useAppState()
  const [unlocked, setUnlocked] = useState(false)
  const [view, setView] = useState<View>('home')
  const [mode, setMode] = useState<LessonMode>('lesson')

  if (!state.onboarded) return <Onboarding />
  if (state.pinHash && !unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />

  switch (view) {
    case 'lesson':
      return <LessonScreen mode={mode} onExit={() => setView('home')} />
    case 'settings':
      return <Settings onBack={() => setView('home')} />
    default:
      return (
        <Home
          onStartLesson={() => {
            setMode('lesson')
            setView('lesson')
          }}
          onStartEndless={() => {
            setMode('endless')
            setView('lesson')
          }}
          onStartMiss={() => {
            setMode('miss')
            setView('lesson')
          }}
          onSettings={() => setView('settings')}
        />
      )
  }
}
