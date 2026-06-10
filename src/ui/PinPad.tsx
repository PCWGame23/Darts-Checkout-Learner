// Reusable 4-digit PIN entry pad.

import { useState } from 'react'

interface Props {
  title: string
  error?: boolean
  onComplete: (pin: string) => void
}

export default function PinPad({ title, error, onComplete }: Props) {
  const [pin, setPin] = useState('')

  const press = (digit: string) => {
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      onComplete(next)
      setPin('')
    }
  }

  return (
    <div className={error ? 'shake' : ''}>
      <p className="center">{title}</p>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}>0</button>
        <button className="btn-ghost" onClick={() => setPin(pin.slice(0, -1))}>
          ⌫
        </button>
      </div>
    </div>
  )
}
