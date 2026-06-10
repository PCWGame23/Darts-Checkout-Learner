import { dartLabel } from '../../engine/darts'
import { useT } from '../../i18n'
import type { MissChallenge } from '../../engine/miss'

interface Props {
  miss: MissChallenge
}

export default function MissHeader({ miss }: Props) {
  const t = useT()
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="prompt-score" style={{ fontSize: '2.6rem', margin: 0 }}>
        {miss.remainder}
      </div>
      <p className="hint" style={{ margin: '4px 0' }}>
        {t('ex.miss.aimedHit', {
          intended: dartLabel(miss.intended),
          hit: dartLabel(miss.hit)
        })}
      </p>
      <p className="hint">
        {miss.kind === 'finish'
          ? t('ex.miss.finishTask')
          : t('ex.miss.setupTask')}
      </p>
    </div>
  )
}
