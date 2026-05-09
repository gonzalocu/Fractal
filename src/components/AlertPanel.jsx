const ZONE_STYLE = {
  overbought:          { icon: '🔴', label: 'Sobrecompra',      cls: 'alert-item--overbought' },
  oversold:            { icon: '🟢', label: 'Sobreventa',        cls: 'alert-item--oversold'   },
  cross_up:            { icon: '▲',  label: 'Cruce alcista SMA', cls: 'alert-item--cross-up'   },
  cross_down:          { icon: '▼',  label: 'Cruce bajista SMA', cls: 'alert-item--cross-down' },
}

export default function AlertPanel({ alerts, onClear }) {
  if (alerts.length === 0) {
    return (
      <div className="alert-panel alert-panel--empty">
        <p>Sin alertas aún. Se generan cuando el RSI entra en zona extrema o cuando cruza la SMA(9) en sobrecompra/sobreventa.</p>
      </div>
    )
  }

  return (
    <div className="alert-panel">
      <div className="alert-panel__header">
        <span>{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</span>
        <button className="btn-clear" onClick={onClear}>Limpiar</button>
      </div>
      <ul className="alert-list">
        {alerts.map((a) => {
          const z = ZONE_STYLE[a.zone] ?? ZONE_STYLE.oversold
          return (
            <li key={a.id} className={`alert-item ${z.cls}`}>
              <span className="alert-item__icon">{z.icon}</span>
              <div className="alert-item__body">
                <span className="alert-item__title">
                  {a.label} <strong>{a.tf}</strong> — RSI {a.rsi}
                  {a.sma && <span className="alert-item__sma"> / SMA {a.sma}</span>}
                </span>
                <span className="alert-item__meta">
                  {z.label}{a.fractality ? ' · ⚡ Fractalidad' : ''} · {a.time}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
