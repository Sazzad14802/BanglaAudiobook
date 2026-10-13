import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { request, setToken, documentUrl } from "./api";
import "./styles.css";

type Row = Record<string, any>;
const navigation = [
  ["Overview", "summary"],
  ["People", "users"],
  ["Publisher verification", "applications"],
  ["Audiobooks", "audiobooks"],
  ["Channels", "channels"],
  ["Content reports", "reports"],
  ["Generation policy", "settings"],
  ["Subscription plans", "plans"],
  ["Payments", "payments"],
  ["Refunds & adjustments", "adjustments"],
  ["Financial reporting", "finance"],
  ["Withdrawals", "withdrawals"],
  ["Audit history", "audit"],
];
const label = (text: string) =>
  text.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const money = (value: unknown) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(
    Number(value),
  );
export function App() {
  const [user, setUser] = useState<Row | null>(null);
  const [page, setPage] = useState("summary");
  const [rows, setRows] = useState<any>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [number, setNumber] = useState(1);
  const [decision, setDecision] = useState<{
    path: string;
    action: string;
    name: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [audio, setAudio] = useState<Row[]>([]);
  const [document, setDocument] = useState("");
  const [plan, setPlan] = useState<Row | null>(null);
  const requestSequence = useRef(0);

  async function load() {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError("");
    try {
      const result = await request(
        `/admin/${page}?page=${number}&q=${encodeURIComponent(search)}${role ? `&account_type=${role}` : ""}`,
      );
      if (sequence === requestSequence.current) setRows(result);
    } catch (e) {
      if (sequence === requestSequence.current) {
        setError((e as Error).message);
        setRows(null);
      }
    } finally {
      if (sequence === requestSequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (user) {
      const timer = setTimeout(load, 250);
      return () => {
        clearTimeout(timer);
        requestSequence.current++;
      };
    }
  }, [user, page, number, search, role]);
  useEffect(
    () => () => {
      if (document) URL.revokeObjectURL(document);
    },
    [document],
  );
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(path, method, body);
      setNotice("Changes saved.");
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function decide(path: string, action: string, name: string) {
    setReason("");
    setDecision({ path, action, name });
  }
  async function listen(id: string) {
    try {
      const data = await request(`/audiobooks/${id}/play`, "POST");
      setAudio(data.chapters);
      if (!data.chapters.length)
        setNotice("No audio chunks are available yet.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!user) return <Login onLogin={setUser} />;
  const title = navigation.find((n) => n[1] === page)?.[0] || "";
  return (
    <div className="shell">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("summary");
          }}
        >
          <span className="brand-mark">ব</span>
          <span>
            BanglaBook<small>ADMINISTRATION</small>
          </span>
        </a>
        <div className="workspace">
          Workspace <span>Platform operations</span>
        </div>
        <nav aria-label="Administration">
          {navigation.map(([name, key], i) => (
            <button
              key={key}
              className={page === key ? "selected" : ""}
              onClick={() => {
                setPage(key);
                setRows(null);
                setSearch("");
                setRole("");
                setNumber(1);
                setNotice("");
              }}
            >
              <span className="nav-num">{String(i + 1).padStart(2, "0")}</span>
              {name}
            </button>
          ))}
        </nav>
        <div className="account">
          <strong>{user.username}</strong>
          <small>Administrator</small>
          <button
            onClick={async () => {
              await request("/auth/logout", "POST").catch(() => {});
              setToken("");
              setUser(null);
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">BANGLABOOK / OPERATIONS</p>
            <h1>{title}</h1>
          </div>
          <button className="secondary" disabled={busy} onClick={load}>
            ↻ Refresh
          </button>
        </header>
        {page === "summary" && (
          <div className="intro">
            <div>
              <span className="eyebrow">YOUR PLATFORM, AT A GLANCE</span>
              <h2>A home for every story.</h2>
              <p>
                Review publishers, protect your catalog, and keep the listening
                experience running smoothly.
              </p>
            </div>
            <span className="intro-art" aria-hidden="true">
              বই
            </span>
          </div>
        )}
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
          </div>
        )}
        {["users", "audiobooks"].includes(page) && (
          <div className="toolbar">
            <input
              aria-label="Search"
              placeholder={
                page === "users"
                  ? "Search email or username…"
                  : "Search audiobook title…"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setNumber(1);
              }}
            />
            {page === "users" && (
              <select
                aria-label="Account type"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setNumber(1);
                }}
              >
                <option value="">All account types</option>
                <option>listener</option>
                <option>publisher</option>
                <option>admin</option>
              </select>
            )}
          </div>
        )}
        {busy && <p role="status">Loading…</p>}
        {!busy && rows && page === "summary" && (
          <>
            <div className="metrics">
              {Object.entries(rows).map(([key, value]) => (
                <article key={key}>
                  <span>{label(key)}</span>
                  <strong>{String(value)}</strong>
                  <small>Current database total</small>
                </article>
              ))}
            </div>
            <section className="panel">
              <h2>Review queue</h2>
              <p>
                Publisher activation requires document approval and a confirmed
                registration payment.
              </p>
              <button onClick={() => setPage("applications")}>
                Review publisher applications →
              </button>
            </section>
          </>
        )}
        {!busy && rows && page === "settings" && (
          <form
            className="panel form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              await mutate("/admin/settings", "PUT", rows);
            }}
          >
            <div className="full">
              <h2>Generation & revenue policy</h2>
              <p>
                Quotas reset on calendar months in Asia/Dhaka. Retries within a
                request do not consume another slot.
              </p>
            </div>
            {Object.entries(rows).map(([key, value]) => (
              <label key={key}>
                {label(key)}
                {key === "revenue_base" ? (
                  <select value={String(value)} disabled>
                    <option value="gross_confirmed_subscription_receipts">
                      Confirmed subscription receipts (gross)
                    </option>
                  </select>
                ) : (
                  <input
                    required
                    type="number"
                    step={key === "publisher_fee" ? ".01" : "1"}
                    min="0"
                    value={String(value)}
                    onChange={(e) =>
                      setRows({
                        ...rows,
                        [key]:
                          key === "publisher_fee"
                            ? e.target.value
                            : Number(e.target.value),
                      })
                    }
                  />
                )}
              </label>
            ))}
            <div className="full">
              <p>
                Registration fees are excluded from the publisher pool. Taxes,
                gateway fees and refunds require an explicit accounting policy
                before production.
              </p>
              <button disabled={busy}>Save policy</button>
            </div>
          </form>
        )}
        {!busy && rows && page === "finance" && (
          <>
            <div className="metrics">
              {Object.entries(rows)
                .filter(([k]) => k !== "snapshots")
                .map(([k, v]) => (
                  <article key={k}>
                    <span>{label(k)}</span>
                    <strong>{money(v)}</strong>
                  </article>
                ))}
            </div>
            <form
              className="panel toolbar"
              onSubmit={async (e) => {
                e.preventDefault();
                const month = new FormData(e.currentTarget).get("month");
                await mutate(`/admin/finance/close/${month}`, "POST");
              }}
            >
              <label>
                Close completed month
                <input name="month" type="month" required />
              </label>
              <button>Calculate & close month</button>
              <p>
                Snapshots are immutable. No eligible views leaves the pool as an
                unallocated liability.
              </p>
            </form>
            <DataTable
              rows={rows.snapshots}
              columns={[
                "month",
                "revenue",
                "publisher_pool",
                "platform_share",
                "created_at",
              ]}
            />
          </>
        )}
        {!busy && page === "adjustments" && (
          <AdjustmentForm
            submit={async (body) => mutate("/admin/adjustments", "POST", body)}
          />
        )}
        {!busy && Array.isArray(rows) && (
          <>
            {page === "plans" && (
              <button
                onClick={() =>
                  setPlan({
                    name: "",
                    months: 1,
                    price: "150.00",
                    active: true,
                  })
                }
              >
                Add subscription plan
              </button>
            )}
            <DataTable
              rows={rows}
              columns={columns[page] || []}
              actions={(row) => (
                <div className="actions">
                  {page === "users" && row.account_type !== "admin" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        decide(
                          `/admin/users/${row.id}/decision`,
                          row.suspended ? "unsuspend" : "suspend",
                          row.email,
                        )
                      }
                    >
                      {row.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  )}
                  {page === "applications" && (
                    <>
                      <button
                        className="secondary"
                        onClick={async () => {
                          try {
                            setDocument(await documentUrl(row.id));
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        View document
                      </button>
                      {row.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              decide(
                                `/admin/applications/${row.id}/decision`,
                                "approve",
                                row.legal_name,
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              decide(
                                `/admin/applications/${row.id}/decision`,
                                "reject",
                                row.legal_name,
                              )
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {["audiobooks", "channels"].includes(page) && (
                    <>
                      <button
                        className="secondary"
                        onClick={() =>
                          decide(
                            `/admin/moderation/${page}/${row.id}`,
                            row.moderated ? "restore" : "restrict",
                            row.title || row.name,
                          )
                        }
                      >
                        {row.moderated ? "Restore" : "Restrict"}
                      </button>
                      {page === "audiobooks" && (
                        <button
                          className="secondary"
                          onClick={() => listen(row.id)}
                        >
                          Listen
                        </button>
                      )}
                    </>
                  )}
                  {page === "reports" && (
                    <>
                      <button
                        className="secondary"
                        onClick={() => listen(row.audiobook_id)}
                      >
                        Investigate audio
                      </button>
                      {row.status === "open" && (
                        <>
                          <button
                            onClick={() =>
                              decide(
                                `/admin/reports/${row.id}/decision`,
                                "resolve",
                                row.reason,
                              )
                            }
                          >
                            Resolve
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              decide(
                                `/admin/reports/${row.id}/decision`,
                                "dismiss",
                                row.reason,
                              )
                            }
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {page === "plans" && (
                    <button
                      className="secondary"
                      onClick={() => setPlan({ ...row })}
                    >
                      Edit
                    </button>
                  )}
                  {page === "withdrawals" &&
                    ["pending", "approved"].includes(row.status) && (
                      <>
                        <button
                          onClick={() =>
                            decide(
                              `/admin/withdrawals/${row.id}/decision`,
                              row.status === "pending" ? "approve" : "complete",
                              `${money(row.amount)} · simulated payout`,
                            )
                          }
                        >
                          {row.status === "pending"
                            ? "Approve"
                            : "Record simulated completion"}
                        </button>
                        {row.status === "pending" && (
                          <button
                            className="secondary"
                            onClick={() =>
                              decide(
                                `/admin/withdrawals/${row.id}/decision`,
                                "reject",
                                "Withdrawal",
                              )
                            }
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}
                </div>
              )}
            />
            {!["plans"].includes(page) && (
              <div className="pagination">
                <button
                  className="secondary"
                  disabled={number === 1}
                  onClick={() => setNumber(number - 1)}
                >
                  Previous
                </button>
                <span>Page {number}</span>
                <button
                  className="secondary"
                  disabled={rows.length < 50}
                  onClick={() => setNumber(number + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        <footer>
          BanglaBook · Administration <span>All financial values in BDT</span>
        </footer>
      </main>
      {decision && (
        <Modal
          title={`${label(decision.action)} · ${decision.name}`}
          close={() => setDecision(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(decision.path, "POST", {
                  action: decision.action,
                  reason,
                })
              )
                setDecision(null);
            }}
          >
            <label>
              Decision reason
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p>This decision is recorded in the audit history.</p>
            <button disabled={busy}>Confirm {decision.action}</button>
          </form>
        </Modal>
      )}
      {plan && (
        <Modal title="Subscription plan" close={() => setPlan(null)}>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const { name, months, price, active } = plan;
              if (
                await mutate(
                  `/admin/plans${plan.id ? `/${plan.id}` : ""}`,
                  plan.id ? "PUT" : "POST",
                  { name, months, price, active },
                )
              )
                setPlan(null);
            }}
          >
            {["name", "months", "price"].map((key) => (
              <label key={key}>
                {label(key)}
                <input
                  required
                  type={key === "name" ? "text" : "number"}
                  step={key === "price" ? ".01" : "1"}
                  min="1"
                  value={plan[key]}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      [key]:
                        key === "months"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              </label>
            ))}
            <label>
              Available
              <select
                value={String(plan.active)}
                onChange={(e) =>
                  setPlan({ ...plan, active: e.target.value === "true" })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button disabled={busy}>Save plan</button>
          </form>
        </Modal>
      )}
      {audio.length > 0 && (
        <Modal title="Authorized audiobook playback" close={() => setAudio([])}>
          {audio.map((c) => (
            <div key={c.id}>
              <p>{c.title}</p>
              <audio controls preload="none" src={c.audio_url} />
            </div>
          ))}
        </Modal>
      )}
      {document && (
        <Modal
          title="Publisher verification document"
          close={() => setDocument("")}
        >
          <a href={document} target="_blank" rel="noreferrer">
            Open PDF in a new tab
          </a>
          <iframe title="Verification PDF" src={document} />
        </Modal>
      )}
    </div>
  );
}
const columns: Record<string, string[]> = {
  users: ["username", "email", "account_type", "publisher_status", "suspended"],
  applications: ["legal_name", "user_id", "status", "reason", "created_at"],
  audiobooks: [
    "title",
    "author",
    "access_tier",
    "publication_status",
    "moderated",
  ],
  channels: ["name", "owner_id", "moderated"],
  reports: ["reason", "audiobook_id", "status", "resolution"],
  plans: ["name", "months", "price", "active"],
  payments: ["id", "kind", "amount", "status", "created_at"],
  withdrawals: ["publisher_id", "amount", "destination", "status", "reason"],
  adjustments: ["created_at", "order_id", "kind", "amount", "reason"],
  audit: ["created_at", "action", "actor_id", "target", "details"],
};
function DataTable({
  rows,
  columns,
  actions,
}: {
  rows: Row[];
  columns: string[];
  actions?: (row: Row) => React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{label(c)}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1}>
                <div className="empty">No records found.</div>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || row.month || i}>
                {columns.map((c) => (
                  <td key={c}>
                    {c === "status" ||
                    c === "publisher_status" ||
                    c === "account_type" ? (
                      <span className={`badge ${row[c]}`}>
                        {label(String(row[c]))}
                      </span>
                    ) : typeof row[c] === "object" ? (
                      JSON.stringify(row[c])
                    ) : typeof row[c] === "boolean" ? (
                      row[c] ? (
                        "Yes"
                      ) : (
                        "No"
                      )
                    ) : (
                      String(row[c] ?? "—")
                    )}
                  </td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    panel.current
      ?.querySelector<HTMLElement>("input, textarea, button, select, a")
      ?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="scrim" onClick={close}>
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const focusable = Array.from(
              panel.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input, textarea, select, a[href], audio",
              ) || [],
            );
            const first = focusable[0],
              last = focusable[focusable.length - 1];
            if (e.shiftKey && window.document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            }
            if (!e.shiftKey && window.document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="secondary"
            onClick={close}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (user: Row) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <div className="login-story">
        <span className="brand">ব · BanglaBook</span>
        <h1>
          Good stories.
          <br />
          Thoughtful stewardship.
        </h1>
        <p>The workspace for the people behind the listening experience.</p>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const data = await request("/auth/admin-login", "POST", {
              username_or_email: form.get("email"),
              password: form.get("password"),
            });
            setToken(data.access_token);
            onLogin(data.user);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">ADMINISTRATOR ACCESS</p>
        <h2>Welcome back.</h2>
        <p>Sign in with your dedicated administrator account.</p>
        <label>
          Email or username
          <input name="email" required autoComplete="username" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button disabled={busy}>
          {busy ? "Signing in…" : "Sign in to workspace →"}
        </button>
        <small>
          Administrator accounts are provisioned by the platform operator.
        </small>
      </form>
    </div>
  );
}
function AdjustmentForm({
  submit,
}: {
  submit: (body: unknown) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        setBusy(true);
        try {
          if (await submit({ ...data, reference: crypto.randomUUID() }))
            form.reset();
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="full">
        <h2>Record a simulated deduction</h2>
        <p>
          Only confirmed orders in an unclosed month are eligible. Deductions
          reduce that month's distributable subscription receipts. Entitlements
          remain until paid expiry; no external transfer occurs.
        </p>
      </div>
      <label>
        Order ID
        <input name="order_id" required />
      </label>
      <label>
        Amount (BDT)
        <input name="amount" type="number" min="0.01" step="0.01" required />
      </label>
      <label>
        Type
        <select name="kind">
          <option value="refund">Refund</option>
          <option value="adjustment">Receipt correction</option>
        </select>
      </label>
      <label>
        Reason
        <textarea name="reason" required minLength={10} />
      </label>
      <button disabled={busy}>Record deduction</button>
    </form>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
