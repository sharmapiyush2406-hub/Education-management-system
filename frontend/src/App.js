import { useState, useEffect, useCallback } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000";
const SUBJECTS = ["PYTHON", "DBMS", "DMS", "SALESFORCE", "GCCF"];

// ── Helpers ──────────────────────────────────────────────────────────
function gradeClass(g) {
  const map = {
    "A+": "grade-a-plus", "A": "grade-a", "A-": "grade-a-min",
    "B+": "grade-b-plus", "B": "grade-b",  "B-": "grade-b-min",
    "C+": "grade-c-plus", "C": "grade-c",  "D": "grade-d", "F": "grade-f"
  };
  return map[g] || "grade-c";
}

function AttBar({ value }) {
  const cls = value >= 75 ? "att-high" : value >= 60 ? "att-mid" : "att-low";
  return (
    <div className="attendance-bar-wrap">
      <div className="attendance-bar">
        <div className={`attendance-fill ${cls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="att-text" style={{ color: value >= 75 ? "#27AE60" : value >= 60 ? "#F39C12" : "#C0392B" }}>
        {value}%
      </span>
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">✅ {msg}</div>;
}

// ── Auth helpers ─────────────────────────────────────────────────────
function saveAuth(data) {
  localStorage.setItem("ems_token", data.token);
  localStorage.setItem("ems_user", JSON.stringify({ name: data.name, role: data.role, email: data.email }));
}

function loadAuth() {
  const token = localStorage.getItem("ems_token");
  const user  = localStorage.getItem("ems_user");
  if (!token || !user) return null;
  return { token, ...JSON.parse(user) };
}

function clearAuth() {
  localStorage.removeItem("ems_token");
  localStorage.removeItem("ems_user");
}

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ═══════════════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(loadAuth);

  const logout = () => { clearAuth(); setAuth(null); };

  if (!auth) return <LoginPage onLogin={setAuth} />;
  if (auth.role === "student") return <StudentDashboard auth={auth} logout={logout} />;
  return <AdminDashboard auth={auth} logout={logout} />;
}

// ═══════════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      saveAuth(data);
      onLogin({ token: data.token, name: data.name, role: data.role, email: data.email });
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1>EMS Portal</h1>
        </div>
        <p className="login-subtitle">Education Management System</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@ems.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: "#9E9E9E", textAlign: "center" }}>
          Admin: <b>admin@ems.com</b> / <b>admin123</b><br />
          Students: <b>student1@ems.com</b> / <b>student123</b>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function Sidebar({ auth, logout, tabs, activeTab, setActiveTab }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>🎓 EMS</h2>
        <p>Education Portal</p>
      </div>

      <nav className="sidebar-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{auth.name.charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <h4>{auth.name}</h4>
            <span>{auth.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>⏻ Sign Out</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function StudentDashboard({ auth, logout }) {
  const [activeTab, setActiveTab]       = useState("grades");
  const [record, setRecord]             = useState(null);
  const [assignments, setAssignments]   = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [loading, setLoading]           = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const h = authHeaders(auth.token);
    const [recRes, asgRes] = await Promise.all([
      fetch(`${API}/api/my-record`, { headers: h }),
      fetch(`${API}/api/assignments`, { headers: h })
    ]);
    if (recRes.ok) setRecord(await recRes.json());
    if (asgRes.ok) setAssignments(await asgRes.json());
    setLoading(false);
  }, [auth.token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TABS = [
    { id: "grades",      label: "My Grades",      icon: "📊" },
    { id: "attendance",  label: "My Attendance",  icon: "📅" },
    { id: "assignments", label: "Assignments",     icon: "📝" }
  ];

  const filteredAsgn = subjectFilter === "ALL"
    ? assignments
    : assignments.filter(a => a.subject === subjectFilter);

  return (
    <div className="app-layout">
      <Sidebar auth={auth} logout={logout} tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading your data…</span></div>
        ) : (
          <>
            {activeTab === "grades" && record && <StudentGrades record={record} />}
            {activeTab === "attendance" && record && <StudentAttendance record={record} />}
            {activeTab === "assignments" && (
              <StudentAssignments
                assignments={filteredAsgn}
                subjectFilter={subjectFilter}
                setSubjectFilter={setSubjectFilter}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StudentGrades({ record }) {
  const avg = () => {
    const vals = Object.values(record.grades);
    if (!vals.length) return "N/A";
    const pts = { "A+":10,"A":9,"A-":8.5,"B+":8,"B":7,"B-":6.5,"C+":6,"C":5,"D":4,"F":0 };
    const sum = vals.reduce((s,g) => s + (pts[g] || 0), 0);
    return (sum / vals.length).toFixed(1);
  };

  return (
    <>
      <div className="page-header">
        <h2>📊 My Grades</h2>
        <p>Your subject-wise academic performance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">GPA (approx)</div>
          <div className="stat-value">{avg()}</div>
          <div className="stat-sub">out of 10.0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Subjects</div>
          <div className="stat-value">{SUBJECTS.length}</div>
          <div className="stat-sub">enrolled</div>
        </div>
      </div>

      <div className="subject-grid">
        {SUBJECTS.map(s => (
          <div className="subject-card" key={s}>
            <div className="subj-name">{s}</div>
            <div className={`subj-grade grade-badge ${gradeClass(record.grades[s])}`} style={{ fontSize: 28, padding: "6px 16px" }}>
              {record.grades[s] || "—"}
            </div>
            <div className="subj-label">Grade</div>
          </div>
        ))}
      </div>
    </>
  );
}

function StudentAttendance({ record }) {
  const overall = () => {
    const vals = Object.values(record.attendance);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };

  return (
    <>
      <div className="page-header">
        <h2>📅 My Attendance</h2>
        <p>Subject-wise attendance overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Overall</div>
          <div className="stat-value">{overall()}%</div>
          <div className="stat-sub">average attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {overall() >= 75 ? "✅ Good" : overall() >= 60 ? "⚠️ Low" : "❌ Short"}
          </div>
          <div className="stat-sub">{overall() < 75 ? "75% required" : "Keep it up!"}</div>
        </div>
      </div>

      <div className="card">
        <h3>📈 Subject-Wise Attendance</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attendance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map(s => {
                const v = record.attendance[s] || 0;
                return (
                  <tr key={s}>
                    <td><b>{s}</b></td>
                    <td><AttBar value={v} /></td>
                    <td>
                      <span className={`grade-badge ${v >= 75 ? "grade-a" : v >= 60 ? "grade-b" : "grade-f"}`}>
                        {v >= 75 ? "Regular" : v >= 60 ? "Low" : "Short"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StudentAssignments({ assignments, subjectFilter, setSubjectFilter }) {
  return (
    <>
      <div className="page-header">
        <h2>📝 Assignments</h2>
        <p>All assignments from your instructors</p>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${subjectFilter === "ALL" ? "active" : ""}`} onClick={() => setSubjectFilter("ALL")}>All</button>
        {SUBJECTS.map(s => (
          <button key={s} className={`filter-btn ${subjectFilter === s ? "active" : ""}`} onClick={() => setSubjectFilter(s)}>{s}</button>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h4>No Assignments Yet</h4>
          <p>Your admin hasn't posted any assignments for this subject.</p>
        </div>
      ) : (
        <div className="assignment-grid">
          {assignments.map((a, i) => (
            <div className="assignment-card" key={i}>
              <span className="asgn-subject">{a.subject}</span>
              <h4>{a.title}</h4>
              <p>{a.description}</p>
              {a.due_date && <div className="asgn-due">📅 Due: {a.due_date}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function AdminDashboard({ auth, logout }) {
  const [activeTab, setActiveTab]     = useState("students");
  const [students, setStudents]       = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [search, setSearch]           = useState("");
  const [toast, setToast]             = useState("");
  const [loading, setLoading]         = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const h = authHeaders(auth.token);
    const [stuRes, asgRes] = await Promise.all([
      fetch(`${API}/api/students`, { headers: h }),
      fetch(`${API}/api/assignments`, { headers: h })
    ]);
    if (stuRes.ok) setStudents(await stuRes.json());
    if (asgRes.ok) setAssignments(await asgRes.json());
    setLoading(false);
  }, [auth.token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showToast = (msg) => { setToast(msg); };

  const TABS = [
    { id: "students",    label: "Student List",      icon: "👥" },
    { id: "grades",      label: "Grades Overview",   icon: "📊" },
    { id: "attendance",  label: "Attendance",        icon: "📅" },
    { id: "create",      label: "Create Assignment", icon: "✏️" },
    { id: "assignments", label: "View Assignments",  icon: "📝" }
  ];

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAsgn = subjectFilter === "ALL"
    ? assignments
    : assignments.filter(a => a.subject === subjectFilter);

  return (
    <div className="app-layout">
      <Sidebar auth={auth} logout={logout} tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading data…</span></div>
        ) : (
          <>
            {activeTab === "students" && (
              <AdminStudentList
                students={filteredStudents}
                search={search}
                setSearch={setSearch}
                total={students.length}
              />
            )}
            {activeTab === "grades" && <AdminGrades students={students} />}
            {activeTab === "attendance" && <AdminAttendance students={students} />}
            {activeTab === "create" && (
              <AdminCreateAssignment
                token={auth.token}
                onSuccess={(msg) => { showToast(msg); fetchAll(); }}
              />
            )}
            {activeTab === "assignments" && (
              <AdminViewAssignments
                assignments={filteredAsgn}
                subjectFilter={subjectFilter}
                setSubjectFilter={setSubjectFilter}
              />
            )}
          </>
        )}
      </main>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
  );
}

function AdminStudentList({ students, search, setSearch, total }) {
  return (
    <>
      <div className="page-header">
        <h2>👥 Student List</h2>
        <p>All {total} enrolled students</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Subjects</div>
          <div className="stat-value">{SUBJECTS.length}</div>
        </div>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>PYTHON</th>
              <th>DBMS</th>
              <th>DMS</th>
              <th>SALESFORCE</th>
              <th>GCCF</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.email}>
                <td>{i + 1}</td>
                <td><b>{s.name}</b></td>
                <td style={{ color: "#9E9E9E", fontSize: 13 }}>{s.email}</td>
                {SUBJECTS.map(subj => (
                  <td key={subj}>
                    <span className={`grade-badge ${gradeClass(s.grades?.[subj])}`}>
                      {s.grades?.[subj] || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminGrades({ students }) {
  return (
    <>
      <div className="page-header">
        <h2>📊 Grades Overview</h2>
        <p>Subject-wise grades for all students</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              {SUBJECTS.map(s => <th key={s}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.email}>
                <td><b>{s.name}</b></td>
                {SUBJECTS.map(subj => (
                  <td key={subj}>
                    <span className={`grade-badge ${gradeClass(s.grades?.[subj])}`}>
                      {s.grades?.[subj] || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminAttendance({ students }) {
  return (
    <>
      <div className="page-header">
        <h2>📅 Attendance Overview</h2>
        <p>Subject-wise attendance for all students</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              {SUBJECTS.map(s => <th key={s}>{s}</th>)}
              <th>Overall</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const vals = SUBJECTS.map(subj => s.attendance?.[subj] || 0);
              const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              return (
                <tr key={s.email}>
                  <td><b>{s.name}</b></td>
                  {SUBJECTS.map(subj => (
                    <td key={subj} style={{ minWidth: 120 }}>
                      <AttBar value={s.attendance?.[subj] || 0} />
                    </td>
                  ))}
                  <td>
                    <span className={`grade-badge ${avg >= 75 ? "grade-a" : avg >= 60 ? "grade-b" : "grade-f"}`}>
                      {avg}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminCreateAssignment({ token, onSuccess }) {
  const [form, setForm] = useState({
    title: "", description: "", subject: "PYTHON", due_date: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/api/assignment`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onSuccess("Assignment created successfully!");
      setForm({ title: "", description: "", subject: "PYTHON", due_date: "" });
    } catch {
      setError("Failed to create assignment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>✏️ Create Assignment</h2>
        <p>Post a new assignment for students</p>
      </div>

      <div className="form-card">
        <h3>📋 New Assignment</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Subject</label>
              <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input
              placeholder="Assignment title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Describe what students need to do…"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "🚀 Create Assignment"}
          </button>
        </form>
      </div>
    </>
  );
}

function AdminViewAssignments({ assignments, subjectFilter, setSubjectFilter }) {
  return (
    <>
      <div className="page-header">
        <h2>📝 All Assignments</h2>
        <p>{assignments.length} assignment{assignments.length !== 1 ? "s" : ""} posted</p>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${subjectFilter === "ALL" ? "active" : ""}`} onClick={() => setSubjectFilter("ALL")}>All</button>
        {SUBJECTS.map(s => (
          <button key={s} className={`filter-btn ${subjectFilter === s ? "active" : ""}`} onClick={() => setSubjectFilter(s)}>{s}</button>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h4>No Assignments</h4>
          <p>Create your first assignment from the sidebar.</p>
        </div>
      ) : (
        <div className="assignment-grid">
          {assignments.map((a, i) => (
            <div className="assignment-card" key={i}>
              <span className="asgn-subject">{a.subject}</span>
              <h4>{a.title}</h4>
              <p>{a.description}</p>
              {a.due_date && <div className="asgn-due">📅 Due: {a.due_date}</div>}
              {a.created_by && (
                <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 8 }}>
                  Posted by {a.created_by}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}