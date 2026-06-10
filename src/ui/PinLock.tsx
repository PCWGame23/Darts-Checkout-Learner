import { useState } from 'react'
import { useT } from '../i18n'
import { hashPin, useAppState } from '../state/store'
import Mascot from './Mascot'
import PinPad from './PinPad'

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const t = useT()
  const { pinHash } = useAppState()
  const [error, setError] = useState(false)

  return (
    <div className="screen">
      <div className="grow" />
      <div className="mascot">
        <Mascot height={100} />
      </div>
      <PinPad
        title={t('pin.enter')}
        error={error}
        onComplete={async (pin) => {
          if ((await hashPin(pin)) === pinHash) {
            onUnlock()
          } else {
            setError(true)
            setTimeout(() => setError(false), 400)
          }
        }}
      />
      {error && <p className="center" style={{ color: 'var(--red)' }}>{t('pin.wrong')}</p>}
      <div className="grow" />
    </div>
  )
}
