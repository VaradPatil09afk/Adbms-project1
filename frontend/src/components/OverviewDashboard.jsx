import { Users, BookOpen, BarChart3, ShieldAlert, Radio, Sparkles } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${accent || 'blue'}`}>
        <Icon size={20} />
      </div>
      <div className="metric-data">
        <small>{label}</small>
        <strong>{value ?? '—'}</strong>
      </div>
    </article>
  );
}

export default function OverviewDashboard({ overview, onOpenWizard, canManageAdmin }) {
  if (!overview) {
    return <div className="loading">Loading intelligence hub data...</div>;
  }

  return (
    <div className="overview-container fade-in">
      <div className="metrics-grid">
        <MetricCard icon={Users} label="Total Active Students" value={overview.students} accent="blue" />
        <MetricCard icon={BookOpen} label="Course Catalog" value={overview.courses} accent="violet" />
        <MetricCard icon={BarChart3} label="System Average CGPA" value={overview.average_cgpa} accent="green" />
        <MetricCard icon={ShieldAlert} label="At-Risk Students" value={overview.at_risk} accent="red" />
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CENTRAL OLTP PROJECTION</span>
            <h2>Campus Performance & Synchronization</h2>
          </div>
          <div className="flex-align gap-12">
            {canManageAdmin && onOpenWizard && (
              <button className="primary flex-align gap-6" onClick={onOpenWizard}>
                <Sparkles size={15} /> 1-Click Campus Wizard
              </button>
            )}
            <span className="live-status">
              <Radio size={14} className="pulse" /> Sync Lag: {overview.sync_lag_seconds}s
            </span>
          </div>
        </div>

        <div className="campus-performance-grid">
          {overview.by_campus?.map((c) => (
            <div key={c.code} className="campus-perf-card">
              <div className="campus-perf-header">
                <span className="campus-code-tag">{c.code}</span>
                <h3>{c.name}</h3>
              </div>

              <div className="campus-metrics-list">
                <div className="metric-row">
                  <span className="metric-label">Students</span>
                  <strong className="metric-value">{c.students}</strong>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Avg. CGPA</span>
                  <strong className="metric-value">{c.average_cgpa || '—'}</strong>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Attendance Rate</span>
                  <strong className="metric-value">{c.attendance || 0}%</strong>
                </div>
              </div>

              <div className="campus-progress-bar">
                <div className="campus-progress-fill" style={{ width: `${c.attendance || 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
