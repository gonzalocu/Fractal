const OVERBOUGHT = 70
const OVERSOLD   = 30
const SMA_COLOR  = '#94a3b8'

function getGaugeColor(rsi) {
  if (rsi === null) return '#4b5563'
  if (rsi >= OVERBOUGHT) return '#ef4444'
  if (rsi <= OVERSOLD)   return '#22c55e'
  return '#6366f1'
}

function getSMAColor(sma) {
  if (sma === null) return '#4b5563'
  if (sma >= OVERBOUGHT) return '#fca5a5'
  if (sma <= OVERSOLD)   return '#86efac'
  return SMA_COLOR
}

function Bar({ pct, color, markerPct, markerColor, label, subLabel, subPct }) {
  return (
    <div className="rsi-gauge__bar-row">
      <span className="rsi-gauge__bar-tag">{label}</span>
      <div className="rsi-gauge__bar-wrap">
        <div className="rsi-gauge__bar-bg">
          <div className="rsi-gauge__zone-marker" style={{ left: `${OVERSOLD}%`,   background: '#22c55e33' }} />
          <div className="rsi-gauge__zone-marker" style={{ left: `${OVERBOUGHT}%`, background: '#ef444433' }} />
          <div className="rsi-gauge__bar-fill"    style={{ width: `${pct}%`,       background: color }} />
          <div className="rsi-gauge__needle"      style={{ left: `${pct}%`,        borderColor: color }} />
        </div>
      </div>
      <span className="rsi-gauge__bar-val" style={{ color }}>{subLabel}</span>
    </div>
  )
}

export default function RSIGauge({ rsi, sma, zone, tf }) {
  const rsiPct  = Math.min(100, Math.max(0, rsi ?? 50))
  const smaPct  = Math.min(100, Math.max(0, sma ?? 50))
  const rsiColor = getGaugeColor(rsi)
  const smaColor = getSMAColor(sma)

  const zoneLabel =
    zone === 'overbought' ? 'Sobrecompra' :
    zone === 'oversold'   ? 'Sobreventa'  :
    zone === 'loading'    ? '...'         : 'Neutral'

  return (
    <div className="rsi-gauge">
      <div className="rsi-gauge__header">
        <span className="rsi-gauge__tf">{tf}</span>
        <span className="rsi-gauge__zone-label">{zoneLabel}</span>
      </div>

      <Bar
        pct={rsiPct}
        color={rsiColor}
        label="RSI"
        subLabel={rsi !== null ? rsi.toFixed(1) : '—'}
      />
      <Bar
        pct={smaPct}
        color={smaColor}
        label="SMA"
        subLabel={sma !== null ? sma.toFixed(1) : '—'}
      />
    </div>
  )
}
