"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  GitBranch,
  CodeXml,
  Bookmark,
  ExternalLink,
  LoaderCircle,
  Check,
  Search,
  Terminal,
} from "lucide-react";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { Onboarding } from "@/components/onboarding";
import { Discovery } from "@/components/discovery";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { initialProfile, type Profile, type Project } from "@/lib/catalog";
import type { Issue } from "@/lib/github";
type Brief = {
  repo: string;
  issue: Issue;
  linked: { title: string; url: string; state: string }[];
  guide: string | null;
  evidence: { label: string; url: string; detail: string }[];
  warnings: string[];
  comments: { body: string; url: string; author: string }[];
  fetchedAt: string;
  competition: string;
};
const key = "patchpilot.profile.v1",
  savedKey = "patchpilot.missions.v1";
async function api<T>(query: Record<string, string>): Promise<T> {
  const res = await fetch("/api/github?" + new URLSearchParams(query));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
export default function Home() {
  const [profile, setProfile] = useState<Profile>(initialProfile),
    [ready, setReady] = useState(false),
    [view, setView] = useState("setup"),
    [project, setProject] = useState<Project | null>(null),
    [issues, setIssues] = useState<
      (Issue & { signals?: string[]; cautions?: string[] })[]
    >([]),
    [screened, setScreened] = useState(0),
    [fetched, setFetched] = useState(""),
    [brief, setBrief] = useState<Brief | null>(null),
    [saved, setSaved] = useState<Brief[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const sequence = useRef(0);
  // Browser preferences are restored once after hydration; the server cannot access localStorage.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (
        p &&
        Array.isArray(p.skills) &&
        Array.isArray(p.interests) &&
        Array.isArray(p.kinds)
      ) {
        // Restore browser-only preferences after server hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile({ ...initialProfile, ...p });
        if (!new URLSearchParams(window.location.search).has("auth"))
          setView("discover");
      }
      const m = JSON.parse(localStorage.getItem(savedKey) || "[]");
      if (Array.isArray(m))
        setSaved(
          m.filter(
            (b) => b?.issue?.number && b?.repo && Array.isArray(b?.evidence),
          ),
        );
    } catch {}
    setReady(true);
  }, []);
  function persist(p: Profile) {
    try {
      localStorage.setItem(key, JSON.stringify(p));
    } catch {
      setNotice(
        "Your browser could not save preferences. They will last for this session.",
      );
    }
  }
  function navigate(next: string) {
    sequence.current++;
    setBusy("");
    setError("");
    setNotice("");
    setView(next);
  }
  async function openProject(p: Project) {
    const seq = ++sequence.current;
    setProject(p);
    setView("issues");
    setIssues([]);
    setFetched("");
    setFilter("all");
    setSearch("");
    setError("");
    setBusy(`Screening candidate issues in ${p.name}…`);
    try {
      const data = await api<{
        issues: (Issue & { signals?: string[]; cautions?: string[] })[];
        fetchedAt: string;
        screened: number;
      }>({
        action: "shortlist",
        kinds: profile.kinds.join(","),
        pace: profile.pace,
        repo: p.repo,
      });
      if (seq !== sequence.current) return;
      setIssues(data.issues);
      setScreened(data.screened);
      setFetched(data.fetchedAt);
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setBusy("");
    }
  }
  async function investigate(issue: Issue) {
    if (!project) return;
    const seq = ++sequence.current;
    setView("brief");
    setBrief(null);
    setError("");
    setBusy("Reading issue, discussion, timeline, and contribution metadata…");
    try {
      const data = await api<Brief>({
        action: "brief",
        repo: project.repo,
        number: String(issue.number),
      });
      if (seq === sequence.current) setBrief(data);
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setBusy("");
    }
  }
  function saveBrief() {
    if (!brief) return;
    const updated = [
      brief,
      ...saved.filter(
        (b) => b.repo !== brief.repo || b.issue.number !== brief.issue.number,
      ),
    ];
    setSaved(updated);
    try {
      localStorage.setItem(savedKey, JSON.stringify(updated));
      setNotice("Mission saved to this browser.");
    } catch {
      setNotice("Saved for this session. Browser storage is unavailable.");
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() =>
            navigate(ready && view !== "setup" ? "discover" : "setup")
          }
        >
          <span className="brand-icon">
            <GitBranch size={22} />
          </span>
          patchpilot<span className="alpha">ALPHA</span>
        </button>
        <div className="top-right">
          <span className="desktop muted">OPEN SOURCE, WITH DIRECTION</span>
          <a
            href="https://github.com/grzdev/patchpilot"
            target="_blank"
            rel="noreferrer"
            aria-label="PatchPilot on GitHub"
          >
            <CodeXml size={21} />
          </a>
          <span className="avatar">
            {profile.username
              ? profile.username.slice(0, 2).toUpperCase()
              : "PP"}
          </span>
        </div>
      </header>
      <SidebarProvider
        className="workspace"
        style={{ "--sidebar-width": "222px" } as React.CSSProperties}
      >
        <WorkspaceNavigation
          view={view}
          count={saved.length}
          navigate={navigate}
        />
        <WorkspaceNavigation
          compact
          view={view}
          count={saved.length}
          navigate={navigate}
        />
        <main id="main">
          <div className="workspace-controls">
            <SidebarTrigger aria-label="Open or close sidebar" />
            <span className="muted small">Workspace</span>
          </div>
          <div className="breadcrumb">
            WORKSPACE <span>/</span>{" "}
            {view === "setup"
              ? "YOUR PROFILE"
              : view === "saved"
                ? "MY MISSIONS"
                : view === "brief"
                  ? "MISSION BRIEF"
                  : view === "issues"
                    ? "PROJECT MISSIONS"
                    : "DISCOVER"}
          </div>
          {error && (
            <div className="message error" role="alert">
              {error}
              {view === "issues" && project && (
                <button onClick={() => openProject(project)}>Retry</button>
              )}
              {view === "brief" && (
                <button onClick={() => navigate("issues")}>
                  Back to issues
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="message" role="status">
              {notice}
            </div>
          )}
          {!ready ? (
            <p>Opening your workspace…</p>
          ) : view === "setup" ? (
            <Onboarding
              profile={profile}
              setProfile={setProfile}
              onComplete={() => {
                persist(profile);
                navigate("discover");
              }}
            />
          ) : view === "discover" ? (
            <Discovery
              profile={profile}
              openProject={openProject}
              edit={() => navigate("setup")}
            />
          ) : view === "issues" ? (
            <>
              <button
                className="back-link"
                onClick={() => navigate("discover")}
              >
                <ArrowLeft size={16} />
                All projects
              </button>
              <span className="eyebrow">{project?.repo}</span>
              <h1>{project?.name} missions</h1>
              <p className="intro">
                Screened for your preferences. Open an investigation before
                committing your time.
              </p>
              <div className="issue-controls">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Search loaded issues"
                    placeholder="Search loaded issues…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="good first issue">
                      Good first issue
                    </TabsTrigger>
                    <TabsTrigger value="bug">Bugs</TabsTrigger>
                    <TabsTrigger value="documentation">Docs</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {busy ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  {busy}
                </div>
              ) : (
                <>
                  <p className="muted small">
                    {fetched
                      ? `Screened ${screened} recent entries. Showing candidates matched to your preferences, with no assignee. Linked-PR results and any failed checks are shown on each card. This is evidence-based screening, not AI code analysis. Checked ${new Date(fetched).toLocaleString()}.`
                      : "Live data has not loaded yet."}
                  </p>
                  <div className="issue-list">
                    {issues
                      .filter(
                        (i) =>
                          i.title
                            .toLowerCase()
                            .includes(search.toLowerCase()) &&
                          (filter === "all" ||
                            i.labels.some((l) =>
                              l.name.toLowerCase().includes(filter),
                            )),
                      )
                      .map((i) => (
                        <article className="issue-row" key={i.number}>
                          <span className="issue-symbol">⊙</span>
                          <div>
                            <div className="issue-meta">
                              #{i.number} · {i.comments} comments ·{" "}
                              {i.assignees.length ? "Assigned" : "Unassigned"}
                            </div>
                            <h3>{i.title}</h3>
                            <ul className="candidate-signals">
                              {i.signals?.map((signal) => (
                                <li key={signal}>{signal}</li>
                              ))}
                            </ul>
                            <div className="candidate-cautions">
                              {i.cautions?.map((caution) => (
                                <p key={caution}>{caution}</p>
                              ))}
                            </div>
                            <div className="labels">
                              {i.labels.slice(0, 4).map((l) => (
                                <span key={l.name}>{l.name}</span>
                              ))}
                            </div>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => investigate(i)}
                          >
                            Investigate
                            <ArrowRight size={16} />
                          </button>
                        </article>
                      ))}
                  </div>
                  {fetched &&
                    !issues.filter(
                      (i) =>
                        i.title.toLowerCase().includes(search.toLowerCase()) &&
                        (filter === "all" ||
                          i.labels.some((l) =>
                            l.name.toLowerCase().includes(filter),
                          )),
                    ).length && (
                      <div className="empty">
                        No promising candidates matched this view. Try another
                        project or adjust your work preferences; we won’t fill
                        the shortlist with unrelated issues.
                      </div>
                    )}
                </>
              )}
            </>
          ) : view === "brief" ? (
            <>
              <button
                className="back-link"
                onClick={() => navigate(project ? "issues" : "saved")}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <span className="eyebrow">
                ISSUE DETECTIVE / EVIDENCE PREVIEW
              </span>
              <h1>Mission brief</h1>
              {busy && (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  {busy}
                </div>
              )}
              {brief && (
                <>
                  <div className="brief-title">
                    <div>
                      <span className="repo-name">
                        {brief.repo} #{brief.issue.number}
                      </span>
                      <h2>{brief.issue.title}</h2>
                    </div>
                    <button className="primary" onClick={saveBrief}>
                      <Bookmark size={17} />
                      Save mission
                    </button>
                  </div>
                  <div className="brief-stats">
                    <div>
                      <span>ISSUE STATUS</span>
                      <strong>{brief.issue.state}</strong>
                    </div>
                    <div>
                      <span>COMPETING WORK</span>
                      <strong>{brief.competition}</strong>
                    </div>
                    <div>
                      <span>ASSIGNMENT</span>
                      <strong>
                        {brief.issue.assignees.map((a) => a.login).join(", ") ||
                          "Unassigned"}
                      </strong>
                    </div>
                  </div>
                  <div className="brief-grid">
                    <section className="panel">
                      <h2>The reported problem</h2>
                      <p className="issue-body">
                        {brief.issue.body ||
                          "No description provided. Read the discussion before choosing this mission."}
                      </p>
                      <a
                        href={brief.issue.html_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read on GitHub <ExternalLink size={14} />
                      </a>
                      <h2 className="mt">Next investigation steps</h2>
                      <ol>
                        <li>
                          Confirm the issue is reproducible on the current
                          branch.
                        </li>
                        <li>
                          Read the contribution guide and find the relevant
                          source and tests.
                        </li>
                        <li>
                          Add a failing regression test before changing
                          behavior.
                        </li>
                        <li>
                          Review any linked work before preparing a patch.
                        </li>
                      </ol>
                      <p className="muted small">
                        This version collects evidence. AI code analysis,
                        difficulty estimates, patch generation, and test
                        execution are not connected yet.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>Evidence collected</h2>
                      {brief.evidence.map((e) => (
                        <div className="evidence" key={e.label}>
                          <Check size={16} />
                          <div>
                            <a href={e.url} target="_blank" rel="noreferrer">
                              {e.label}
                              <ExternalLink size={13} />
                            </a>
                            <p>{e.detail}</p>
                          </div>
                        </div>
                      ))}
                      {brief.warnings.map((w) => (
                        <p className="warning" key={w}>
                          {w}
                        </p>
                      ))}
                      <p className="muted small">
                        Checked {new Date(brief.fetchedAt).toLocaleString()}
                      </p>
                      {brief.linked.length > 0 && (
                        <>
                          <h3>Linked pull requests</h3>
                          {brief.linked.map((p, i) => (
                            <p key={i}>
                              <a href={p.url} target="_blank" rel="noreferrer">
                                {p.title}
                              </a>{" "}
                              · {p.state}
                            </p>
                          ))}
                        </>
                      )}
                    </section>
                  </div>
                  {brief.comments.length > 0 && (
                    <section className="panel discussion">
                      <h2>Recent comments in the fetched sample</h2>
                      {brief.comments.map((c) => (
                        <details key={c.url}>
                          <summary>{c.author}</summary>
                          <p className="issue-body">{c.body}</p>
                          <a href={c.url} target="_blank" rel="noreferrer">
                            View comment
                            <ExternalLink size={13} />
                          </a>
                        </details>
                      ))}
                    </section>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <span className="eyebrow">MISSION CONTROL</span>
              <h1>Your next moves.</h1>
              <p className="intro">
                Saved investigations, ready when you are. Stored in this
                browser.
              </p>
              {saved.length ? (
                <div className="issue-list">
                  {saved.map((b) => (
                    <article
                      className="issue-row"
                      key={`${b.repo}/${b.issue.number}`}
                    >
                      <Bookmark size={21} />
                      <div>
                        <span className="repo-name">
                          {b.repo} #{b.issue.number}
                        </span>
                        <h3>{b.issue.title}</h3>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setProject(null);
                          setBrief(b);
                          navigate("brief");
                        }}
                      >
                        Open brief
                        <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Terminal size={36} />
                  <h2>Your mission log is a blank canvas.</h2>
                  <p>
                    Explore a project, investigate an issue, and save your first
                    brief.
                  </p>
                  <button
                    className="primary"
                    onClick={() => navigate("discover")}
                  >
                    Discover projects
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </SidebarProvider>
    </div>
  );
}

