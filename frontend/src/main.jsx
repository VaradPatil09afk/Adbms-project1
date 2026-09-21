import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GraduationCap, X } from 'lucide-react';
import './styles.css';

import Navbar from './components/Navbar';
import OverviewDashboard from './components/OverviewDashboard';
import StudentManagement from './components/StudentManagement';
import AdminAnalytics from './components/AdminAnalytics';
import RiskAnalytics from './components/RiskAnalytics';
import DatabaseTopologyView from './components/DatabaseTopologyView';
import CourseCatalog from './components/CourseCatalog';
import StudentProfile from './components/StudentProfile';
import FacultyProfile from './components/FacultyProfile';
import InteractiveGraphCanvas from './components/InteractiveGraphCanvas';
import CampusWizard from './components/CampusWizard';
import PlacementRankings from './components/PlacementRankings';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API.replace(/^http/, 'ws') + '/ws';

const authHeaders = () => ({
  Authorization: 'Bearer ' + localStorage.getItem('unisphere_token'),
  'Content-Type': 'application/json',
});

async function api(path, options = {}) {
  const r = await fetch(API + path, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (!r.ok) {
    const errObj = await r.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errObj.detail || 'Request failed');
  }
  return r.json();
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@unisphere.edu');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await fetch(API + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail);
        return r.json();
      });
      localStorage.setItem('unisphere_token', data.access_token);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-brand">
        <div className="logo-title">
          <GraduationCap size={36} /> UniBase
        </div>
        <h1>
          Multi-Campus Intelligence,<br />
          <em>Distributed & Connected.</em>
        </h1>
        <p>One minimalist platform connecting campus database stores, Debezium CDC events, and real-time analytics.</p>

        <div className="arch-flow">
          <span>Campus OLTP</span>
          <i className="arrow">→</i>
          <span>Kafka / Debezium CDC</span>
          <i className="arrow">→</i>
          <span>Central Document Store</span>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">PORTAL AUTHENTICATION</span>
        <h2>Welcome Back</h2>
        <p className="muted">Select a seeded account role to log in:</p>

        <label>
          Email Address
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>

        {error && <div className="error-alert">{error}</div>}

        <button className="primary-btn" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="demo-accounts">
          <button type="button" onClick={() => { setEmail('admin@unisphere.edu'); setPassword('admin123'); }}>
            System Admin
          </button>
          <button type="button" onClick={() => { setEmail('faculty@unisphere.edu'); setPassword('faculty123'); }}>
            Faculty
          </button>
          <button type="button" onClick={() => { setEmail('student@unisphere.edu'); setPassword('student123'); }}>
            Student
          </button>
        </div>
      </form>
    </main>
  );
}

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

function Enrollments({ records, options, reload, notify, canManage }) {
  const [show, setShow] = useState(false);
  const [gradeFor, setGradeFor] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.student_id = parseInt(body.student_id, 10);
    body.course_id = parseInt(body.course_id, 10);
    try {
      await api('/api/enrollments', { method: 'POST', body: JSON.stringify(body) });
      await reload();
      setShow(false);
      notify('Enrollment saved & queued for CDC projection.');
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };

  const grade = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.score = parseFloat(body.score);
    try {
      await api(`/api/enrollments/${gradeFor.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await reload();
      setGradeFor(null);
      notify('Grade published to student record.');
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enrollments-view fade-in">
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{canManage ? 'ACADEMIC OPERATIONS' : 'MY ACADEMIC RECORD'}</span>
            <h2>{canManage ? 'Enrollments & Grading' : 'My Grades'}</h2>
          </div>
          {canManage && (
            <button className="primary" onClick={() => setShow(true)}>
              Enroll Student
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{canManage ? 'Student' : 'Course'}</th>
                <th>{canManage ? 'Course' : 'Faculty'}</th>
                <th>Semester</th>
                <th>Grade</th>
                <th>Score</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="table-user-cell">
                      <strong>{canManage ? r.student_name : r.course_code}</strong>
                      <span className="roll-badge">{canManage ? r.roll_no : r.course_title}</span>
                    </div>
                  </td>
                  <td>{canManage ? `${r.course_code} · ${r.course_title}` : r.faculty_name || 'To be assigned'}</td>
                  <td>{r.semester}</td>
                  <td>
                    <span className={`risk-pill ${r.grade ? 'low' : 'high'}`}>{r.grade || 'In Progress'}</span>
                  </td>
                  <td>{r.score ?? '—'}</td>
                  {canManage && (
                    <td>
                      <button className="accent-grade-btn" onClick={() => { setError(''); setGradeFor(r); }}>
                        Grade
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {show && (
        <Modal title="Enroll Student" close={() => setShow(false)}>
          <form onSubmit={submit} className="form-grid">
            <label>
              Student
              <select name="student_id">
                {options.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_no})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Course
              <select name="course_id">
                {options.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Semester
              <input name="semester" defaultValue="Sem 1" required />
            </label>
            {error && <div className="error-alert">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShow(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {gradeFor && (
        <Modal title={`Grade ${gradeFor.student_name}`} close={() => setGradeFor(null)}>
          <form onSubmit={grade} className="form-grid">
            <label>
              Letter Grade
              <select name="grade" defaultValue={gradeFor.grade || 'A'}>
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
                <option>F</option>
              </select>
            </label>
            <label>
              Numerical Score (0-100)
              <input name="score" type="number" min="0" max="100" defaultValue={gradeFor.score ?? ''} required />
            </label>
            {error && <div className="error-alert">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setGradeFor(null)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Publishing...' : 'Publish Grade'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function PortalApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('overview');
  const [overview, setOverview] = useState();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [risk, setRisk] = useState([]);
  const [records, setRecords] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [options, setOptions] = useState({ students: [], courses: [] });
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [showCampusWizard, setShowCampusWizard] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('unibase_theme') || 'light');

  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('unibase_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const logout = () => {
    localStorage.removeItem('unisphere_token');
    setUser(null);
  };

  const load = async () => {
    try {
      const [o, s, c, e, n, camp] = await Promise.all([
        api('/api/analytics/overview'),
        api('/api/students'),
        api('/api/courses'),
        api('/api/enrollments'),
        api('/api/notifications'),
        api('/api/campuses').catch(() => []),
      ]);
      setOverview(o);
      setStudents(s);
      setCourses(c);
      setRecords(e);
      setNotifications(n);
      if (camp && camp.length) setCampuses(camp);
      if (user?.role !== 'student') {
        setRisk(await api('/api/analytics/risk'));
        setOptions(await api('/api/enrollment-options'));
      }
      if (user?.role === 'faculty') {
        setPerformance(await api('/api/faculty/performance'));
      }
    } catch (e) {
      setToast(e.message);
      if (e.message.includes('session') || e.message.includes('401')) logout();
    }
  };

  useEffect(() => {
    if (localStorage.getItem('unisphere_token')) {
      api('/api/me').then((u) => {
        setUser(u);
        if (u.role === 'student') setView('profile');
      }).catch(logout);
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();

      // Connect WebSocket
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setLiveEvents((prev) => [msg, ...prev]);
          if (msg.type === 'student_created') {
            setToast(`Live Event: New student ${msg.data?.first_name} created!`);
            load();
          } else if (msg.type === 'campus_onboarded') {
            setToast(`Live Event: Campus ${msg.data?.name} onboarded successfully!`);
            load();
          }
        } catch (err) {
          console.error('WS Parse Error', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      };
    }
  }, [user]);

  const train = async () => {
    try {
      const d = await api('/api/intelligence/train', { method: 'POST' });
      setToast(`${d.model}: ${d.training_rows} records refreshed.`);
    } catch (e) {
      setToast(e.message);
    }
  };

  const markNotification = async (id) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (e) {
      setToast(e.message);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  const canManage = ['admin', 'super-admin', 'faculty'].includes(user.role);
  const canManageAdmin = ['admin', 'super-admin'].includes(user.role);

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        view={view}
        setView={setView}
        logout={logout}
        notifications={notifications}
        markNotification={markNotification}
        wsConnected={wsConnected}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="main-content">
        <header className="content-header">
          <div>
            <span className="eyebrow">{user.role.toUpperCase()} PORTAL</span>
            <h1>
              {view === 'topology'
                ? 'Database Topology'
                : view === 'graph'
                ? 'Course Prerequisites'
                : view === 'placements'
                ? 'Placement & Employability Matrix'
                : view === 'profile'
                ? user.role === 'student'
                  ? 'My Profile'
                  : 'My Performance'
                : view[0].toUpperCase() + view.slice(1)}
            </h1>
          </div>
          <div className="status-indicator flex-align gap-8">
            {canManageAdmin && (
              <button className="primary flex-align gap-6" onClick={() => setShowCampusWizard(true)}>
                + 1-Click Campus Wizard
              </button>
            )}
            <span><span className="status-dot" /> All Systems Operational</span>
          </div>
        </header>

        {view === 'overview' && (
          <OverviewDashboard
            overview={overview}
            liveEvents={liveEvents}
            onOpenWizard={() => setShowCampusWizard(true)}
            canManageAdmin={canManageAdmin}
          />
        )}
        {view === 'analytics' && <AdminAnalytics overview={overview} />}
        {view === 'profile' && user.role === 'student' && <StudentProfile data={overview} api={api} />}
        {view === 'profile' && user.role === 'faculty' && <FacultyProfile data={performance} />}
        {view === 'students' && (
          <StudentManagement
            students={students}
            campuses={campuses}
            canCreate={canManageAdmin}
            api={api}
            reload={load}
            notify={setToast}
          />
        )}
        {view === 'placements' && (user.role === 'admin' || user.role === 'super-admin' || user.role === 'faculty') && (
          <PlacementRankings api={api} notify={setToast} />
        )}
        {view === 'courses' && (
          <CourseCatalog
            courses={courses}
            canCreate={canManage}
            user={user}
            reload={load}
            notify={setToast}
            api={api}
          />
        )}
        {view === 'enrollments' && (
          <Enrollments records={records} options={options} reload={load} notify={setToast} canManage={canManage} />
        )}
        {view === 'intelligence' && <RiskAnalytics risk={risk} train={train} api={api} notify={setToast} />}
        {view === 'graph' && user.role === 'student' && (
          <InteractiveGraphCanvas api={api} courses={courses} notify={setToast} />
        )}
        {view === 'topology' && (user.role === 'admin' || user.role === 'super-admin') && (
          <DatabaseTopologyView api={api} notify={setToast} />
        )}
      </main>

      {showCampusWizard && (
        <CampusWizard
          close={() => setShowCampusWizard(false)}
          api={api}
          notify={setToast}
          onSuccess={load}
        />
      )}

      {toast && (
        <div className="toast-notification" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<PortalApp />);
