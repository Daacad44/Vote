import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import "./App.css";
import "./index.css";
import { SectionCard } from "./components/SectionCard";
import { api } from "./lib/api";
import type { Election, ElectionResult, User } from "./types";

type ToastState = {
  type: "success" | "error";
  message: string;
};

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("votesecure.token"),
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("votesecure.user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [elections, setElections] = useState<Election[]>([]);
  const [results, setResults] = useState<Record<string, ElectionResult[]>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [otpStdId, setOtpStdId] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [socketStatus, setSocketStatus] = useState<
    "connected" | "disconnected"
  >("disconnected");

  const isAdmin = user?.role === "ADMIN";

  const notify = useCallback((message: string, type: ToastState["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchElections = useCallback(async () => {
    try {
      const data = await api<{ elections: Election[] }>("/elections");
      setElections(data.elections);
    } catch (error) {
      console.error(error);
      notify((error as Error).message);
    }
  }, [notify]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("votesecure.token", token);
    } else {
      localStorage.removeItem("votesecure.token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("votesecure.user", JSON.stringify(user));
    } else {
      localStorage.removeItem("votesecure.user");
    }
  }, [user]);

  useEffect(() => {
    if (!token) {
      setSocketStatus("disconnected");
      return;
    }

    const socket: Socket = io(SOCKET_URL);
    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on(
      "resultsUpdated",
      (payload: { electionId: string; results: ElectionResult[] }) => {
        setResults((prev) => ({
          ...prev,
          [payload.electionId]: payload.results,
        }));
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;

    try {
      setIsBusy(true);
      await api("/auth/register", {
        method: "POST",
        body: payload,
      });

      notify("Registered successfully. Check your email for the OTP.");
      setOtpStdId(payload.stdId as string);
      setShowOtp(true);
      event.currentTarget.reset();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setIsBusy(true);
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
      setIsBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!otpStdId) {
      notify("Register first so we know your student ID.", "error");
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      setIsBusy(true);
      const data = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: payload,
      });
      setToken(data.token);
      setUser(data.user);
      notify(`Welcome back, ${data.user.name}!`);
      event.currentTarget.reset();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setResults({});
    notify("Signed out.");
  };

  const loadResults = async (electionId: string) => {
    if (!token) {
      notify("Log in to view secure results.", "error");
      return;
    }

    try {
      const data = await api<{ results: ElectionResult[] }>(
        `/votes/election/${electionId}`,
        { token },
      );
      setResults((prev) => ({ ...prev, [electionId]: data.results }));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleVote = async (electionId: string, candidateId: string) => {
    if (!token) {
      notify("Please log in before voting.", "error");
      return;
    }

    try {
      await api("/votes", {
        method: "POST",
        token,
        body: { electionId, candidateId },
      });
      notify("Vote submitted securely.");
      await loadResults(electionId);
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateElection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;

    try {
      await api("/elections", {
        method: "POST",
        token,
        body: payload,
      });
      notify("Election created.");
      event.currentTarget.reset();
      fetchElections();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    if (!file) {
      notify("Attach a CSV file.", "error");
      return;
    }
    const payload = new FormData();
    payload.append("file", file);
    try {
      await api("/admin/users/import", {
        method: "POST",
        token,
        body: payload,
      });
      notify("CSV imported");
      event.currentTarget.reset();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const formatWindow = useCallback((start: string, end: string) => {
    return `${new Date(start).toLocaleString()} – ${new Date(end).toLocaleString()}`;
  }, []);

  const heroSubtitle = useMemo(() => {
    if (user) {
      return `Logged in as ${user.name} (${user.role}).`;
    }
    return "Register, verify via OTP, and start voting securely.";
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-10 rounded-3xl bg-gradient-to-r from-primary to-indigo-600 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-widest">
            VoteSecure MVP
          </p>
          <h1 className="mt-4 text-4xl font-bold">
            Secure digital elections for every campus
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-100">
            {heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-200">
            <span>🔐 AES-256 encrypted ballots</span>
            <span>📡 Live Socket.io results</span>
            <span>🧾 Audit-ready admin tooling</span>
            <span>
              📶 Live updates:{" "}
              <strong className="font-semibold">
                {socketStatus === "connected" ? "Online" : "Offline"}
              </strong>
            </span>
          </div>
          {user && (
            <button
              className="mt-6 bg-white/20 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              onClick={handleLogout}
            >
              Sign out
            </button>
          )}
        </header>

        {toast && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {toast.message}
          </div>
        )}

        {!user && (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="New voter registration"
              subtitle="Provision your account and receive an OTP via email."
            >
              <form className="space-y-3" onSubmit={handleRegister}>
                <input
                  name="stdId"
                  placeholder="Student ID"
                  required
                  disabled={isBusy}
                />
                <input
                  name="name"
                  placeholder="Full name"
                  required
                  disabled={isBusy}
                />
                <input
                  name="email"
                  placeholder="Institutional email"
                  type="email"
                  required
                  disabled={isBusy}
                />
                <input
                  name="faculty"
                  placeholder="Faculty"
                  disabled={isBusy}
                />
                <input
                  name="department"
                  placeholder="Department"
                  disabled={isBusy}
                />
                <input
                  name="password"
                  placeholder="Create a password"
                  type="password"
                  required
                  disabled={isBusy}
                />
                <button type="submit" disabled={isBusy}>
                  {isBusy ? "Submitting..." : "Register & send OTP"}
                </button>
              </form>
            </SectionCard>

            <SectionCard
              title="Secure login"
              subtitle="Verified voters can authenticate with JWT."
            >
              <form className="space-y-3" onSubmit={handleLogin}>
                <input
                  name="stdId"
                  placeholder="Student ID"
                  required
                  disabled={isBusy}
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  disabled={isBusy}
                />
                <button type="submit" disabled={isBusy}>
                  {isBusy ? "Signing in..." : "Login"}
                </button>
              </form>
              <p className="mt-4 text-sm text-slate-500">
                Need to verify your OTP?{" "}
                <button
                  type="button"
                  className="text-indigo-600"
                  onClick={() => {
                    setShowOtp(true);
                  }}
                >
                  Open OTP form
                </button>
              </p>
            </SectionCard>
          </div>
        )}

        {showOtp && !user && (
          <div className="mt-6">
            <SectionCard
              title="OTP verification"
              subtitle="Submit the 6 digit code from your inbox."
              actions={
                <button type="button" onClick={resendOtp}>
                  Resend code
                </button>
              }
            >
              <form className="space-y-3" onSubmit={handleOtp}>
                <input
                  name="stdId"
                  placeholder="Student ID"
                  value={otpStdId}
                  onChange={(e) => setOtpStdId(e.target.value)}
                  required
                />
                <input
                  name="code"
                  placeholder="OTP code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                />
                <button type="submit">Verify OTP</button>
              </form>
            </SectionCard>
          </div>
        )}

        {user && (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Active elections"
              subtitle="Monitor timelines, candidates, and statuses."
            >
              <div className="space-y-4">
                {elections.map((election) => (
                  <div
                    key={election.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {election.title}
                        </h3>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {formatWindow(election.startTime, election.endTime)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {election.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {election.description}
                    </p>
                    <div className="mt-4 space-y-2">
                      {election.candidates.length ? (
                        election.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                          >
                            <div>
                              <p className="font-semibold">{candidate.name}</p>
                              <p className="text-xs text-slate-500">
                                {candidate.party ?? "Independent"}
                              </p>
                            </div>
                            {election.status === "OPEN" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVote(election.id, candidate.id)
                                }
                              >
                                Vote
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No approved candidates yet.
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => loadResults(election.id)}
                        className="bg-slate-900 text-sm"
                      >
                        Refresh results
                      </button>
                      {results[election.id] && (
                        <div className="text-sm text-slate-600">
                          Live votes:{" "}
                          <strong>
                            {results[election.id]?.reduce(
                              (sum, row) => sum + row.votes,
                              0,
                            )}
                          </strong>
                        </div>
                      )}
                    </div>
                    {results[election.id] && (
                      <div className="mt-4 space-y-2 text-sm">
                        {results[election.id]!.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                          >
                            <span>
                              {row.name}{" "}
                              <span className="text-xs text-slate-500">
                                {row.party ?? "Independent"}
                              </span>
                            </span>
                            <strong>{row.votes} votes</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {isAdmin && (
              <div className="space-y-6">
                <SectionCard
                  title="Create election"
                  subtitle="Define windows and copy candidates later."
                >
                  <form
                    className="space-y-3"
                    onSubmit={handleCreateElection}
                  >
                    <input name="title" placeholder="Title" required />
                    <textarea
                      name="description"
                      placeholder="Description"
                      className="min-h-[80px]"
                    />
                    <label className="block text-sm text-slate-500">
                      Start time
                      <input
                        name="startTime"
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label className="block text-sm text-slate-500">
                      End time
                      <input name="endTime" type="datetime-local" required />
                    </label>
                    <button type="submit">Save election</button>
                  </form>
                </SectionCard>
                <SectionCard
                  title="Student CSV import"
                  subtitle="Upsert student accounts with stdId and email."
                >
                  <form className="space-y-3" onSubmit={handleImport}>
                    <input name="file" type="file" accept=".csv" required />
                    <button type="submit">Upload CSV</button>
                  </form>
                </SectionCard>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
