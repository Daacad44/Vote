import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import "./index.css";
import { api } from "./lib/api";
import type { Election, User } from "./types";

type View = "landing" | "candidate" | "elections" | "admin";
type AdminTab = "elections" | "candidates" | "users" | "technical";

type CandidateReview = {
  id: string;
  name: string;
  party?: string | null;
  manifesto?: string | null;
  photoUrl?: string | null;
  approved: boolean;
  election: { id: string; title: string };
  owner?: { name: string | null; stdId: string } | null;
};

type UserSummary = {
  id: string;
  stdId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STUDENT";
  isVerified: boolean;
  createdAt: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

type LoadingState = {
  login: boolean;
  register: boolean;
  otp: boolean;
  candidate: boolean;
  election: boolean;
};

const featureCards = [
  {
    title: "Secure Voting",
    description:
      "Advanced encryption and authentication ensure your vote remains private and secure",
    icon: "[SV]",
  },
  {
    title: "Easy Registration",
    description:
      "Simple registration process for voters and candidates with email verification",
    icon: "[ER]",
  },
  {
    title: "Real-time Results",
    description:
      "View live election results and statistics as voting progresses",
    icon: "[RR]",
  },
];

const adminTabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: "elections", label: "Elections", icon: "[E]" },
  { id: "candidates", label: "Candidates", icon: "[C]" },
  { id: "users", label: "Users", icon: "[U]" },
  { id: "technical", label: "Technical", icon: "[T]" },
];

const SOMALIA_TIMEZONE = "Africa/Mogadishu";

const initialCandidateForm = {
  electionId: "",
  name: "",
  party: "",
  photoUrl: "",
  manifesto: "",
};

function formatSomaliaTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: SOMALIA_TIMEZONE,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function App() {
  const [view, setView] = useState<View>("landing");
  const [adminTab, setAdminTab] = useState<AdminTab>("elections");
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("votesecure.token"),
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("votesecure.user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [elections, setElections] = useState<Election[]>([]);
  const [candidateReviews, setCandidateReviews] = useState<CandidateReview[]>(
    [],
  );
  const [userDirectory, setUserDirectory] = useState<UserSummary[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    login: false,
    register: false,
    otp: false,
    candidate: false,
    election: false,
  });
  const [showRegister, setShowRegister] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpStdId, setOtpStdId] = useState("");
  const [candidateForm, setCandidateForm] = useState(initialCandidateForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roleMutationId, setRoleMutationId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = Boolean(user && (user.role === "ADMIN" || isSuperAdmin));

  const notify = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const fetchElections = useCallback(async () => {
    try {
      const data = await api<{ elections: Election[] }>("/elections");
      setElections(data.elections);
    } catch (error) {
      console.error(error);
      notify((error as Error).message, "error");
    }
  }, [notify]);

  const fetchCandidateReviews = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ candidates: CandidateReview[] }>(
        "/candidates/review",
        {
          token,
        },
      );
      setCandidateReviews(data.candidates);
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }, [notify, token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ users: UserSummary[] }>("/admin/users", {
        token,
      });
      setUserDirectory(data.users);
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }, [notify, token]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  useEffect(() => {
    if (!user) {
      localStorage.removeItem("votesecure.user");
      return;
    }
    localStorage.setItem("votesecure.user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("votesecure.token", token);
    } else {
      localStorage.removeItem("votesecure.token");
    }
  }, [token]);

  useEffect(() => {
    if (!user) {
      setCandidateForm(initialCandidateForm);
      return;
    }
    setCandidateForm((prev) => ({
      ...prev,
      name: prev.name || user.name,
    }));
  }, [user]);

  useEffect(() => {
    if (view !== "admin" || !isAdmin) return;
    if (adminTab === "candidates") {
      fetchCandidateReviews();
    }
    if (adminTab === "users") {
      fetchUsers();
    }
  }, [adminTab, fetchCandidateReviews, fetchUsers, isAdmin, view]);

  const userInitials = useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setLoading((prev) => ({ ...prev, login: true }));
      const data = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: payload,
      });
      setToken(data.token);
      setUser(data.user);
      notify(`Welcome back, ${data.user.name}!`);
      event.currentTarget.reset();
      setView("elections");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setLoading((prev) => ({ ...prev, register: true }));
      await api("/auth/register", { method: "POST", body: payload });
      notify("Registration successful. Check your email for the OTP code.");
      setOtpStdId(payload.stdId as string);
      setShowRegister(false);
      setShowOtp(true);
      event.currentTarget.reset();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, register: false }));
    }
  };

  const handleOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setLoading((prev) => ({ ...prev, otp: true }));
      await api("/auth/otp/verify", {
        method: "POST",
        body: payload,
      });
      notify("OTP verified. You can now log in.");
      setShowOtp(false);
      event.currentTarget.reset();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, otp: false }));
    }
  };

  const resendOtp = async () => {
    if (!otpStdId) {
      notify("Provide your student ID first.", "error");
      return;
    }
    try {
      await api("/auth/otp/resend", {
        method: "POST",
        body: { stdId: otpStdId },
      });
      notify("New OTP sent.");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setView("landing");
    notify("Signed out.");
  };

  const handleCreateElection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      notify("Admin authentication required.", "error");
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setLoading((prev) => ({ ...prev, election: true }));
      await api("/elections", {
        method: "POST",
        token,
        body: payload,
      });
      notify("Election created successfully.");
      setShowCreateForm(false);
      event.currentTarget.reset();
      fetchElections();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, election: false }));
    }
  };

  const handleCandidateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      notify("Log in to submit an application.", "error");
      return;
    }
    try {
      setLoading((prev) => ({ ...prev, candidate: true }));
      await api("/candidates/apply", {
        method: "POST",
        token,
        body: candidateForm,
      });
      notify("Application submitted.");
      setCandidateForm(initialCandidateForm);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, candidate: false }));
    }
  };

  const handleCandidateApproval = async (id: string, approved: boolean) => {
    if (!token) return;
    try {
      await api(`/candidates/${id}/approval`, {
        method: "PATCH",
        token,
        body: { approved },
      });
      notify(`Candidate ${approved ? "approved" : "rejected"}.`);
      fetchCandidateReviews();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleVote = async (electionId: string, candidateId: string) => {
    if (!token) {
      notify("Login to vote in this election.", "error");
      return;
    }
    try {
      await api("/votes", {
        method: "POST",
        token,
        body: { electionId, candidateId },
      });
      notify("Vote submitted successfully.");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleRoleChange = async (targetId: string, role: User["role"]) => {
    if (!token) {
      notify("Authentication required.", "error");
      return;
    }
    try {
      setRoleMutationId(`${targetId}-${role}`);
      await api(`/admin/users/${targetId}/role`, {
        method: "PATCH",
        token,
        body: { role },
      });
      notify("User role updated.");
      await fetchUsers();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setRoleMutationId(null);
    }
  };

  const renderLanding = () => (
    <section className="landing">
      <div className="hero-card">
        <p className="eyebrow">VoteSecure</p>
        <h1>Secure Digital Voting</h1>
        <p className="hero-copy">
          Participate in transparent, secure, and accessible elections with our
          advanced voting platform.
        </p>
        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="login-panel">
        <div className="panel">
          <h3>Login</h3>
          <p className="muted">Enter your credentials to access your account</p>
          <form className="stack" onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input
                name="stdId"
                placeholder="Email"
                required
                disabled={loading.login}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                disabled={loading.login}
              />
            </div>
            <button className="primary-btn" type="submit" disabled={loading.login}>
              {loading.login ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="muted">
            {"Don't have an account? "}
            <button
              className="text-link"
              type="button"
              onClick={() => setShowRegister(true)}
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </section>
  );

  const renderCandidateForm = () => (
    <section className="view-wrap">
      <div className="panel form-panel">
        <h2>Candidate Application</h2>
        <p className="muted">Apply to become a candidate in upcoming elections</p>
        {!user && (
          <div className="empty-state">Please login to submit your application.</div>
        )}
        {user && (
          <form className="stack" onSubmit={handleCandidateSubmit}>
            <div className="field">
              <label>Select Election *</label>
              <select
                value={candidateForm.electionId}
                required
                onChange={(event) =>
                  setCandidateForm((prev) => ({
                    ...prev,
                    electionId: event.target.value,
                  }))
                }
              >
                <option value="">Choose an election</option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Full Name *</label>
              <input
                value={candidateForm.name}
                onChange={(event) =>
                  setCandidateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label>Political Party *</label>
              <input
                value={candidateForm.party}
                onChange={(event) =>
                  setCandidateForm((prev) => ({ ...prev, party: event.target.value }))
                }
                required
                placeholder="e.g., Democratic Party, Independent"
              />
            </div>
            <div className="field">
              <label>Photo URL</label>
              <input
                type="url"
                value={candidateForm.photoUrl}
                placeholder="https://example.com/photo.jpg"
                onChange={(event) =>
                  setCandidateForm((prev) => ({
                    ...prev,
                    photoUrl: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label>Manifesto / Platform</label>
              <textarea
                rows={4}
                value={candidateForm.manifesto}
                placeholder="Describe your platform and what you stand for"
                onChange={(event) =>
                  setCandidateForm((prev) => ({
                    ...prev,
                    manifesto: event.target.value,
                  }))
                }
              />
            </div>
            <div className="action-row">
              <button
                className="primary-btn"
                type="submit"
                disabled={loading.candidate}
              >
                {loading.candidate ? "Submitting..." : "Submit Application"}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setCandidateForm(initialCandidateForm)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  const renderElections = () => (
    <section className="view-wrap">
      <div className="section-heading">
        <h2>Available Elections</h2>
        <p className="muted">View and participate in ongoing and upcoming elections</p>
      </div>
      {elections.length === 0 ? (
        <div className="empty-state">No elections available</div>
      ) : (
        elections.map((election) => (
          <article className="election-card" key={election.id}>
            <div className="card-header">
              <div>
                <h3>{election.title}</h3>
                <p className="muted">{election.description}</p>
              </div>
              <span className={`status-pill status-${election.status.toLowerCase()}`}>
                {election.status}
              </span>
            </div>
            <p className="muted">
              Start: {formatSomaliaTime(election.startTime)}
              <br />
              End: {formatSomaliaTime(election.endTime)}
            </p>
            {election.candidates.length === 0 ? (
              <p className="muted">No approved candidates yet.</p>
            ) : (
              <div className="candidate-list">
                {election.candidates.map((candidate) => (
                  <div className="candidate-row" key={candidate.id}>
                    <div>
                      <strong>{candidate.name}</strong>
                      <p className="muted">{candidate.party ?? "Independent"}</p>
                    </div>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={election.status !== "OPEN"}
                      onClick={() => handleVote(election.id, candidate.id)}
                    >
                      {election.status === "OPEN" ? "Vote" : election.status}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );

  const renderAdmin = () => (
    <section className="view-wrap">
      <div className="section-heading">
        <h2>Admin Dashboard</h2>
        <p className="muted">Manage elections, candidates, users, and system settings</p>
      </div>
      {!isAdmin ? (
        <div className="empty-state">Admin access is required to view this area.</div>
      ) : (
        <>
          <div className="admin-tabs">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab ${tab.id === adminTab ? "active" : ""}`}
                onClick={() => setAdminTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          {adminTab === "elections" && (
            <div className="panel admin-panel">
              <div className="admin-heading">
                <div>
                  <h3>Election Management</h3>
                  <p className="muted">
                    All times are shown in Somalia Time (GMT+3).{" "}
                    {isSuperAdmin
                      ? "You have full control over creating and updating elections."
                      : "Read-only access. Contact a super admin to make changes."}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => setShowCreateForm((prev) => !prev)}
                  >
                    {showCreateForm ? "Close" : "+ Create Election"}
                  </button>
                )}
              </div>
              {isSuperAdmin && showCreateForm && (
                <form className="stack" onSubmit={handleCreateElection}>
                  <div className="field">
                    <label>Title</label>
                    <input name="title" required />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea name="description" rows={3} />
                  </div>
                  <div className="field">
                    <label>Start Time</label>
                    <input name="startTime" type="datetime-local" required />
                  </div>
                  <div className="field">
                    <label>End Time</label>
                    <input name="endTime" type="datetime-local" required />
                  </div>
                  <button className="primary-btn" type="submit" disabled={loading.election}>
                    {loading.election ? "Saving..." : "Save Election"}
                  </button>
                </form>
              )}
              {!isSuperAdmin && (
                <div className="empty-state">
                  Only SUPER_ADMIN accounts can create or update elections.
                </div>
              )}
              {elections.length === 0 && <div className="empty-state">No elections yet.</div>}
              {elections.map((election) => (
                <article className="election-card" key={election.id}>
                  <div className="card-header">
                    <div>
                      <h3>{election.title}</h3>
                      <p className="muted">{election.description}</p>
                    </div>
                    <span className={`status-pill status-${election.status.toLowerCase()}`}>
                      {election.status}
                    </span>
                  </div>
                  <p className="muted">
                    Start: {formatSomaliaTime(election.startTime)}
                    <br />
                    End: {formatSomaliaTime(election.endTime)}
                  </p>
                </article>
              ))}
            </div>
          )}
          {adminTab === "candidates" && (
            <div className="panel admin-panel">
              <h3>Candidate Management</h3>
              {candidateReviews.length === 0 ? (
                <div className="empty-state">No pending applications</div>
              ) : (
                candidateReviews.map((candidate) => (
                  <div className="candidate-card" key={candidate.id}>
                    <div className="candidate-header">
                      <div className="avatar-circle">
                        {candidate.photoUrl ? (
                          <img src={candidate.photoUrl} alt={candidate.name} />
                        ) : (
                          <span>{candidate.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <strong>{candidate.name}</strong>
                        <p className="muted">
                          {(candidate.party ?? "Independent") +
                            " - " +
                            candidate.election.title}
                        </p>
                      </div>
                      <span className="status-pill">Pending</span>
                    </div>
                    <p className="muted">
                      Manifesto: {candidate.manifesto ?? "Not provided"}
                    </p>
                    <div className="action-row">
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => handleCandidateApproval(candidate.id, true)}
                      >
                        Approve
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => handleCandidateApproval(candidate.id, false)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {adminTab === "users" && (
            <div className="panel admin-panel">
              <div className="admin-heading">
                <div>
                  <h3>User Directory</h3>
                  <p className="muted">
                    Segment super admins, admins, and verified voters. Only super admins
                    can change roles.
                  </p>
                </div>
              </div>
              {userDirectory.length === 0 ? (
                <div className="empty-state">No users found.</div>
              ) : (
                [
                  {
                    key: "super",
                    title: "Super Admins",
                    description: "Complete platform control",
                    entries: userDirectory.filter((entry) => entry.role === "SUPER_ADMIN"),
                  },
                  {
                    key: "admins",
                    title: "Admins",
                    description: "Election and candidate management",
                    entries: userDirectory.filter((entry) => entry.role === "ADMIN"),
                  },
                  {
                    key: "students",
                    title: "Users",
                    description: "Verified voters and candidates",
                    entries: userDirectory.filter((entry) => entry.role === "STUDENT"),
                  },
                ].map((group) => (
                  <div className="user-group" key={group.key}>
                    <div className="user-group-header">
                      <div>
                        <h4>{group.title}</h4>
                        <p className="muted">{group.description}</p>
                      </div>
                      <span className="group-count">
                        {group.entries.length}{" "}
                        {group.entries.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    {group.entries.length === 0 ? (
                      <div className="empty-state">No {group.title.toLowerCase()} yet.</div>
                    ) : (
                      group.entries.map((entry) => {
                        const promoteButtons: Array<{
                          label: string;
                          role: User["role"];
                          tone: "primary" | "danger";
                        }> = [];

                        if (entry.role === "STUDENT") {
                          promoteButtons.push({
                            label: "Promote to Admin",
                            role: "ADMIN",
                            tone: "primary",
                          });
                        }
                        if (entry.role === "ADMIN") {
                          promoteButtons.push({
                            label: "Promote to Super",
                            role: "SUPER_ADMIN",
                            tone: "primary",
                          });
                          promoteButtons.push({
                            label: "Demote to User",
                            role: "STUDENT",
                            tone: "danger",
                          });
                        }
                        if (entry.role === "SUPER_ADMIN") {
                          promoteButtons.push({
                            label: "Demote to Admin",
                            role: "ADMIN",
                            tone: "danger",
                          });
                        }

                        return (
                          <div className="user-card" key={entry.id}>
                            <div>
                              <strong>{entry.name}</strong>
                              <p className="muted">
                                {entry.email} • {entry.stdId} •{" "}
                                {entry.isVerified ? "Verified" : "Pending"}
                              </p>
                            </div>
                            <div className="user-row-actions">
                              <span className="status-pill role-pill">
                                {entry.role.replace("_", " ")}
                              </span>
                              {isSuperAdmin && entry.id !== user?.id && promoteButtons.length > 0 && (
                                <div className="user-actions">
                                  {promoteButtons.map((action) => {
                                    const key = `${entry.id}-${action.role}`;
                                    const busy = roleMutationId === key;
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        className={`user-action-btn ${
                                          action.tone === "danger" ? "danger" : ""
                                        }`}
                                        disabled={busy}
                                        onClick={() => handleRoleChange(entry.id, action.role)}
                                      >
                                        {busy ? "Updating..." : action.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {adminTab === "technical" && (
            <div className="panel admin-panel">
              <h3>Technical Support</h3>
              <p className="muted">
                Reach out to the technical team for infrastructure, monitoring, and
                incident response support.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <button className="brand" type="button" onClick={() => setView("landing")}>
          <span className="brand-icon">VS</span>
          <strong>VoteSecure</strong>
        </button>
        <div className="nav-links">
          <button
            type="button"
            className={`nav-link ${view === "candidate" ? "active" : ""}`}
            onClick={() => setView("candidate")}
          >
            Apply as Candidate
          </button>
          <button
            type="button"
            className={`nav-link ${view === "admin" ? "active" : ""}`}
            onClick={() => setView("admin")}
          >
            Admin Panel
          </button>
          <button
            type="button"
            className={`nav-link ${view === "elections" ? "active" : ""}`}
            onClick={() => setView("elections")}
          >
            Elections
          </button>
          {user ? (
            <div className="nav-auth">
              <div className="nav-avatar">{userInitials}</div>
              <button className="text-link" type="button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="primary-btn"
              type="button"
              onClick={() => setView("landing")}
            >
              Sign In
            </button>
          )}
        </div>
      </header>
      <p className="login-hint">Please login to access voting features</p>
      <main className="main-content">
        {view === "landing" && renderLanding()}
        {view === "candidate" && renderCandidateForm()}
        {view === "elections" && renderElections()}
        {view === "admin" && renderAdmin()}
      </main>
      {showRegister && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Create account</h3>
            <form className="stack" onSubmit={handleRegister}>
              <div className="field">
                <label>Student ID</label>
                <input name="stdId" required />
              </div>
              <div className="field">
                <label>Full name</label>
                <input name="name" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div className="field">
                <label>Faculty</label>
                <input name="faculty" />
              </div>
              <div className="field">
                <label>Department</label>
                <input name="department" />
              </div>
              <div className="field">
                <label>Password</label>
                <input name="password" type="password" required />
              </div>
              <div className="action-row">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={loading.register}
                >
                  {loading.register ? "Submitting..." : "Register"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowRegister(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showOtp && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Verify OTP</h3>
            <form className="stack" onSubmit={handleOtp}>
              <div className="field">
                <label>Student ID</label>
                <input
                  name="stdId"
                  value={otpStdId}
                  onChange={(event) => setOtpStdId(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>OTP code</label>
                <input name="code" maxLength={6} pattern="\\d{6}" required />
              </div>
              <div className="action-row">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={loading.otp}
                >
                  {loading.otp ? "Verifying..." : "Verify"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={resendOtp}
                >
                  Resend code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;



