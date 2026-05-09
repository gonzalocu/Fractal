import { TIMEFRAMES } from '../hooks/useCryptoRSI'

// Coordenadas internas del SVG — viewBox ancho para que strokeWidth se vea fino al escalar
const VW  = 400
const VH  = 180
const PAD = { top: 10, bottom: 18, left: 28, right: 6 }

const TF_COLORS = { '1m': '#818cf8', '5m': '#fbbf24', '15m': '#34d399' }
const SMA_COLOR = '#94a3b8'

const innerW = VW - PAD.left - PAD.right
const innerH = VH - PAD.top  - PAD.bottom

function rsiToY(v) { return innerH - (v / 100) * innerH }

function toPoints(data) {
  if (!data || data.length < 2) return null
  return data
    .map((v, i) => `${((i / (data.length - 1)) * innerW).toFixed(1)},${rsiToY(v).toFixed(1)}`)
    .join(' ')
}

function smaPoints(data, rsiLen) {
  if (!data || data.length < 2) return null
  const offset = rsiLen - data.length
  return data
    .map((v, i) => {
      const x = (((offset + i) / Math.max(rsiLen - 1, 1)) * innerW).toFixed(1)
      return `${x},${rsiToY(v).toFixed(1)}`
    })
    .join(' ')
}

function CrossMarkers({ rsiData, smaData, rsiLen }) {
  if (!rsiData || !smaData || rsiData.length < 2 || smaData.length < 2) return null
  const offset  = rsiLen - smaData.length
  const markers = []

  for (let i = 1; i < smaData.length; i++) {
    const ri = offset + i
    if (ri >= rsiData.length) break
    const pRsi = rsiData[ri - 1], cRsi = rsiData[ri]
    const pSma = smaData[i - 1],  cSma = smaData[i]
    if (pRsi == null || cRsi == null || pSma == null || cSma == null) continue

    const crossUp   = pRsi <= pSma && cRsi > cSma && cRsi <= 35
    const crossDown = pRsi >= pSma && cRsi < cSma && cRsi >= 65
    if (!crossUp && !crossDown) continue

    const x     = ((ri / Math.max(rsiLen - 1, 1)) * innerW)
    const y     = rsiToY(cRsi)
    const color = crossUp ? '#34d399' : '#f87171'
    const s     = 5
    const pts   = crossUp
      ? `${x},${y - s} ${x - s * 0.7},${y + s * 0.4} ${x + s * 0.7},${y + s * 0.4}`
      : `${x},${y + s} ${x - s * 0.7},${y - s * 0.4} ${x + s * 0.7},${y - s * 0.4}`
    markers.push(<polygon key={i} points={pts} fill={color} />)
  }
  return <>{markers}</>
}

export default function RSIChart({ coin }) {
  const y30 = rsiToY(30)
  const y50 = rsiToY(50)
  const y70 = rsiToY(70)

  return (
    <div className="rsi-chart">
      {TIMEFRAMES.map((tf) => {
        const rsiHistory = coin.rsiHistory[tf]
        const smaHistory = coin.smaHistory[tf]
        const current    = coin.rsi[tf]
        const currentSma = coin.sma[tf]
        const color      = TF_COLORS[tf]
        const rsiPts     = toPoints(rsiHistory)
        const smaPts     = smaPoints(smaHistory, rsiHistory?.length ?? 0)

        return (
          <div key={tf} className="rsi-chart__row">
            <div className="rsi-chart__tf-label">
              <span style={{ color }}>{tf}</span>
              {current    != null && <span className="rsi-chart__cur"     style={{ color }}>{current.toFixed(1)}</span>}
              {currentSma != null && <span className="rsi-chart__sma-val">S {currentSma.toFixed(1)}</span>}
            </div>

            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              preserveAspectRatio="none"
              className="rsi-chart__svg"
            >
              <g transform={`translate(${PAD.left},${PAD.top})`}>
                {/* Zonas de fondo */}
                <rect x={0} y={0}   width={innerW} height={y70}          fill="#ef444406" />
                <rect x={0} y={y30} width={innerW} height={innerH - y30} fill="#22c55e06" />

                {/* Líneas de referencia */}
                <line x1={0} y1={y70} x2={innerW} y2={y70} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.5" />
                <line x1={0} y1={y50} x2={innerW} y2={y50} stroke="#374151" strokeWidth="0.4" />
                <line x1={0} y1={y30} x2={innerW} y2={y30} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.5" />

                {/* Etiquetas Y */}
                {[['70', y70, '#ef444466'], ['50', y50, '#37415166'], ['30', y30, '#22c55e66']].map(([v, y, c]) => (
                  <text key={v} x={-4} y={+y + 3} textAnchor="end" fontSize={9} fill={c}>{v}</text>
                ))}

                {rsiPts ? (
                  <>
                    {/* SMA — línea fina discontinua, dibujada ANTES del RSI para que quede detrás */}
                    {smaPts && (
                      <polyline
                        points={smaPts}
                        fill="none"
                        stroke={SMA_COLOR}
                        strokeWidth="0.8"
                        strokeDasharray="5,3"
                        strokeLinejoin="round"
                        opacity="0.75"
                      />
                    )}

                    {/* RSI — línea sólida fina */}
                    <polyline
                      points={rsiPts}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    <CrossMarkers rsiData={rsiHistory} smaData={smaHistory} rsiLen={rsiHistory.length} />

                    {/* Puntos finales — retranqueados 3px para no salirse del viewBox */}
                    {current    != null && <circle cx={innerW - 3} cy={rsiToY(current)}    r={2.5} fill={color} />}
                    {currentSma != null && <circle cx={innerW - 3} cy={rsiToY(currentSma)} r={1.8} fill={SMA_COLOR} opacity="0.9" />}
                  </>
                ) : (
                  <text x={innerW / 2} y={innerH / 2} textAnchor="middle" fontSize={10} fill="#4b5563">Cargando…</text>
                )}
              </g>
            </svg>
          </div>
        )
      })}

      <div className="rsi-chart__legend">
        {TIMEFRAMES.map((tf) => (
          <span key={tf} className="rsi-chart__legend-item">
            <span className="rsi-chart__legend-dot" style={{ background: TF_COLORS[tf] }} />
            RSI {tf}
          </span>
        ))}
        <span className="rsi-chart__legend-item">
          <span className="rsi-chart__legend-dash">– –</span>
          SMA(14)
        </span>
        <span className="rsi-chart__legend-item rsi-chart__legend-cross-up">▲ alcista</span>
        <span className="rsi-chart__legend-item rsi-chart__legend-cross-down">▼ bajista</span>
      </div>
    </div>
  )
}
