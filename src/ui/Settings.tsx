import { useRef, useState } from 'react'
import { useT } from '../i18n'
import { applyFavorites } from '../learn/lessons'
import {
  defaultState,
  exportBackup,
  hashPin,
  importBackup,
  setState,
  useAppState,
  type Language
} from '../state/store'
import FavoritePicker from './FavoritePicker'
import PinPad from './PinPad'

export default function Settings({ onBack }: { onBack: () => void }) {
  const t = useT()
  const state = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pinMode, setPinMode] = useState<'set' | null>(null)
  const [notice, setNotice] = useState('')

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3000)
  }

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `darts-checkout-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (pinMode) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="btn-ghost" onClick={() => setPinMode(null)}>
            ← {t('misc.back')}
          </button>
        </div>
        <div className="grow" />
        <PinPad
          title={t('onb.pin.enter')}
          onComplete={async (pin) => {
            setState({ pinHash: await hashPin(pin) })
            setPinMode(null)
          }}
        />
        <div className="grow" />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="btn-ghost" onClick={onBack}>
          ← {t('misc.back')}
        </button>
        <h1>{t('settings.title')}</h1>
        <span className="spacer" />
      </div>

      {notice && <div className="feedback almost">{notice}</div>}

      <div className="card">
        <h2>{t('settings.language')}</h2>
        <div className="btn-row" style={{ marginTop: 12 }}>
          {(['de', 'en'] as Language[]).map((lang) => (
            <button
              key={lang}
              className={state.language === lang ? 'btn-primary' : ''}
              onClick={() => setState({ language: lang })}
            >
              {lang === 'de' ? 'Deutsch' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>{t('settings.favorites')}</h2>
        <div style={{ marginTop: 12 }}>
          <FavoritePicker
            value={state.favorites}
            onChange={(v) => {
              const changed = applyFavorites(v.first, v.second)
              if (changed > 0) flash(t('settings.favs.changed'))
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>{t('settings.pin')}</h2>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button onClick={() => setPinMode('set')}>
            {state.pinHash ? t('settings.pin.change') : t('settings.pin.enable')}
          </button>
          {state.pinHash && (
            <button onClick={() => setState({ pinHash: null })}>
              {t('settings.pin.disable')}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>{t('settings.backup')}</h2>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button onClick={download}>{t('settings.backup.export')}</button>
          <button onClick={() => fileRef.current?.click()}>
            {t('settings.backup.import')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const ok = importBackup(await file.text())
            flash(t(ok ? 'settings.backup.imported' : 'settings.backup.failed'))
            e.target.value = ''
          }}
        />
      </div>

      <button
        className="btn-ghost"
        style={{ color: 'var(--red)' }}
        onClick={() => {
          if (confirm(t('settings.reset.confirm'))) {
            setState(defaultState())
          }
        }}
      >
        {t('settings.reset')}
      </button>
    </div>
  )
}
