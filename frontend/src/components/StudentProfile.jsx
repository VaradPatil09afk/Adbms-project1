import React, { useState, useEffect } from 'react';
import { BookOpen, BarChart3, Activity, ShieldAlert, Award, Calendar, Layers, TrendingUp } from 'lucide-react';

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

export default function StudentProfile({ data, api }) {
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (data?.profile?.id && api) {
      setHistoryLoading(true);
      api(`/api/students/${data.profile.id}/history`)
        .then((res) => setHistoryData(res))
        .catch((err) => console.warn('Could not load student history', err))
        .finally(() => setHistoryLoading(false));
    }
  }, [data?.profile?.id]);

  if (!data?.profile) {
    return <div className="loading">Loading your secure academic profile...</div>;
  }

  const p = data.profile;
  const summary = data.summary || {};
  const enrollments = data.enrollments || [];

  return (
    <div className="profile-view fade-in flex-column gap-20">
      <div className="metrics-grid">
        <MetricCard icon={BookOpen} label="Courses Enrolled" value={summary.courses_enrolled} accent="blue" />
        <MetricCard icon={BarChart3} label="Courses Graded" value={summary.courses_graded} accent="violet" />
        <MetricCard icon={Activity} label="Average Score" value={summary.average_score ? `${summary.average_score}/100` : 'Pending'} accent="green" />
        <MetricCard
          icon={ShieldAlert}
          label="Attendance Rate"
          value={`${p.attendance}%`}
          accent={p.attendance < 75 ? 'red' : 'green'}
        />
      </div>

      {/* Main Student Header Card */}
      <section className="panel">
        <div className="panel-title flex-between flex-wrap gap-12">
          <div>
            <span className="eyebrow">ACADEMIC PROFILE RECORD</span>
            <h2>{p.first_name} {p.last_name}</h2>
            <p className="muted">
              Roll No: <strong>{p.roll_no}</strong> · {p.department} · Year {p.year} · CGPA <strong>{p.cgpa}</strong>
            </p>
          </div>
          <span className="badge-status online"><Award size={14} /> Active Enrollment</span>
        </div>

        {/* Multi-Year Academic History & Progression Section */}
        <div className="student-history-section margin-top-20">
          <div className="section-title-bar flex-align gap-6 margin-bottom-12">
            <Calendar size={18} className="text-accent" />
            <h3>Year-by-Year Academic History & Performance Progression</h3>
          </div>

          {historyLoading ? (
            <div className="loading padding-16">Loading your multi-year academic progression...</div>
          ) : historyData?.history && historyData.history.length > 0 ? (
            <div className="history-cards-list">
              {historyData.history.map((item) => (
                <div key={item.id} className="history-term-card">
                  <div className="term-header flex-between">
                    <span className="term-name font-bold">{item.semester}</span>
                    <span className="term-gpa-badge">GPA: {item.gpa}</span>
                  </div>

                  <div className="term-details-grid margin-top-8">
                    <div className="term-stat">
                      <small>ATTENDANCE</small>
                      <strong>{item.attendance}%</strong>
                    </div>
                    <div className="term-stat">
                      <small>CREDITS</small>
                      <strong>{item.credits_completed} CR</strong>
                    </div>
                    <div className="term-stat">
                      <small>PROJECTS</small>
                      <strong>{item.projects_completed} Completed</strong>
                    </div>
                  </div>

                  {item.remarks && (
                    <div className="term-remarks margin-top-8">
                      <small className="muted">Faculty Remarks:</small>
                      <p>{item.remarks}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-history-box padding-16 muted border-subtle">
              <p>Academic history initialized. Semester progression cards will populate at end of term.</p>
            </div>
          )}
        </div>

        {/* Current Enrolled Courses Table */}
        <div className="margin-top-24">
          <h3 className="margin-bottom-12 flex-align gap-6">
            <Layers size={16} /> Current Semester Course Grades
          </h3>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Instructor / Faculty</th>
                  <th>Semester</th>
                  <th>Grade Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="table-user-cell">
                        <strong>{e.course_code}</strong>
                        <span className="roll-badge">{e.course_title}</span>
                      </div>
                    </td>
                    <td>{e.faculty_name || 'To be assigned'}</td>
                    <td>{e.semester}</td>
                    <td>
                      <span className={`risk-score-pill ${e.grade ? 'safe' : 'high'}`}>
                        {e.grade ? `Grade ${e.grade}` : 'In Progress'}
                      </span>
                    </td>
                    <td><strong>{e.score ?? '—'}</strong></td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center muted">
                      No active course enrollments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
