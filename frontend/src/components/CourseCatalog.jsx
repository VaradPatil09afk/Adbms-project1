import React, { useState } from 'react';
import { BookOpen, Plus, Search, Building2, User, X } from 'lucide-react';

function Modal({ title, close, children }) {
  return (
    <div className="modal-backdrop fade-in">
      <div className="modal-content scale-in">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CourseCatalog({ courses, canCreate, user, reload, notify, api }) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.credits = parseInt(body.credits, 10);
    body.campus_id = parseInt(body.campus_id, 10);
    try {
      await api('/api/courses', { method: 'POST', body: JSON.stringify(body) });
      await reload();
      setShowModal(false);
      if (notify) notify('Course created and projected to central repository.');
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="courses-container fade-in">
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CENTRAL CATALOG</span>
            <h2>Course Offerings ({filteredCourses.length})</h2>
          </div>

          <div className="flex-align">
            <div className="search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canCreate && (
              <button className="primary flex-align" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Add Course
              </button>
            )}
          </div>
        </div>

        <div className="course-grid">
          {filteredCourses.map((c) => (
            <article className="course-card-clean" key={c.id}>
              <div className="course-clean-header">
                <span className="code-pill">{c.code}</span>
                <span className="credits-pill">{c.credits} Credits</span>
              </div>

              <h3>{c.title}</h3>
              <p className="course-desc">{c.description}</p>

              <div className="course-clean-footer">
                <span className="info-chip">
                  <Building2 size={13} /> {c.campus_name}
                </span>
                <span className="info-chip">
                  <User size={13} /> {c.faculty_name || 'Faculty TBD'}
                </span>
                <span className="enrollment-chip">
                  {c.enrollment_count} Enrolled
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showModal && (
        <Modal title="Create Course" close={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Course Code:
              <input name="code" required placeholder="CS401" />
            </label>
            <label>
              Credits:
              <input name="credits" type="number" min="1" max="8" defaultValue="4" required />
            </label>
            <label className="wide">
              Course Title:
              <input name="title" required placeholder="Advanced Distributed Systems" />
            </label>
            <label className="wide">
              Description:
              <input name="description" required placeholder="Course overview and syllabus..." />
            </label>
            <label>
              Department:
              <input name="department" defaultValue="Computer Science" required />
            </label>

            {user.role !== 'faculty' ? (
              <label>
                Campus:
                <select name="campus_id" defaultValue="1">
                  <option value="1">Pune Institute of Technology</option>
                  <option value="2">Mumbai School of Engineering</option>
                  <option value="3">Bengaluru Digital Campus</option>
                </select>
              </label>
            ) : (
              <input name="campus_id" type="hidden" value={user.campus_id} />
            )}

            {error && <div className="error-alert">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Creating...' : 'Save Course'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
