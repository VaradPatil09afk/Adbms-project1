import React, { useState } from 'react';
import { Bot, Send, ShieldCheck, Sparkles } from 'lucide-react';

export default function AssistantChat({ api, notify }) {
  const [question, setQuestion] = useState('Which students are at risk?');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    try {
      const data = await api('/api/assistant/query', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      setResult(data);
    } catch (err) {
      if (notify) notify('Assistant error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="assistant-container">
      <section className="panel assistant-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">SAFE READ-ONLY NLP ENGINE</span>
            <h2>UniBase Intelligence Assistant</h2>
            <p className="muted">Parameterized intent queries against distributed document & graph projections.</p>
          </div>
          <div className="safe-badge flex-align">
            <ShieldCheck size={16} /> Read-Only Sandbox
          </div>
        </div>

        <form onSubmit={handleAsk} className="assistant-input-box">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about students at risk, prerequisites, or campus metrics..."
            disabled={busy}
          />
          <button type="submit" className="primary flex-align" disabled={busy}>
            <Send size={16} /> {busy ? 'Thinking...' : 'Query'}
          </button>
        </form>

        <div className="quick-prompts">
          <small>Suggested Queries:</small>
          <button type="button" className="prompt-chip" onClick={() => { setQuestion('Which students are at risk?'); }}>
            <Sparkles size={12} /> Students at risk
          </button>
          <button type="button" className="prompt-chip" onClick={() => { setQuestion('Show database systems courses'); }}>
            <Sparkles size={12} /> Database courses
          </button>
          <button type="button" className="prompt-chip" onClick={() => { setQuestion('Tell me about attendance threshold'); }}>
            <Sparkles size={12} /> Attendance threshold
          </button>
        </div>

        {result && (
          <div className="assistant-response">
            <div className="response-header">
              <Bot size={20} />
              <div>
                <strong>Intent: {result.intent?.replace('_', ' ').toUpperCase()}</strong>
                <p>{result.answer}</p>
              </div>
            </div>

            {result.data && result.data.length > 0 && (
              <div className="response-cards">
                {result.data.map((item, idx) => (
                  <div key={idx} className="data-card">
                    {item.first_name ? (
                      <div>
                        <strong>{item.first_name} {item.last_name} ({item.roll_no})</strong>
                        <small>Attendance: {item.attendance}% | CGPA: {item.cgpa}</small>
                        <span className="pill-badge red">Risk Score: {item.risk_score}</span>
                      </div>
                    ) : (
                      <div>
                        <strong>{item.code} - {item.title}</strong>
                        <small>{item.department} | {item.credits} Credits</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
