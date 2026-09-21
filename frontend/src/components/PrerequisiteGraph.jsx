import React, { useState, useEffect } from 'react';
import { GitFork, BookOpen, ExternalLink, Code } from 'lucide-react';

export default function PrerequisiteGraph({ api, courses, notify }) {
  const [selectedCode, setSelectedCode] = useState(courses[0]?.code || 'CS201');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGraph = async (code) => {
    setLoading(true);
    try {
      const data = await api(`/api/graph/prerequisites/${code}`);
      setGraphData(data);
    } catch (err) {
      if (notify) notify('Failed to fetch course graph: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCode) fetchGraph(selectedCode);
  }, [selectedCode]);

  return (
    <div className="graph-view">
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">NEO4J GRAPH PROJECTION</span>
            <h2>Course Prerequisite Visualizer</h2>
            <p className="muted">Explore prerequisite graph relationships projected from PostgreSQL/MySQL into Neo4j.</p>
          </div>
          <div className="flex-align">
            <label style={{ marginRight: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>Course:</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="select-input"
            >
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Querying graph engine...</div>
        ) : graphData ? (
          <div className="graph-content">
            <div className="graph-main">
              <div className="target-node">
                <span className="node-type">Target Course</span>
                <h3>{graphData.course?.code}</h3>
                <p>{graphData.course?.title}</p>
                <small>{graphData.course?.department} · {graphData.course?.credits} Credits</small>
              </div>

              <div className="graph-arrow">
                <GitFork size={24} />
                <span>Requires</span>
              </div>

              <div className="prereq-nodes">
                {graphData.prerequisites && graphData.prerequisites.length > 0 ? (
                  graphData.prerequisites.map((p) => (
                    <div key={p.prerequisite_code} className="prereq-node">
                      <BookOpen size={16} />
                      <div>
                        <strong>{p.prerequisite_code}</strong>
                        <span>{p.prerequisite_title}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-prereqs">
                    <p>No prerequisites required for this course (Entry level).</p>
                  </div>
                )}
              </div>
            </div>

            <div className="cypher-box">
              <div className="cypher-header">
                <span><Code size={14} /> Cypher Query (Neo4j Engine)</span>
                <span className="badge low">{graphData.engine}</span>
              </div>
              <pre>{graphData.cypher}</pre>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
