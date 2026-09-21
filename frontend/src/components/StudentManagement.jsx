import React, { useState } from 'react';
import { UserPlus, Search, Building2, X, GraduationCap, BookOpen, Calendar, ChevronRight, Award } from 'lucide-react';

const DEFAULT_CAMPUSES = [
  { id: 1, code: 'PUN', name: 'Pune Institute of Technology' },
  { id: 2, code: 'MUM', name: 'Mumbai School of Engineering' },
  { id: 3, code: 'BLR', name: 'Bengaluru Digital Campus' },
];

export default function StudentManagement({ students = [], campuses = [], canCreate, api, reload, notify }) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('ALL');

  // History Dossier Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const campusList = campuses && campuses.length > 0 ? campuses : DEFAULT_CAMPUSES;

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.campus_name && s.campus_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCampus =
      selectedCampus === 'ALL' || String(s.campus_id) === String(selectedCampus);

    return matchesSearch && matchesCampus;
  });

  const viewHistory = async (student) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData);
    body.campus_id = parseInt(body.campus_id, 10);
    body.year = parseInt(body.year, 10);
    body.attendance = parseFloat(body.attendance);
    body.cgpa = parseFloat(body.cgpa);

    try {
      const saved = await api('/api/students', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await reload();
      setShowModal(false);
      if (notify) notify(`Student ${saved.first_name} ${saved.last_name} created successfully.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const getRiskClass = (score) => {
    if (score >= 35) return 'high';
    if (score >= 25) return 'medium';
    return 'safe';
  };

  const getRiskLabel = (score) => {
    if (score >= 35) return 'Critical';
    if (score >= 25) return 'Moderate';
    return 'Stable';
  };

  return (
    <div className="students-container fade-in">
      <section className="panel">
        <div className="panel-title flex-between flex-wrap gap-12">
          <div>
            <span className="eyebrow">SYSTEM OF RECORD</span>
            <h2>Student Directory ({filteredStudents.length})</h2>
            <small className="muted">Click any student row to view full year-by-year academic progression history</small>
          </div>

          <div className="flex-align gap-12 flex-wrap">
            {/* Campus Filter Dropdown */}
            <div className="campus-filter-wrapper flex-align gap-6">
              <Building2 size={15} className="muted" />
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="select-input campus-select-dropdown"
              >
                <option value="ALL">All Campuses</option>
                {campusList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search name, roll no, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {canCreate && (
              <button className="primary flex-align gap-6" onClick={() => setShowModal(true)}>
                <UserPlus size={16} /> Add Student
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive margin-top-12">
          <table className="custom-table clickable-rows">
            <thead>
              <tr>
                <th>Student Name & Roll No</th>
                <th>Campus</th>
                <th>Department & Year</th>
                <th>Attendance</th>
                <th>CGPA</th>
                <th>Risk Status</th>
                <th>Academic History</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const rClass = getRiskClass(s.risk_score);
                return (
                  <tr key={s.id} onClick={() => viewHistory(s)} className="cursor-pointer hover-row">
                    <td>
                      <div className="table-user-cell">
                        <strong>{s.first_name} {s.last_name}</strong>
                        <span className="roll-badge">{s.roll_no}</span>
                      </div>
                    </td>
                    <td>
                      <span className="campus-tag">{s.campus_name}</span>
                    </td>
                    <td>{s.department} (Year {s.year})</td>
                    <td className={s.attendance < 75 ? 'danger-text' : ''}>
                      {s.attendance}%
                    </td>
                    <td><strong>{s.cgpa}</strong></td>
                    <td>
                      <span className={`risk-score-pill ${rClass}`}>
                        {getRiskLabel(s.risk_score)} · {s.risk_score}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary flex-align gap-6 btn-small"
                        onClick={(e) => { e.stopPropagation(); viewHistory(s); }}
                      >
                        <BookOpen size={13} /> View History <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center muted padding-24">
                    No matching student records found for the selected campus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Spaced out, clean Register New Student Modal */}
      {showModal && (
        <div className="modal-backdrop fade-in">
          <div className="modal-content student-modal scale-in">
            <div className="modal-header">
              <div className="flex-align gap-8">
                <GraduationCap size={20} className="text-accent" />
                <div>
                  <h3>Register New Student</h3>
                  <small className="muted">Add a new student profile to campus database store</small>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid spaced-form-grid">
              <label>
                <span>Roll Number</span>
                <input name="roll_no" required placeholder="PUN-CS-007" />
              </label>

              <label>
                <span>Target Campus</span>
                <select name="campus_id" defaultValue={campusList[0]?.id || 1}>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>First Name</span>
                <input name="first_name" required placeholder="Aarav" />
              </label>

              <label>
                <span>Last Name</span>
                <input name="last_name" required placeholder="Sharma" />
              </label>

              <label className="full-width">
                <span>Email Address</span>
                <input name="email" type="email" required placeholder="aarav.sharma@unisphere.edu" />
              </label>

              <label className="full-width">
                <span>Account Password</span>
                <input name="password" type="password" minLength="6" required defaultValue="student123" />
              </label>

              <label>
                <span>Department</span>
                <input name="department" defaultValue="Computer Science" required />
              </label>

              <label>
                <span>Academic Year</span>
                <input name="year" type="number" min="1" max="6" defaultValue="1" />
              </label>

              <label>
                <span>Attendance (%)</span>
                <input name="attendance" type="number" min="0" max="100" defaultValue="100" />
              </label>

              <label>
                <span>Initial CGPA</span>
                <input name="cgpa" type="number" step="0.1" min="0" max="10" defaultValue="8.0" />
              </label>

              {error && <div className="error-alert full-width">{error}</div>}

              <div className="modal-actions full-width flex-between margin-top-12">
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={busy}>
                  {busy ? 'Registering...' : 'Save & Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <div className="no-history-box padding-16 muted border-subtle">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
