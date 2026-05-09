const OVERBOUGHT = 70
const OVERSOLD   = 30

function getGaugeColor(rsi) {
  if (rsi === null) return '#4b5563'
  if (rsi >= OVERBOUGHT) return '#ef4444'
  if (rsi <= OVERSOLD)   return '#22c55e'
  return '#6366f1'
}

export default function RSIGauge({ rsi, sma, zone, tf }) {
  const value = rsi ?? 50
  const pct   = Math.min(100, Math.max(0, value))
  const smaPct = sma !== null ? Math.min(100, Math.max(0, sma)) : null
  const color = getGaugeColor(rsi)

  const zoneLabel =
    zone === 'overbought' ? 'Sobrecompra' :
    zone === 'oversold'   ? 'Sobreventa'  :
    zone === 'loading'    ? '...'         : 'Neutral'

  return (
    <div className="rsi-gauge">
      <div className="rsi-gauge__header">
        <span className="rsi-gauge__tf">{tf}</span>
        <div className="rsi-gauge__vals">
          <span className="rsi-gauge__value" style={{ color }}>
            {rsi !== null ? rsi.toFixed(1) : '—'}
          </span>
          {sma !== null && (
            <span className="rsi-gauge__sma">
              SMA {sma.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="rsi-gauge__bar-bg">
        <div className="rsi-gauge__zone-marker" style={{ left: `${OVERSOLD}%`,   background: '#22c55e33' }} />
        <div className="rsi-gauge__zone-marker" style={{ left: `${OVERBOUGHT}%`, background: '#ef444433' }} />
        <div className="rsi-gauge__bar-fill"    style={{ width: `${pct}%`,       background: color }} />
        <div className="rsi-gauge__needle"      style={{ left: `${pct}%`,        borderColor: color }} />
        {/* Marcador SMA */}
        {smaPct !== null && (
          <div className="rsi-gauge__sma-marker" style={{ left: `${smaPct}%` }} />
        )}
      </div>

      <div className="rsi-gauge__labels">
        <span style={{ color: '#22c55e', fontSize: '0.6rem' }}>0</span>
        <span style={{ color: '#9ca3af', fontSize: '0.65rem' }}>{zoneLabel}</span>
        <span style={{ color: '#ef4444', fontSize: '0.6rem' }}>100</span>
      </div>
    </div>
  )
}
