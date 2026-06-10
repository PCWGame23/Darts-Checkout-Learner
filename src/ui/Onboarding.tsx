import { useState } from 'react'
import { useT } from '../i18n'
import { hashPin, setState, useAppState, type Language } from '../state/store'
import FavoritePicker, { type FavSelection } from './FavoritePicker'
import Mascot from './Mascot'
import PinPad from './PinPad'

type Step = 'language' | 'pin' | 'pinRepeat' | 'favorites'

export default function Onboarding() {
  const t = useT()
  const { language } = useAppState()
  const [step, setStep] = useState<Step>('language')
  const [pinFirst, setPinFirst] = useState('')
  const [pinError, setPinError] = useState(false)
  const [favs, setFavs] = useState<FavSelection>({})

  const finish = async (pin: string | null) => {
    setState({
      pinHash: pin ? await hashPin(pin) : null
    })
  }

  if (step === 'language') {
    return (
      <div className="screen">
        <div className="grow" />
        <div className="mascot">
          <Mascot height={140} />
        </div>
        <h1 className="center">{t('onb.welcome')}</h1>
        <p className="center">{t('onb.tagline')}</p>
        <div className="card">
          <h2>{t('onb.language')}</h2>
          <div className="btn-row" style={{ marginTop: 12 }}>
            {(['de', 'en'] as Language[]).map((lang) => (
              <button
                key={lang}
                className={language === lang ? 'btn-primary' : ''}
                onClick={() => setState({ language: lang })}
              >
                {lang === 'de' ? 'Deutsch' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <div className="grow" />
        <button className="btn-primary" onClick={() => setStep('pin')}>
          {t('onb.next')}
        </button>
      </div>
    )
  }

  if (step === 'pin' || step === 'pinRepeat') {
    return (
      <div className="screen">
        <h1 className="center">{t('onb.pin.title')}</h1>
        <p className="center">{t('onb.pin.explain')}</p>
        <PinPad
          key={step}
          title={t(step === 'pin' ? 'onb.pin.enter' : 'onb.pin.repeat')}
          error={pinError}
          onComplete={async (pin) => {
            if (step === 'pin') {
              setPinFirst(pin)
              setPinError(false)
              setStep('pinRepeat')
            } else if (pin === pinFirst) {
              await finish(pin)
              setStep('favorites')
            } else {
              setPinError(true)
              setStep('pin')
            }
          }}
        />
        {pinError && <p className="center" style={{ color: 'var(--red)' }}>{t('onb.pin.mismatch')}</p>}
        <div className="grow" />
        <button
          className="btn-ghost"
          onClick={async () => {
            await finish(null)
            setStep('favorites')
          }}
        >
          {t('onb.pin.skip')}
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>{t('onb.favs.title')}</h1>
      <p>{t('onb.favs.explain')}</p>
      <FavoritePicker value={favs} onChange={setFavs} />
      {!favs.first && <p className="hint">{t('onb.favs.none')}</p>}
      <div className="grow" />
      <button
        className="btn-primary"
        onClick={() =>
          setState({
            favorites: { first: favs.first, second: favs.second },
            onboarded: true
          })
        }
      >
        {t('onb.start')}
      </button>
    </div>
  )
}
