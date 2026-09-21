import React from 'react';
import { BookOpen, Users, Activity, BarChart3, Building2, CheckCircle2 } from 'lucide-react';

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

export default function FacultyProfile({ data }) {
  if (!data) {
    return <div className="loading">Loading teaching performance profile...</div>;
  }

  const { profile: p, summary: s, courses = [], by_year = [], by_department = [] } = data;

  return (
    <div className="faculty-profile-view fade-in">
      <div className="metrics-grid">
        <MetricCard icon={BookOpen} label="Assigned Courses" value={s.courses_taught} accent="blue" />
        <MetricCard icon={Users} label="Total Students Taught" value={s.students_taught} accent="violet" />
        <MetricCard icon={Activity} label="Grades Submitted" value={s.graded} accent="green" />
        <MetricCard
          icon={BarChart3}
          label="Average Class Score"
          value={s.average_score ? `${s.average_score}/100` : 'Pending'}
          accent="red"
        />
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">FACULTY TEACHING PROFILE</span>
            <h2>{p?.name}</h2>
            <p className="muted">
              {p?.department} Department · {p?.campus_name}
            </p>
          </div>
          <span className="badge-status online"><CheckCircle2 size={14} /> Active Faculty</span>
        </div>

        <div className="course-performance-list">
          {courses.map((c) => (
            <div className="course-perf-card" key={c.id}>
              <div className="course-perf-header">
                <span className="code-tag">{c.code}</span>
                <h4>{c.title}</h4>
              </div>
              <div className="course-perf-stats">
                <div>
                  <small>Students Enrolled</small>
                  <strong>{c.student_count}</strong>
                </div>
                <div>
                  <small>Grades Submitted</small>
                  <strong>{c.graded_count} / {c.student_count}</strong>
                </div>
                <div>
                  <small>Avg. Score</small>
                  <strong>{c.average_score ?? 'N/A'}</strong>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="muted text-center">No assigned courses found for this faculty member.</p>
          )}
        </div>
      </section>

      <div className="two-panels-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">STUDENT PERFORMANCE</span>
              <h2>Performance by Academic Year</h2>
            </div>
          </div>
          <div className="breakdown-list">
            {by_year.map((r) => (
              <div className="breakdown-row" key={r.year}>
                <div className="row-info">
                  <strong>Year {r.year} Cohort</strong>
                  <small>{r.students} Enrolled Students</small>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, ((r.average_score || r.average_cgpa * 10 || 0)))}%` }}
                  />
                </div>
                <div className="row-stats">
                  <span>Avg Score <strong>{r.average_score ?? '—'}</strong></span>
                  <small>CGPA {r.average_cgpa}</small>
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
            {by_department.map((r) => (
              <div className="breakdown-row" key={r.department}>
                <div className="row-info">
                  <strong>{r.department}</strong>
                  <small>{r.students} Enrolled Students</small>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, ((r.average_score || r.average_cgpa * 10 || 0)))}%` }}
                  />
                </div>
                <div className="row-stats">
                  <span>Avg Score <strong>{r.average_score ?? '—'}</strong></span>
                  <small>CGPA {r.average_cgpa}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
