import React, { useState, useEffect } from 'react';
import { Database, Server, Cpu, CheckCircle2, Terminal, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react';

export default function DatabaseTopologyView({ api, notify }) {
  const [topology, setTopology] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchTopology = async () => {
    setLoading(true);
    try {
      const data = await api('/api/system/topology');
      setTopology(data);
      if (data.databases && data.databases.length > 0 && !selectedDb) {
        setSelectedDb(data.databases[0]);
      }
    } catch (err) {
      if (notify) notify('Failed to fetch system topology: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !topology) {
    return <div className="loading">Loading distributed database topology...</div>;
  }

  return (
    <div className="topology-view fade-in">
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">DISTRIBUTED ARCHITECTURE</span>
            <h2>Multi-Campus Database Topology Inspector</h2>
            <p className="muted">Live status, connection endpoints, and CLI queries for your active database clusters.</p>
          </div>
          <button className="secondary flex-align" onClick={fetchTopology}>
            <RefreshCw size={15} /> Refresh Status
          </button>
        </div>
      </section>

      <div className="topology-grid">
        <div className="db-cards-list">
          {topology?.databases?.map((db) => (
            <div
              key={db.id}
              className={`db-card ${selectedDb?.id === db.id ? 'selected' : ''}`}
              onClick={() => setSelectedDb(db)}
            >
              <div className="db-card-header">
                <span className="db-icon">
                  <Database size={18} />
                </span>
                <span className="badge-status online">
                  <CheckCircle2 size={12} /> {db.status}
                </span>
              </div>
              <h3>{db.name}</h3>
              <p className="db-engine">{db.engine}</p>
              <small>{db.role}</small>
            </div>
          ))}
        </div>

        {selectedDb && (
          <section className="panel db-details-panel scale-in">
            <div className="panel-title">
              <div>
                <span className="eyebrow">{selectedDb.engine.toUpperCase()}</span>
                <h2>{selectedDb.name}</h2>
                <p className="muted">{selectedDb.role}</p>
              </div>
              {selectedDb.web_gui && (
                <a
                  href={selectedDb.web_gui}
                  target="_blank"
                  rel="noreferrer"
                  className="primary flex-align button-link"
                >
                  Open Web GUI <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="details-group">
              <h4><Server size={15} /> Connection Endpoint</h4>
              <div className="info-box flex-between">
                <div>
                  <label>Connection String:</label>
                  <code>{selectedDb.connection_string || 'N/A'}</code>
                </div>
                {selectedDb.connection_string && (
                  <button
                    className="icon-btn"
                    onClick={() => copyToClipboard(selectedDb.connection_string)}
                    title="Copy connection string"
                  >
                    {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {selectedDb.port && (
                <div className="info-box">
                  <label>Exposed Port:</label>
                  <code>localhost:{selectedDb.port}</code>
                </div>
              )}

              {selectedDb.file_path && (
                <div className="info-box">
                  <label>Database File Path:</label>
                  <code>{selectedDb.file_path}</code>
                </div>
              )}
            </div>

            <div className="details-group">
              <div className="flex-between margin-bottom-8">
                <h4><Terminal size={15} /> Terminal CLI Access Command</h4>
                <button
                  className="icon-btn"
                  onClick={() => copyToClipboard(selectedDb.docker_cmd || `sqlite3 ${selectedDb.file_path}`)}
                  title="Copy CLI command"
                >
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="cmd-box">
                <pre>{selectedDb.docker_cmd || `sqlite3 ${selectedDb.file_path}`}</pre>
              </div>
            </div>

            <div className="details-group">
              <h4><Cpu size={15} /> Registered Schemas & Projections</h4>
              <div className="table-tags">
                {(selectedDb.tables || selectedDb.collections || selectedDb.nodes || []).map((item) => (
                  <span key={item} className="tag">{item}</span>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
