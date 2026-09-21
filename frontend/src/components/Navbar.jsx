import React, { useState } from 'react';
import { GraduationCap, Building2, Bell, LogOut, Radio, Sun, Moon } from 'lucide-react';

export default function Navbar({ user, view, setView, logout, notifications, markNotification, wsConnected, theme, toggleTheme }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Strict role-based navigation - Prerequisites Graph visible ONLY to students
  const navItems =
    user.role === 'student'
      ? [
          ['profile', 'My Profile'],
          ['courses', 'My Courses'],
          ['graph', 'Prerequisites'],
          ['enrollments', 'Grades'],
        ]
      : user.role === 'faculty'
      ? [
          ['overview', 'Overview'],
          ['profile', 'My Performance'],
          ['students', 'Students'],
          ['placements', 'Placement Matrix'],
          ['courses', 'Courses'],
          ['enrollments', 'My Teaching'],
          ['intelligence', 'Intelligence'],
        ]
      : [
          ['overview', 'Overview'],
          ['analytics', 'Analytics'],
          ['students', 'Students'],
          ['placements', 'Placement Matrix'],
          ['courses', 'Courses'],
          ['enrollments', 'Enrollments'],
          ['intelligence', 'Intelligence'],
          ['topology', 'DB Topology'],
        ];

  return (
    <aside className="sidebar-nav">
      <div className="logo-brand">
        <GraduationCap className="logo-icon" />
        <span>UniBase</span>
      </div>

      <div className="ws-badge-container">
        <span className={`ws-badge ${wsConnected ? 'connected' : 'connecting'}`}>
          <Radio size={12} className={wsConnected ? 'pulse' : ''} />
          {wsConnected ? 'Live CDC Stream' : 'Connecting CDC...'}
        </span>
      </div>

      <div className="tenant-card">
        <Building2 size={16} />
        <div>
          <small>WORKSPACE</small>
          <strong>{user.campus_id ? `Campus #${user.campus_id}` : 'Central Platform'}</strong>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map(([id, label]) => (
          <button
            key={id}
            className={`nav-btn ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="icon-btn theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="notif-wrapper">
          <button className="icon-btn" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <h4>Notifications</h4>
              {notifications.length ? (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    className={`notif-item ${n.read_at ? 'read' : 'unread'}`}
                    onClick={() => markNotification(n.id)}
                  >
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                  </button>
                ))
              ) : (
                <p className="no-notif">No new notifications</p>
              )}
            </div>
          )}
        </div>

        <div className="user-profile">
          <div className="avatar">{user.name ? user.name[0] : 'U'}</div>
          <div className="user-info">
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>

        <button className="logout-btn" onClick={logout} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
