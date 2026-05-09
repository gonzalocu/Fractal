import { TIMEFRAMES } from '../hooks/useCryptoRSI'

const H = 72          // altura del área de trazado
const W = 100         // porcentaje del ancho (viewBox usa 0-100 en X)
const PAD = { top: 6, bottom: 14, left: 24, right: 4 }

const TF_COLORS = { '1m': '#6366f1', '5m': '#f59e0b', '15m': '#22c55e' }

function toPoints(data, width, height) {
  if (!data || data.length < 2) return null
  const xs = data.map((_, i) => (i / (data.length - 1)) * width)
  const ys = data.map((v) => height - ((v / 100) * height))
  return xs.map((x, i) => `${x.toFixed(2)},${ys[i].toFixed(2)}`).join(' ')
}

function AreaPath({ data, width, height, color }) {
  const pts = toPoints(data, width, height)
  if (!pts) return null
  // polyline primero, después un polígono relleno muy transparente
  const firstX = 0
  const lastX = width.toFixed(2)
  const bottomY = height.toFixed(2)
  const areaPoints = `${firstX},${bottomY} ${pts} ${lastX},${bottomY}`
  return (
    <>
      <polygon points={areaPoints} fill={color} opacity={0.07} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </>
  )
}

function YLabel({ value, y, color }) {
  return (
    <text x={PAD.left - 3} y={y + 3} textAnchor="end" fontSize={7} fill={color}>
      {value}
    </text>
  )
}

export default function RSIChart({ coin }) {
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // Líneas de referencia en y para RSI 30 y 70
  const y30 = innerH - (30 / 100) * innerH
  const y70 = innerH - (70 / 100) * innerH
  const y50 = innerH - (50 / 100) * innerH

  const totalW = W
  const totalH = H + PAD.top + PAD.bottom

  return (
    <div className="rsi-chart">
      {TIMEFRAMES.map((tf) => {
        const history = coin.rsiHistory[tf]
        const current = coin.rsi[tf]
        const color = TF_COLORS[tf]
        const hasData = history && history.length >= 2

        return (
          <div key={tf} className="rsi-chart__row">
            <span className="rsi-chart__tf-label" style={{ color }}>
              {tf}
              {current !== null && (
                <span className="rsi-chart__cur" style={{ color }}>
                  {' '}{current.toFixed(1)}
                </span>
              )}
            </span>

            <svg
              viewBox={`0 0 ${totalW} ${totalH}`}
              preserveAspectRatio="none"
              className="rsi-chart__svg"
            >
              <g transform={`translate(${PAD.left},${PAD.top})`}>
                {/* Área de fondo para zonas */}
                <rect x={0} y={0} width={innerW} height={y70} fill="#ef444408" />
                <rect x={0} y={y30} width={innerW} height={innerH - y30} fill="#22c55e08" />

                {/* Líneas de referencia */}
                <line x1={0} y1={y70} x2={innerW} y2={y70} stroke="#ef4444" strokeWidth="0.6" strokeDasharray="2,2" />
                <line x1={0} y1={y50} x2={innerW} y2={y50} stroke="#374151" strokeWidth="0.5" />
                <line x1={0} y1={y30} x2={innerW} y2={y30} stroke="#22c55e" strokeWidth="0.6" strokeDasharray="2,2" />

                {/* Etiquetas Y */}
                <YLabel value="70" y={y70} color="#ef444488" />
                <YLabel value="50" y={y50} color="#37415188" />
                <YLabel value="30" y={y30} color="#22c55e88" />

                {/* Datos */}
                {hasData ? (
                  <AreaPath data={history} width={innerW} height={innerH} color={color} />
                ) : (
                  <text x={innerW / 2} y={innerH / 2} textAnchor="middle" fontSize={7} fill="#4b5563">
                    Cargando…
                  </text>
                )}

                {/* Punto actual */}
                {hasData && current !== null && (() => {
                  const cy = innerH - (current / 100) * innerH
                  return <circle cx={innerW} cy={cy} r={2.5} fill={color} />
                })()}
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
        <span className="rsi-chart__legend-item" style={{ color: '#ef444488' }}>— 70</span>
        <span className="rsi-chart__legend-item" style={{ color: '#22c55e88' }}>— 30</span>
      </div>
    </div>
  )
}
