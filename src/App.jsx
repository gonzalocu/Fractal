import { useState } from 'react'
import { useCryptoRSI } from './hooks/useCryptoRSI'
import CryptoCard from './components/CryptoCard'
import AlertPanel from './components/AlertPanel'

const CONN_LABELS = {
  connecting: { text: '⟳ Conectando…', cls: 'conn-status--connecting' },
  connected:  { text: '● En vivo',     cls: 'conn-status--connected'  },
  error:      { text: '✕ Sin datos',   cls: 'conn-status--error'      },
}

export default function App() {
  const { coins, alerts, clearAlerts, requestNotifications, notificationPermission, connStatus } =
    useCryptoRSI()
  const [tab, setTab]           = useState('dashboard')
  const [showCharts, setShowCharts] = useState(false)
  const conn = CONN_LABELS[connStatus] ?? CONN_LABELS.connecting

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <span className="app-header__logo">◈</span>
            <div>
              <h1 className="app-header__title">Crypto RSI Alerts</h1>
              <p className="app-header__sub">Top 20 criptomonedas · RSI en tiempo real</p>
            </div>
          </div>

          <div className="app-header__right">
            <span className={`conn-status ${conn.cls}`}>{conn.text}</span>
            {notificationPermission === 'default' && (
              <button className="btn-notify" onClick={requestNotifications}>🔔 Activar notificaciones</button>
            )}
            {notificationPermission === 'granted' && (
              <span className="notify-status notify-status--on">🔔 Activo</span>
            )}
            {notificationPermission === 'denied' && (
              <span className="notify-status notify-status--off">🔕 Bloqueado</span>
            )}
          </div>
        </div>

        <nav className="app-nav">
          <button
            className={`app-nav__tab ${tab === 'dashboard' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`app-nav__tab ${tab === 'alerts' ? 'app-nav__tab--active' : ''}`}
            onClick={() => setTab('alerts')}
          >
            Alertas
            {alerts.length > 0 && <span className="app-nav__badge">{alerts.length}</span>}
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && (
          <>
            <div className="dashboard-toolbar">
              <div className="legend">
                <span className="legend__item legend__item--oversold">RSI &lt; 30 Sobreventa</span>
                <span className="legend__item legend__item--neutral">30–70 Neutral</span>
                <span className="legend__item legend__item--overbought">RSI &gt; 70 Sobrecompra</span>
                <span className="legend__item legend__item--fractal">⚡ Fractalidad: 2+ TF alineados</span>
              </div>
              <button
                className={`btn-charts-global ${showCharts ? 'btn-charts-global--active' : ''}`}
                onClick={() => setShowCharts((v) => !v)}
              >
                {showCharts ? '▴ Ocultar gráficas' : '▾ Ver gráficas RSI'}
              </button>
            </div>

            <div className="card-grid">
              {coins.map((coin) => (
                <CryptoCard key={coin.id} coin={coin} showChart={showCharts} />
              ))}
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <AlertPanel alerts={alerts} onClear={clearAlerts} />
        )}
      </main>

      <footer className="app-footer">
        Datos en tiempo real vía Binance REST + WebSocket · RSI 14 periodos · SMA 14 · 1m / 5m / 15m
        {connStatus === 'error' && <span className="footer-warn"> — Reintentando conexión…</span>}
      </footer>
    </div>
  )
}
