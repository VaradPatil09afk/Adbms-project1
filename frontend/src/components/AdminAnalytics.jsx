import React, { useState } from 'react';
import { Users, BookOpen, BarChart3, ShieldAlert, Award, Layers, PieChart, Activity } from 'lucide-react';

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

export default function AdminAnalytics({ overview }) {
  const [activeTab, setActiveTab] = useState('all');

  if (!overview) {
    return <div className="loading">Loading analytics engine...</div>;
  }

  const maxStudents = Math.max(...(overview.by_campus?.map((c) => c.students) || [1]), 1);

  return (
    <div className="analytics-view fade-in">
      <div className="metrics-grid">
        <MetricCard icon={Users} label="Active Students" value={overview.students} accent="blue" />
        <MetricCard icon={BookOpen} label="Courses" value={overview.courses} accent="violet" />
        <MetricCard icon={BarChart3} label="Average CGPA" value={overview.average_cgpa} accent="green" />
        <MetricCard icon={ShieldAlert} label="At-Risk Students" value={overview.at_risk} accent="red" />
      </div>

      <div className="chart-tabs-bar">
        <button
          className={`chart-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={15} /> All Charts Overview
        </button>
        <button
          className={`chart-tab-btn ${activeTab === 'campus' ? 'active' : ''}`}
          onClick={() => setActiveTab('campus')}
        >
          <BarChart3 size={15} /> Campus Distribution
        </button>
        <button
          className={`chart-tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <Award size={15} /> Performance Index
        </button>
        <button
          className={`chart-tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          <PieChart size={15} /> Department & Cohorts
        </button>
        <button
          className={`chart-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Activity size={15} /> Branch Attendance
        </button>
      </div>

      {(activeTab === 'all' || activeTab === 'campus') && (
        <section className="panel chart-panel fade-in">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ADMIN ANALYTICS</span>
              <h2>Enrollment by Branch / Campus</h2>
            </div>
            <span className="badge low">Real-time DB Sync</span>
          </div>

          <div className="admin-chart-container">
            {overview.by_campus?.map((c) => {
              const heightPercent = Math.max(15, (c.students / maxStudents) * 100);
              return (
                <div className="chart-column" key={c.code}>
                  <span className="count-label">{c.students} Students</span>
                  <div className="column-bar-wrapper">
                    <div
                      className="column-bar"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <strong className="code-label">{c.code}</strong>
                  <small className="muted">{c.attendance || 0}% attendance</small>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(activeTab === 'all' || activeTab === 'performance') && (
        <section className="panel chart-panel fade-in">
          <div className="panel-title">
            <div>
              <span className="eyebrow">STUDENT PERFORMANCE</span>
              <h2>Performance Index by Student</h2>
              <p className="muted">Weighted metric: 60% CGPA · 40% Attendance</p>
            </div>
            <span className="badge-status online"><Award size={14} /> Ranked Index</span>
          </div>

          <div className="student-performance-list">
            {overview.student_performance?.map((s) => (
              <div className="student-perf-item" key={s.id}>
                <div className="student-meta">
                  <strong>{s.name}</strong>
                  <small>{s.roll_no} · {s.campus_code}</small>
                </div>

                <div className="perf-bar-track">
                  <div
                    className="perf-bar-fill"
                    style={{ width: `${s.performance_index}%` }}
                  />
                </div>

                <div className="perf-score">
                  <strong>{s.performance_index}</strong>
                  <small>CGPA {s.cgpa} · {s.attendance}%</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeTab === 'all' || activeTab === 'breakdown') && (
        <div className="two-panels-grid fade-in">
          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">STUDENT PERFORMANCE</span>
                <h2>Performance by Academic Year</h2>
              </div>
            </div>
            <div className="breakdown-list">
              {overview.by_year?.map((y) => (
                <div className="breakdown-row" key={y.year}>
                  <div className="row-info">
                    <strong>Year {y.year} Cohort</strong>
                    <small>{y.students} Students</small>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, (y.average_cgpa / 10) * 100)}%` }}
                    />
                  </div>
                  <div className="row-stats">
                    <span>Avg Score <strong>{y.average_cgpa}</strong></span>
                    <small>{y.attendance}% attendance</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">DEPARTMENT METRICS</span>
                <h2>Performance by Department</h2>
              </div>
            </div>
            <div className="breakdown-list">
              {overview.by_department?.map((dept) => (
                <div className="breakdown-row" key={dept.department}>
                  <div className="row-info">
                    <strong>{dept.department}</strong>
                    <small>{dept.students} Students</small>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, (dept.average_cgpa / 10) * 100)}%` }}
                    />
                  </div>
                  <div className="row-stats">
                    <span>Avg CGPA <strong>{dept.average_cgpa}</strong></span>
                    <small>{dept.attendance}% attendance</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'attendance') && (
        <section className="panel chart-panel fade-in">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ACADEMIC HEALTH</span>
              <h2>Attendance Comparison by Branch</h2>
            </div>
          </div>
          <div className="breakdown-list">
            {overview.by_campus?.map((c) => (
              <div className="breakdown-row" key={c.code}>
                <div className="row-info">
                  <strong>{c.name}</strong>
                  <small>CGPA {c.average_cgpa || '—'}</small>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill green"
                    style={{ width: `${c.attendance || 0}%` }}
                  />
                </div>
                <div className="row-stats">
                  <strong>{c.attendance || 0}%</strong>
                  <small>Branch Avg</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
