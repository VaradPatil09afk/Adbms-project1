import React, { useState, useEffect } from 'react';
import { GitFork, BookOpen, ExternalLink, Code, Search, Filter, Layers, CheckCircle2, ChevronRight, Zap, Info } from 'lucide-react';

const SEEDED_NODES = [
  { code: 'CS101', title: 'Intro to Computer Science', dept: 'CS', credits: 4, prereqs: [], students: 142, desc: 'Fundamental programming principles, control flow, functions, and recursion.' },
  { code: 'CS201', title: 'Data Structures & Algorithms', dept: 'CS', credits: 4, prereqs: ['CS101'], students: 118, desc: 'Arrays, linked lists, trees, graphs, sorting, and algorithmic complexity.' },
  { code: 'CS301', title: 'Advanced Algorithms', dept: 'CS', credits: 4, prereqs: ['CS201'], students: 86, desc: 'Dynamic programming, graph algorithms, NP-completeness, and greedy strategy.' },
  { code: 'DS210', title: 'Data Engineering Pipelines', dept: 'DS', credits: 3, prereqs: ['CS101'], students: 94, desc: 'ETL/ELT data pipelines, distributed processing, and stream ingestion.' },
  { code: 'DS310', title: 'Distributed Database Systems', dept: 'DS', credits: 4, prereqs: ['CS201', 'DS210'], students: 72, desc: 'Distributed transactions, 2PC, CDC, Raft consensus, and sharding.' },
  { code: 'ECE101', title: 'Digital Logic & Circuits', dept: 'ECE', credits: 4, prereqs: [], students: 65, desc: 'Boolean algebra, logic gates, flip-flops, and sequential circuits.' },
  { code: 'ECE201', title: 'Computer Architecture', dept: 'ECE', credits: 4, prereqs: ['ECE101', 'CS101'], students: 54, desc: 'MIPS CPU organization, pipelining, memory hierarchy, and cache.' },
  { code: 'MATH201', title: 'Linear Algebra & Calculus', dept: 'MATH', credits: 4, prereqs: [], students: 160, desc: 'Matrices, eigenvalues, vector spaces, and multivariate optimization.' },
];

export default function InteractiveGraphCanvas({ api, courses = [], notify }) {
  const [selectedCode, setSelectedCode] = useState('DS310');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Combine live courses with graph metadata if available
  const allNodes = SEEDED_NODES.map((node) => {
    const liveMatch = courses.find((c) => c.code === node.code);
    return liveMatch
      ? { ...node, title: liveMatch.title, dept: liveMatch.department || node.dept, credits: liveMatch.credits || node.credits }
      : node;
  });

  const filteredNodes = allNodes.filter((node) => {
    const matchesDept = deptFilter === 'ALL' || node.dept === deptFilter;
    const matchesSearch =
      node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const selectedNode = allNodes.find((n) => n.code === selectedCode) || allNodes[0];

  // Helper to determine if a node is in the active dependency chain
  const isDependencyOfSelected = (code) => {
    if (!selectedNode) return false;
    if (selectedNode.code === code) return true;
    if (selectedNode.prereqs.includes(code)) return true;
    // Indirect prereq check
    for (const p of selectedNode.prereqs) {
      const parentNode = allNodes.find((n) => n.code === p);
      if (parentNode && parentNode.prereqs.includes(code)) return true;
    }
    return false;
  };

  const isDependentOnSelected = (code) => {
    if (!selectedNode) return false;
    const targetNode = allNodes.find((n) => n.code === code);
    return targetNode ? targetNode.prereqs.includes(selectedNode.code) : false;
  };

  const fetchGraphBackend = async (code) => {
    setLoading(true);
    try {
      if (api) {
        const data = await api(`/api/graph/prerequisites/${code}`);
        setGraphData(data);
      }
    } catch (err) {
      console.warn('Backend graph route fallback to local matrix', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCode) fetchGraphBackend(selectedCode);
  }, [selectedCode]);

  const activeCypherQuery = `MATCH (target:Course {code: '${selectedNode.code}'})
OPTIONAL MATCH path = (prereq:Course)-[:REQUIRES*1..3]->(target)
OPTIONAL MATCH downstream = (target)<-[:REQUIRES]-(dependent:Course)
RETURN target, collect(distinct prereq) as prerequisites, collect(distinct dependent) as dependents;`;

  return (
    <div className="interactive-graph-canvas fade-in">
      {/* Top Header Panel */}
      <section className="panel">
        <div className="panel-title flex-between flex-wrap gap-12">
          <div>
            <span className="eyebrow flex-align gap-6">
              <Zap size={14} className="text-accent" /> NEO4J GRAPH ENGINE PROJECTION
            </span>
            <h2>Prerequisite Graph Canvas & Dependency Path Explorer</h2>
            <p className="muted">
              Interactive 2D graph visualizer mapping prerequisite chains across campus degree requirements.
            </p>
          </div>

          <div className="graph-controls-bar flex-align gap-12 flex-wrap">
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search course code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field"
              />
            </div>

            <div className="flex-align gap-6">
              <Filter size={15} className="muted" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="select-input"
              >
                <option value="ALL">All Departments</option>
                <option value="CS">Computer Science (CS)</option>
                <option value="DS">Data Science (DS)</option>
                <option value="ECE">Electrical Engineering (ECE)</option>
                <option value="MATH">Mathematics (MATH)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Graph Grid Area */}
      <div className="graph-explorer-grid margin-top-16">
        {/* Left Interactive Graph Board */}
        <div className="graph-canvas-container panel">
          <div className="canvas-header flex-between">
            <span className="canvas-title"><Layers size={16} /> Dependency Graph Projection</span>
            <div className="canvas-legend flex-align gap-12">
              <span className="legend-item target"><span className="dot" /> Target Course</span>
              <span className="legend-item prereq"><span className="dot" /> Prerequisite</span>
              <span className="legend-item dependent"><span className="dot" /> Downstream</span>
            </div>
          </div>

          <div className="graph-nodes-grid">
            {filteredNodes.map((node) => {
              const isTarget = node.code === selectedNode.code;
              const isPrereq = isDependencyOfSelected(node.code) && !isTarget;
              const isDependent = isDependentOnSelected(node.code);
              const isHovered = hoveredNode === node.code;

              let statusClass = 'neutral';
              if (isTarget) statusClass = 'target';
              else if (isPrereq) statusClass = 'prereq';
              else if (isDependent) statusClass = 'dependent';

              return (
                <div
                  key={node.code}
                  className={`graph-node-card ${statusClass} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => setSelectedCode(node.code)}
                  onMouseEnter={() => setHoveredNode(node.code)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="node-top-bar flex-between">
                    <span className="node-dept-tag">{node.dept}</span>
                    <span className="node-credits">{node.credits} CR</span>
                  </div>

                  <h3 className="node-code">{node.code}</h3>
                  <p className="node-title">{node.title}</p>

                  <div className="node-bottom-bar flex-between margin-top-12">
                    <span className="node-prereq-count">
                      <GitFork size={12} /> {node.prereqs.length} Prereq{node.prereqs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="node-students-tag">
                      {node.students} Students
                    </span>
                  </div>

                  {/* Flow Arrow Connection Pill */}
                  {isPrereq && (
                    <div className="dependency-flow-pill prereq-flow">
                      <span>Prerequisite →</span>
                    </div>
                  )}
                  {isDependent && (
                    <div className="dependency-flow-pill dependent-flow">
                      <span>← Dependent</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Inspector & Cypher Panel */}
        <div className="graph-inspector-panel flex-column gap-16">
          {/* Node Details Inspector Card */}
          <div className="panel inspector-card">
            <div className="panel-title flex-between">
              <div>
                <span className="eyebrow">NODE DETAILS INSPECTOR</span>
                <h2>{selectedNode.code}</h2>
              </div>
              <span className="risk-pill low">{selectedNode.dept}</span>
            </div>

            <h4>{selectedNode.title}</h4>
            <p className="muted margin-top-4">{selectedNode.desc}</p>

            <div className="inspector-stats-grid margin-top-16">
              <div className="stat-box">
                <small>CREDITS</small>
                <strong>{selectedNode.credits}</strong>
              </div>
              <div className="stat-box">
                <small>DIRECT PREREQS</small>
                <strong>{selectedNode.prereqs.length}</strong>
              </div>
              <div className="stat-box">
                <small>ENROLLED</small>
                <strong>{selectedNode.students}</strong>
              </div>
            </div>

            <div className="prereqs-chain-section margin-top-16">
              <h5>Direct Prerequisite Chain</h5>
              {selectedNode.prereqs.length > 0 ? (
                <div className="prereq-list">
                  {selectedNode.prereqs.map((pCode) => {
                    const pNode = allNodes.find((n) => n.code === pCode);
                    return (
                      <div
                        key={pCode}
                        className="prereq-item flex-between"
                        onClick={() => setSelectedCode(pCode)}
                      >
                        <div className="flex-align gap-8">
                          <BookOpen size={14} className="text-accent" />
                          <div>
                            <strong>{pCode}</strong>
                            <small className="muted display-block">{pNode?.title || pCode}</small>
                          </div>
                        </div>
                        <ChevronRight size={14} className="muted" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-prereqs-badge">No prerequisites required (Level 100 Course)</p>
              )}
            </div>
          </div>

          {/* Cypher Query Box */}
          <div className="panel cypher-panel">
            <div className="cypher-header flex-between margin-bottom-12">
              <span className="flex-align gap-6">
                <Code size={15} /> Real-Time Cypher Query (Neo4j)
              </span>
              <span className="badge low">Neo4j 5.x Reactive</span>
            </div>
            <pre className="cypher-code-block">{activeCypherQuery}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
