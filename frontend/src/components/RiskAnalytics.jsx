import React from 'react';
import AssistantChat from './AssistantChat';

export default function RiskAnalytics({ risk, train, api, notify }) {
  const getRiskClass = (score) => {
    if (score >= 35) return 'high';
    if (score >= 25) return 'medium';
    return 'safe';
  };

  const getRiskLabel = (score) => {
    if (score >= 35) return 'Critical Risk';
    if (score >= 25) return 'Moderate Risk';
    return 'Safe';
  };

  return (
    <div className="intelligence-grid fade-in">
      <section className="panel risk-panel-container">
        <div className="panel-title">
          <div>
            <span className="eyebrow">EXPLAINABLE ML</span>
            <h2>Early Intervention Queue</h2>
          </div>
          <button className="secondary" onClick={train}>
            Refresh Baseline
          </button>
        </div>

        <div className="risk-queue-list">
          {risk.map((s) => {
            const riskClass = getRiskClass(s.risk_score);
            return (
              <div className={`risk-card-item ${riskClass}`} key={s.id}>
                <span className={`risk-dot ${riskClass}`} />
                <div className="risk-card-user">
                  <strong>{s.first_name} {s.last_name}</strong>
                  <small>{s.campus_name} · {s.department}</small>
                </div>
                <div className="risk-stat">
                  <small>Attendance</small>
                  <strong className={s.attendance < 75 ? 'danger-text' : ''}>{s.attendance}%</strong>
                </div>
                <div className="risk-stat">
                  <small>CGPA</small>
                  <strong>{s.cgpa}</strong>
                </div>
                <div className="risk-badge-wrapper">
                  <span className={`risk-score-pill ${riskClass}`}>
                    {getRiskLabel(s.risk_score)} · {s.risk_score}
                  </span>
                </div>
              </div>
            );
          })}
          {!risk.length && (
            <p className="muted text-center">No students are currently above the intervention threshold.</p>
          )}
        </div>
      </section>

      <AssistantChat api={api} notify={notify} />
    </div>
  );
}
