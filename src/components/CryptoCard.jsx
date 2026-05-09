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

function CoinLogo({ coin }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!coin.logo || imgFailed) {
    return <span className="crypto-card__dot" style={{ background: coin.color }} />
  }
  return (
    <img
      src={coin.logo}
      alt={coin.id}
      className="crypto-card__logo"
      onError={() => setImgFailed(true)}
    />
  )
}

export default function CryptoCard({ coin, showChart }) {
  const fractal = coin.fractality ? FRACTALITY_LABELS[coin.fractality] : null

  return (
    <div className={`crypto-card ${fractal ? 'crypto-card--fractal' : ''}`}>
      <div className="crypto-card__header">
        <div className="crypto-card__symbol-wrap">
          <CoinLogo coin={coin} />
          <div>
            <h2 className="crypto-card__symbol">{coin.id}</h2>
            <p className="crypto-card__label">{coin.label}</p>
          </div>
        </div>
        <span className="crypto-card__price">{formatPrice(coin.price)}</span>
      </div>

      {fractal && (
        <div className={`fractal-badge ${fractal.cls}`}>{fractal.text}</div>
      )}

      <div className="crypto-card__gauges">
        {TIMEFRAMES.map((tf) => (
          <RSIGauge key={tf} tf={tf} rsi={coin.rsi[tf]} sma={coin.sma[tf]} zone={coin.zone[tf]} />
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
