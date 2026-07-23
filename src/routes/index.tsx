import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Chart, Doughnut, Line } from 'react-chartjs-2'
import {
  Activity,
  ArrowUpRight,
  AudioWaveform,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Command,
  Gauge,
  Gem,
  Menu,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { getDashboardData } from '../server/dashboard.functions'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Filler,
)

export const Route = createFileRoute('/')({
  loader: () => getDashboardData(),
  component: Dashboard,
})

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const chartGrid = 'rgba(255, 255, 255, 0.07)'
const chartTicks = '#7f8493'

function percentChange(current: number, previous: number) {
  return ((current - previous) / previous) * 100
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value))
}

function Dashboard() {
  const { metrics, activity } = Route.useLoaderData()
  const [mounted, setMounted] = useState(false)
  const [range, setRange] = useState<7 | 14>(14)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const visibleMetrics = metrics.slice(-range)
  const latest = metrics.at(-1)!
  const previous = metrics.at(-2)!
  const totalRevenue = visibleMetrics.reduce(
    (sum, point) => sum + point.revenueCents,
    0,
  )
  const totalValue = visibleMetrics.reduce(
    (sum, point) => sum + point.valueCreatedCents,
    0,
  )

  const labels = visibleMetrics.map((point) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${point.recordedOn}T00:00:00Z`)),
  )

  const revenueChart = useMemo(
    () => ({
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Captured revenue',
          data: visibleMetrics.map((point) => point.revenueCents / 100_000_000),
          backgroundColor: '#ff6b2c',
          hoverBackgroundColor: '#ff8a57',
          borderRadius: 7,
          borderSkipped: false,
          barPercentage: 0.58,
        },
        {
          type: 'line' as const,
          label: 'Value created',
          data: visibleMetrics.map(
            (point) => point.valueCreatedCents / 100_000_000,
          ),
          borderColor: '#d8ff3e',
          backgroundColor: 'rgba(216, 255, 62, 0.13)',
          pointBackgroundColor: '#0d0e11',
          pointBorderColor: '#d8ff3e',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.38,
          fill: true,
        },
      ],
    }),
    [labels, visibleMetrics],
  )

  const conversionChart = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: visibleMetrics.map((point) => point.conversions),
          borderColor: '#a979ff',
          backgroundColor: 'rgba(169, 121, 255, 0.14)',
          pointBackgroundColor: '#a979ff',
          pointRadius: 2.5,
          pointHoverRadius: 5,
          tension: 0.42,
          fill: true,
        },
      ],
    }),
    [labels, visibleMetrics],
  )

  const channelChart = {
    labels: ['Autonomous', 'Enterprise', 'Partner', 'Organic'],
    datasets: [
      {
        data: [48, 27, 16, 9],
        backgroundColor: ['#d8ff3e', '#ff6b2c', '#a979ff', '#26d9ff'],
        borderColor: '#111216',
        borderWidth: 6,
        hoverOffset: 5,
      },
    ],
  }

  const cards = [
    {
      eyebrow: 'Value created today',
      value: money.format(latest.valueCreatedCents / 100),
      change: percentChange(latest.valueCreatedCents, previous.valueCreatedCents),
      detail: `${money.format(totalValue / 100)} across ${range} days`,
      icon: Gem,
      tone: 'acid',
    },
    {
      eyebrow: 'Revenue captured',
      value: money.format(latest.revenueCents / 100),
      change: percentChange(latest.revenueCents, previous.revenueCents),
      detail: `${money.format(totalRevenue / 100)} confirmed`,
      icon: CircleDollarSign,
      tone: 'orange',
    },
    {
      eyebrow: 'Signals processed',
      value: compact.format(latest.processedSignals),
      change: percentChange(latest.processedSignals, previous.processedSignals),
      detail: `${compact.format(latest.processedSignals / 86400)}/sec average`,
      icon: AudioWaveform,
      tone: 'violet',
    },
    {
      eyebrow: 'Engine precision',
      value: `${(latest.accuracyBasisPoints / 100).toFixed(1)}%`,
      change: 0.1,
      detail: `${latest.latencyMs}ms decision latency`,
      icon: Target,
      tone: 'cyan',
    },
  ]

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-mark"><Command size={21} strokeWidth={2.6} /></div>
        <nav className="side-nav" aria-label="Primary navigation">
          <button className="nav-button active" aria-label="Command center"><Gauge /></button>
          <button className="nav-button" aria-label="Engine activity"><Activity /></button>
          <button className="nav-button" aria-label="Systems"><Boxes /></button>
          <button className="nav-button" aria-label="Value intelligence"><Gem /></button>
        </nav>
        <div className="sidebar-foot">
          <div className="live-orb" title="Engine online" />
          <button className="avatar" aria-label="Account menu">NK</button>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <section className="dashboard-frame">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X /> : <Menu />}
            </button>
            <div>
              <span className="system-kicker">NOSIE / CONVERSION ENGINE</span>
              <h1>Value Command</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="status-pill"><span /> ENGINE LIVE · 99.99%</div>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="operator-button">Operator <ChevronDown size={15} /></button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="hero-row">
            <div>
              <div className="eyebrow-row">
                <span className="eyebrow">THURSDAY · JUL 23, 2026</span>
                <span className="freshness"><RefreshCw size={12} /> LIVE DATABASE</span>
              </div>
              <h2>Ridiculous output.<br /><span>Measured precisely.</span></h2>
              <p>Every signal, conversion, and dollar of created value—resolved into one uncompromising view.</p>
            </div>
            <div className="range-control" aria-label="Chart range">
              <button className={range === 7 ? 'selected' : ''} onClick={() => setRange(7)}>7D</button>
              <button className={range === 14 ? 'selected' : ''} onClick={() => setRange(14)}>14D</button>
            </div>
          </section>

          <section className="metric-grid">
            {cards.map((card) => (
              <article className={`metric-card metric-${card.tone}`} key={card.eyebrow}>
                <div className="metric-card-head">
                  <span>{card.eyebrow}</span>
                  <div className="metric-icon"><card.icon size={18} /></div>
                </div>
                <strong>{card.value}</strong>
                <div className="metric-foot">
                  <span className="metric-change"><TrendingUp size={13} /> +{card.change.toFixed(1)}%</span>
                  <span>{card.detail}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="primary-grid">
            <article className="panel revenue-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">VALUE VELOCITY</span>
                  <h3>Revenue vs. created value</h3>
                </div>
                <div className="chart-legend">
                  <span><i className="legend-orange" />Revenue</span>
                  <span><i className="legend-acid" />Created value</span>
                </div>
              </div>
              <div className="chart-large">
                {mounted ? (
                  <Chart
                    type="bar"
                    data={revenueChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { intersect: false, mode: 'index' },
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#202126', padding: 12, cornerRadius: 8 } },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: chartTicks, font: { size: 10 } }, border: { display: false } },
                        y: { grid: { color: chartGrid }, ticks: { color: chartTicks, callback: (value) => `$${value}m` }, border: { display: false } },
                      },
                    }}
                  />
                ) : <div className="chart-skeleton" />}
              </div>
            </article>

            <article className="panel worth-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">CURRENT WORTH</span>
                  <h3>Value composition</h3>
                </div>
                <Sparkles className="panel-spark" size={20} />
              </div>
              <div className="worth-chart-wrap">
                {mounted ? (
                  <Doughnut
                    data={channelChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '76%',
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#202126', padding: 10 } },
                    }}
                  />
                ) : <div className="donut-skeleton" />}
                <div className="worth-center"><span>NET VALUE</span><strong>{money.format(totalValue / 100)}</strong><small>+86.2% velocity</small></div>
              </div>
              <div className="composition-list">
                {channelChart.labels.map((label, index) => (
                  <div key={label}><span><i style={{ backgroundColor: channelChart.datasets[0].backgroundColor[index] }} />{label}</span><strong>{channelChart.datasets[0].data[index]}%</strong></div>
                ))}
              </div>
            </article>
          </section>

          <section className="secondary-grid">
            <article className="panel conversion-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">CONVERSION MOMENTUM</span>
                  <h3>{compact.format(latest.conversions)} decisions converted</h3>
                </div>
                <span className="delta-badge"><ArrowUpRight size={13} /> {percentChange(latest.conversions, previous.conversions).toFixed(1)}%</span>
              </div>
              <div className="chart-medium">
                {mounted ? (
                  <Line
                    data={conversionChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#202126', padding: 10 } },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: chartTicks, font: { size: 10 } }, border: { display: false } },
                        y: { display: false },
                      },
                    }}
                  />
                ) : <div className="chart-skeleton" />}
              </div>
            </article>

            <article className="panel health-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">ENGINE VITALS</span>
                  <h3>Operational supremacy</h3>
                </div>
                <ShieldCheck className="panel-spark" size={20} />
              </div>
              <div className="vital-list">
                <div><span><Radio />Uptime</span><strong>{(latest.uptimeBasisPoints / 100).toFixed(2)}%</strong><i><b style={{ width: '99.99%' }} /></i></div>
                <div><span><TimerReset />Decision speed</span><strong>{latest.latencyMs}ms</strong><i><b style={{ width: '92%' }} /></i></div>
                <div><span><Zap />Compute efficiency</span><strong>96.4%</strong><i><b style={{ width: '96.4%' }} /></i></div>
              </div>
              <div className="health-callout"><span><span className="pulse-dot" /> NO CRITICAL ANOMALIES</span><small>All inference cells nominal</small></div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-head">
                <div>
                  <span className="panel-kicker">LIVE ACTIVITY</span>
                  <h3>Value events</h3>
                </div>
                <button className="text-button">View all <ArrowUpRight size={13} /></button>
              </div>
              <div className="activity-list">
                {activity.map((event) => (
                  <div className="activity-item" key={event.id}>
                    <span className={`activity-signal signal-${event.accent}`} />
                    <div><span>{event.category} · {formatTime(event.occurredAt)} UTC</span><strong>{event.title}</strong><p>{event.detail}</p></div>
                    <em>+{money.format(event.impactCents / 100)}</em>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  )
}
