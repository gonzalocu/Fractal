import { TIMEFRAMES } from '../hooks/useCryptoRSI'

const H   = 140
const PAD = { top: 8, bottom: 16, left: 26, right: 6 }
const W   = 100

const TF_COLORS = { '1m': '#6366f1', '5m': '#f59e0b', '15m': '#22c55e' }
const SMA_COLOR = '#e2e8f0'

function toPolyPoints(data, width, height) {
  if (!data || data.length < 2) return null
  return data
    .map((v, i) => `${((i / (data.length - 1)) * width).toFixed(2)},${(height - (v / 100) * height).toFixed(2)}`)
    .join(' ')
}

function AreaPath({ data, width, height, color }) {
  const pts = toPolyPoints(data, width, height)
  if (!pts) return null
  const areaPoints = `0,${height} ${pts} ${width},${height}`
  return (
    <>
      <polygon points={areaPoints} fill={color} opacity={0.07} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </>
  )
}

function SMAPath({ data, rsiLen, width, height }) {
  // La SMA puede ser más corta que el RSI; la alineamos por la derecha
  if (!data || data.length < 2) return null
  const offset = rsiLen - data.length
  return data.map((v, i) => {
    const x = ((( offset + i) / (rsiLen - 1)) * width).toFixed(2)
    const y = (height - (v / 100) * height).toFixed(2)
    return { x, y }
  }).reduce((acc, pt, i, arr) => {
    if (i === 0) return acc
    const prev = arr[i - 1]
    return acc + `<line x1="${prev.x}" y1="${prev.y}" x2="${pt.x}" y2="${pt.y}" />`
  }, '') // No funciona así en JSX — usamos polyline
}

function SMAPolyline({ data, rsiLen, width, height }) {
  if (!data || data.length < 2) return null
  const offset = rsiLen - data.length
  const pts = data
    .map((v, i) => {
      const x = (((offset + i) / Math.max(rsiLen - 1, 1)) * width).toFixed(2)
      const y = (height - (v / 100) * height).toFixed(2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <polyline
      points={pts}
      fill="none"
      stroke={SMA_COLOR}
      strokeWidth="1"
      strokeDasharray="3,2"
      strokeLinejoin="round"
      opacity={0.6}
    />
  )
}

// Marca visual de cruce: triángulo en el punto donde RSI cruza SMA
function CrossMarkers({ rsiData, smaData, rsiLen, width, height }) {
  if (!rsiData || !smaData || rsiData.length < 2 || smaData.length < 2) return null

  const markers = []
  const offset = rsiLen - smaData.length

  for (let i = 1; i < smaData.length; i++) {
    const ri = offset + i
    if (ri >= rsiData.length) break
    const prevRsi = rsiData[ri - 1]
    const currRsi = rsiData[ri]
    const prevSma = smaData[i - 1]
    const currSma = smaData[i]
    if (prevRsi === null || currRsi === null || prevSma === null || currSma === null) continue

    const crossUp   = prevRsi <= prevSma && currRsi > currSma && currRsi <= 35
    const crossDown = prevRsi >= prevSma && currRsi < currSma && currRsi >= 65

    if (crossUp || crossDown) {
      const x = ((ri / Math.max(rsiLen - 1, 1)) * width)
      const y = height - (currRsi / 100) * height
      const color = crossUp ? '#22c55e' : '#ef4444'
      // Triángulo apuntando hacia arriba (compra) o abajo (venta)
      const size = 5
      const points = crossUp
        ? `${x},${y - size} ${x - size * 0.7},${y + size * 0.4} ${x + size * 0.7},${y + size * 0.4}`
        : `${x},${y + size} ${x - size * 0.7},${y - size * 0.4} ${x + size * 0.7},${y - size * 0.4}`
      markers.push(
        <polygon key={i} points={points} fill={color} opacity={0.9} />
      )
    }
  }
  return <>{markers}</>
}

export default function RSIChart({ coin }) {
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const totalH = H + PAD.top + PAD.bottom

  const y30 = innerH - (30 / 100) * innerH
  const y50 = innerH - (50 / 100) * innerH
  const y70 = innerH - (70 / 100) * innerH

  return (
    <div className="rsi-chart">
      {TIMEFRAMES.map((tf) => {
        const rsiHistory = coin.rsiHistory[tf]
        const smaHistory = coin.smaHistory[tf]
        const current    = coin.rsi[tf]
        const currentSma = coin.sma[tf]
        const color      = TF_COLORS[tf]
        const hasData    = rsiHistory && rsiHistory.length >= 2

        return (
          <div key={tf} className="rsi-chart__row">
            <div className="rsi-chart__tf-label">
              <span style={{ color }}>{tf}</span>
              {current !== null && (
                <span className="rsi-chart__cur" style={{ color }}>
                  {current.toFixed(1)}
                </span>
              )}
              {currentSma !== null && (
                <span className="rsi-chart__sma-val">
                  S:{currentSma.toFixed(1)}
                </span>
              )}
            </div>

            <svg
              viewBox={`0 0 ${W} ${H + PAD.top + PAD.bottom}`}
              preserveAspectRatio="none"
              className="rsi-chart__svg"
            >
              <g transform={`translate(${PAD.left},${PAD.top})`}>
                {/* Zonas */}
                <rect x={0} y={0}   width={innerW} height={y70}            fill="#ef444408" />
                <rect x={0} y={y30} width={innerW} height={innerH - y30}   fill="#22c55e08" />

                {/* Líneas de referencia */}
                <line x1={0} y1={y70} x2={innerW} y2={y70} stroke="#ef4444" strokeWidth="0.6" strokeDasharray="2,2" />
                <line x1={0} y1={y50} x2={innerW} y2={y50} stroke="#374151" strokeWidth="0.5" />
                <line x1={0} y1={y30} x2={innerW} y2={y30} stroke="#22c55e" strokeWidth="0.6" strokeDasharray="2,2" />

                {/* Etiquetas Y */}
                {[['70', y70, '#ef444488'], ['50', y50, '#37415188'], ['30', y30, '#22c55e88']].map(([v, y, c]) => (
                  <text key={v} x={PAD.left - 27} y={y + 3} fontSize={7} fill={c}>{v}</text>
                ))}

                {hasData ? (
                  <>
                    <AreaPath data={rsiHistory} width={innerW} height={innerH} color={color} />
                    <SMAPolyline data={smaHistory} rsiLen={rsiHistory.length} width={innerW} height={innerH} />
                    <CrossMarkers
                      rsiData={rsiHistory}
                      smaData={smaHistory}
                      rsiLen={rsiHistory.length}
                      width={innerW}
                      height={innerH}
                    />
                    {/* Punto actual RSI */}
                    {current !== null && (
                      <circle cx={innerW} cy={innerH - (current / 100) * innerH} r={2.5} fill={color} />
                    )}
                    {/* Punto actual SMA */}
                    {currentSma !== null && (
                      <circle cx={innerW} cy={innerH - (currentSma / 100) * innerH} r={2} fill={SMA_COLOR} opacity={0.8} />
                    )}
                  </>
                ) : (
                  <text x={innerW / 2} y={innerH / 2} textAnchor="middle" fontSize={7} fill="#4b5563">Cargando…</text>
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
            {tf}
          </span>
        ))}
        <span className="rsi-chart__legend-item">
          <span className="rsi-chart__legend-dash">- -</span>
          SMA(14)
        </span>
        <span className="rsi-chart__legend-item rsi-chart__legend-cross-up">▲ cruce alcista</span>
        <span className="rsi-chart__legend-item rsi-chart__legend-cross-down">▼ cruce bajista</span>
      </div>
    </div>
  )
}
