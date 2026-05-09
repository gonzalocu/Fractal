const ZONE_STYLE = {
  overbought: { icon: '🔴', label: 'Sobrecompra', cls: 'alert-item--overbought' },
  oversold: { icon: '🟢', label: 'Sobreventa', cls: 'alert-item--oversold' },
}

export default function AlertPanel({ alerts, onClear }) {
  if (alerts.length === 0) {
    return (
      <div className="alert-panel alert-panel--empty">
        <p>Sin alertas aún. Las alertas aparecen cuando el RSI entra en zona de sobrecompra (&gt;70) o sobreventa (&lt;30).</p>
      </div>
    )
  }

  return (
    <div className="alert-panel">
      <div className="alert-panel__header">
        <span>{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</span>
        <button className="btn-clear" onClick={onClear}>
          Limpiar
        </button>
      </div>
      <ul className="alert-list">
        {alerts.map((a) => {
          const z = ZONE_STYLE[a.zone]
          return (
            <li key={a.id} className={`alert-item ${z.cls}`}>
              <span className="alert-item__icon">{z.icon}</span>
              <div className="alert-item__body">
                <span className="alert-item__title">
                  {a.label} <strong>{a.tf}</strong> — RSI {a.rsi}
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
