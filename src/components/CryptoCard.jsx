import { useState } from 'react'
import RSIGauge from './RSIGauge'
import RSIChart from './RSIChart'
import { TIMEFRAMES } from '../hooks/useCryptoRSI'

const FRACTALITY_LABELS = {
  overbought: { text: '⚡ FRACTAL SOBRECOMPRA', cls: 'fractal--overbought' },
  oversold:   { text: '⚡ FRACTAL SOBREVENTA',  cls: 'fractal--oversold'   },
}

function formatPrice(p) {
  if (p === null) return '—'
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (p >= 1)    return `$${p.toFixed(4)}`
  return `$${p.toFixed(5)}`
}

export default function CryptoCard({ coin }) {
  const [showChart, setShowChart] = useState(false)
  const fractal = coin.fractality ? FRACTALITY_LABELS[coin.fractality] : null

  return (
    <div className={`crypto-card ${fractal ? 'crypto-card--fractal' : ''}`}>
      <div className="crypto-card__header">
        <div className="crypto-card__symbol-wrap">
          <span className="crypto-card__dot" style={{ background: coin.color }} />
          <div>
            <h2 className="crypto-card__symbol">{coin.id}</h2>
            <p className="crypto-card__label">{coin.label}</p>
          </div>
        </div>
        <div className="crypto-card__header-right">
          <span className="crypto-card__price">{formatPrice(coin.price)}</span>
          <button
            className={`btn-chart-toggle ${showChart ? 'btn-chart-toggle--active' : ''}`}
            onClick={() => setShowChart((v) => !v)}
            title={showChart ? 'Ocultar gráfica' : 'Ver histórico RSI'}
          >
            {showChart ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {fractal && (
        <div className={`fractal-badge ${fractal.cls}`}>{fractal.text}</div>
      )}

      <div className="crypto-card__gauges">
        {TIMEFRAMES.map((tf) => (
          <RSIGauge key={tf} tf={tf} rsi={coin.rsi[tf]} zone={coin.zone[tf]} />
        ))}
      </div>

      {showChart && (
        <div className="crypto-card__chart">
          <RSIChart coin={coin} />
        </div>
      )}
    </div>
  )
}
