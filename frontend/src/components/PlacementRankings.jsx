import React, { useState, useEffect } from 'react';
import { Award, Filter, Search, Award as Medal, CheckCircle2, XCircle, ChevronRight, BookOpen, Layers, Sparkles, UserCheck, Calendar, TrendingUp } from 'lucide-react';

export default function PlacementRankings({ api, notify }) {
  const [minCgpa, setMinCgpa] = useState(7.0);
  const [minAttendance, setMinAttendance] = useState(75);
  const [department, setDepartment] = useState('ALL');
  const [yearFilter, setYearFilter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [shortlistedIds, setShortlistedIds] = useState([]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        min_cgpa: minCgpa,
        min_attendance: minAttendance,
        department: department,
        year: yearFilter
      });
      const result = await api(`/api/placements/rankings?${queryParams.toString()}`);
      setData(result);
    } catch (err) {
      if (notify) notify('Failed to fetch placement rankings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [minCgpa, minAttendance, department, yearFilter]);

  const viewStudentHistory = async (student) => {
    setSelectedStudent(student);
    setHistoryLoading(true);
    try {
      const res = await api(`/api/students/${student.id}/history`);
      setHistoryData(res);
    } catch (err) {
      if (notify) notify('Failed to load student history: ' + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleShortlist = (id, name) => {
    if (shortlistedIds.includes(id)) {
      setShortlistedIds(prev => prev.filter(item => item !== id));
      if (notify) notify(`Removed ${name} from interview shortlist.`);
    } else {
      setShortlistedIds(prev => [...prev, id]);
      if (notify) notify(`Shortlisted ${name} for campus recruitment!`);
    }
  };

  const filteredCandidates = data?.candidates?.filter(c => {
    const q = searchQuery.toLowerCase();
    const nameMatch = `${c.first_name} ${c.last_name}`.toLowerCase().includes(q);
    const rollMatch = c.roll_no.toLowerCase().includes(q);
    const deptMatch = c.department.toLowerCase().includes(q);
    return nameMatch || rollMatch || deptMatch;
  }) || [];

  return (
    <div className="placement-rankings-container fade-in">
      {/* Top Header Panel */}
      <section className="panel">
        <div className="panel-title flex-between flex-wrap gap-12">
          <div>
            <span className="eyebrow flex-align gap-6">
              <Sparkles size={14} className="text-accent" /> RECRUITMENT & PLACEMENT MATRIX
            </span>
            <h2>University Employability Rankings & Recruiter Screening Hub</h2>
            <p className="muted">
              Algorithmic student ranking system scoring cumulative CGPA, multi-year academic consistency, and project credits.
            </p>
          </div>

          <div className="stats-badges-row flex-align gap-12">
            <div className="summary-badge-card">
              <small>TOTAL CANDIDATES</small>
              <strong>{data?.total_candidates || 0}</strong>
            </div>
            <div className="summary-badge-card highlight">
              <small>ELIGIBLE SHORTLIST</small>
              <strong className="text-accent">{data?.eligible_candidates || 0}</strong>
            </div>
            <div className="summary-badge-card">
              <small>SHORTLISTED FOR INTERVIEW</small>
              <strong className="text-green">{shortlistedIds.length}</strong>
            </div>
          </div>
        </div>

        {/* Recruiter Cutoff Filter Toolbar */}
        <div className="recruiter-cutoff-bar margin-top-16">
          <div className="cutoff-title flex-align gap-6">
            <Filter size={16} /> <strong>Recruiter Cutoff & Screening Parameters</strong>
          </div>

          <div className="filters-grid margin-top-12">
            {/* Min CGPA Slider */}
            <div className="filter-group">
              <div className="flex-between">
                <label>Minimum CGPA Cutoff:</label>
                <strong className="filter-val-badge">{minCgpa.toFixed(1)}</strong>
              </div>
              <input
                type="range"
                min="5.0"
                max="9.5"
                step="0.1"
                value={minCgpa}
                onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
                className="cutoff-slider"
              />
            </div>

            {/* Min Attendance Slider */}
            <div className="filter-group">
              <div className="flex-between">
                <label>Min Attendance Threshold:</label>
                <strong className="filter-val-badge">{minAttendance}%</strong>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={minAttendance}
                onChange={(e) => setMinAttendance(parseInt(e.target.value, 10))}
                className="cutoff-slider"
              />
            </div>

            {/* Department Selector */}
            <div className="filter-group">
              <label>Department:</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="select-input"
              >
                <option value="ALL">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Data Science">Data Science</option>
                <option value="Electrical">Electrical Engineering</option>
              </select>
            </div>

            {/* Year Selector */}
            <div className="filter-group">
              <label>Graduation Year Filter:</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
                className="select-input"
              >
                <option value={0}>All Academic Years</option>
                <option value={4}>4th Year (Final Year / Placements)</option>
                <option value={3}>3rd Year (Pre-Final / Internships)</option>
                <option value={2}>2nd Year</option>
              </select>
            </div>

            {/* Candidate Search */}
            <div className="filter-group search-group">
              <label>Search Candidates:</label>
              <div className="search-input-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter name, roll, or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-field"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Student Rankings Table */}
      <section className="panel margin-top-16">
        <div className="table-responsive">
          <table className="custom-table rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student Candidate</th>
                <th>Campus & Dept</th>
                <th>CGPA & Attendance</th>
                <th>Employability Score</th>
                <th>Cutoff Eligibility</th>
                <th>Year-Wise Dossier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center padding-24">
                    Evaluating candidate rankings & multi-year records...
                  </td>
                </tr>
              ) : filteredCandidates.length > 0 ? (
                filteredCandidates.map((cand) => {
                  const isShortlisted = shortlistedIds.includes(cand.id);

                  let rankBadgeClass = 'rank-regular';
                  if (cand.rank === 1) rankBadgeClass = 'rank-gold';
                  else if (cand.rank === 2) rankBadgeClass = 'rank-silver';
                  else if (cand.rank === 3) rankBadgeClass = 'rank-bronze';

                  let scoreClass = 'score-mid';
                  if (cand.employability_score >= 85) scoreClass = 'score-high';
                  else if (cand.employability_score < 70) scoreClass = 'score-low';

                  return (
                    <tr key={cand.id} className={!cand.eligible ? 'faded-row' : ''}>
                      <td>
                        <span className={`rank-badge ${rankBadgeClass}`}>
                          #{cand.rank}
                        </span>
                      </td>

                      <td>
                        <div className="table-user-cell">
                          <strong>{cand.first_name} {cand.last_name}</strong>
                          <span className="roll-badge">{cand.roll_no}</span>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>{cand.department}</strong>
                          <small className="muted display-block">{cand.campus_name}</small>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>{cand.cgpa} CGPA</strong>
                          <small className={`display-block ${cand.attendance < 75 ? 'danger-text' : 'muted'}`}>
                            {cand.attendance}% Attendance
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="flex-align gap-6">
                          <span className={`employability-pill ${scoreClass}`}>
                            {cand.employability_score} / 100
                          </span>
                        </div>
                      </td>

                      <td>
                        {cand.eligible ? (
                          <span className="status-pill status-eligible">
                            <CheckCircle2 size={13} /> Eligible
                          </span>
                        ) : (
                          <span className="status-pill status-ineligible">
                            <XCircle size={13} /> Below Cutoff
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          className="secondary flex-align gap-6 btn-small"
                          onClick={() => viewStudentHistory(cand)}
                        >
                          <BookOpen size={13} /> View History <ChevronRight size={13} />
                        </button>
                      </td>

                      <td>
                        <button
                          className={`btn-small flex-align gap-6 ${isShortlisted ? 'btn-shortlisted' : 'primary'}`}
                          onClick={() => toggleShortlist(cand.id, `${cand.first_name} ${cand.last_name}`)}
                        >
                          <UserCheck size={13} />
                          {isShortlisted ? 'Shortlisted' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center muted padding-24">
                    No candidates meet the current recruiter cutoff criteria. Try lowering the CGPA or attendance threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Year-by-Year Historical Dossier Modal */}
      {selectedStudent && (
        <div className="modal-backdrop fade-in">
          <div className="modal-content history-dossier-modal scale-in">
            <div className="modal-header">
              <div className="flex-align gap-8">
                <Award size={22} className="text-accent" />
                <div>
                  <h3>Academic Progression Dossier</h3>
                  <small className="muted">
                    Year-by-Year Performance Breakdown for {selectedStudent.first_name} {selectedStudent.last_name}
                  </small>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedStudent(null)}>×</button>
            </div>

            <div className="student-profile-hero margin-top-12">
              <div className="hero-info flex-between">
                <div>
                  <h4>{selectedStudent.first_name} {selectedStudent.last_name} ({selectedStudent.roll_no})</h4>
                  <p className="muted">{selectedStudent.department} · {selectedStudent.campus_name} · Year {selectedStudent.year}</p>
                </div>
                <div className="hero-score-box">
                  <small>CUMULATIVE CGPA</small>
                  <strong>{selectedStudent.cgpa} / 10.0</strong>
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div className="loading padding-24">Loading historical semester records...</div>
            ) : (
              <div className="dossier-history-body margin-top-16">
                <h4 className="margin-bottom-12 flex-align gap-6">
                  <Calendar size={16} /> Multi-Year Term Breakdown
                </h4>

                {historyData?.history && historyData.history.length > 0 ? (
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
                            <small>CREDITS EARNED</small>
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
                  <div className="no-history-box">
                    <p>Standard profile initialized. Historical semester records will populate at end of term.</p>
                  </div>
                )}

                {/* Enrolled Courses Summary */}
                {historyData?.enrollments && historyData.enrollments.length > 0 && (
                  <div className="enrolled-summary-section margin-top-16">
                    <h5 className="margin-bottom-8">Course Grades & Enrolled Subjects</h5>
                    <div className="enrolled-tags flex-wrap gap-8">
                      {historyData.enrollments.map((e) => (
                        <span key={e.id} className="course-grade-chip">
                          <strong>{e.course_code}</strong>: {e.grade ? `Grade ${e.grade} (${e.score} pts)` : 'In Progress'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions flex-between margin-top-20">
              <button className="secondary" onClick={() => setSelectedStudent(null)}>
                Close Dossier
              </button>
              <button
                className="primary flex-align gap-6"
                onClick={() => {
                  toggleShortlist(selectedStudent.id, `${selectedStudent.first_name} ${selectedStudent.last_name}`);
                  setSelectedStudent(null);
                }}
              >
                <UserCheck size={15} />
                {shortlistedIds.includes(selectedStudent.id) ? 'Shortlisted' : 'Shortlist Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
