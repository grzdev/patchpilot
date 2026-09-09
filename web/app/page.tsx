"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Compass,
  GitBranch,
  CodeXml,
  Bookmark,
  ExternalLink,
  LoaderCircle,
  Check,
  Settings2,
  Search,
  Terminal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import {
  categories,
  kinds,
  initialProfile,
  rankProjects,
  rankIssues,
  type Profile,
  type Project,
} from "@/lib/catalog";
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
    [step, setStep] = useState(0),
    [tab, setTab] = useState("for-you"),
    [project, setProject] = useState<Project | null>(null),
    [issues, setIssues] = useState<Issue[]>([]),
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
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (
        p &&
        Array.isArray(p.skills) &&
        Array.isArray(p.interests) &&
        Array.isArray(p.kinds)
      ) {
        setProfile({ ...initialProfile, ...p });
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
  function toggle(field: "skills" | "interests" | "kinds", value: string) {
    setProfile((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value],
    }));
  }
  function navigate(next: string) {
    sequence.current++;
    setBusy("");
    setError("");
    setNotice("");
    setView(next);
  }
  async function importProfile() {
    const seq = ++sequence.current;
    setBusy("Reading public repositories…");
    setError("");
    try {
      const data = await api<{
        username: string;
        languages: string[];
        sample: number;
      }>({ action: "profile", username: profile.username });
      if (seq !== sequence.current) return;
      setProfile((p) => ({
        ...p,
        username: data.username,
        skills: data.languages,
      }));
      setNotice(
        `Reviewed ${data.sample} recent public repositories. Suggested languages come from non-fork repositories; edit them below.`,
      );
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setBusy("");
    }
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
    setBusy(`Fetching live issues from ${p.name}…`);
    try {
      const data = await api<{ issues: Issue[]; fetchedAt: string }>({
        action: "issues",
        repo: p.repo,
      });
      if (seq !== sequence.current) return;
      setIssues(data.issues);
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
  const ranked = rankProjects(profile),
    visible =
      tab === "explore"
        ? ranked.filter((p) => !profile.interests.includes(p.category))
        : ranked;
  const displayed = rankIssues(issues, profile).filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        i.labels.some((l) => l.name.toLowerCase().includes(filter))),
  );
  const stepTitles = [
    "Your toolkit. Your starting point.",
    "Where do you want to go?",
    "Choose your kind of mission.",
  ];
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
      <SidebarProvider className="workspace">
        <Sidebar
          collapsible="none"
          className="rail"
          role="navigation"
          aria-label="Workspace"
        >
          <div className="rail-label">WORKSPACE</div>
          <button
            className={
              ["discover", "issues", "brief"].includes(view)
                ? "nav active"
                : "nav"
            }
            onClick={() => navigate("discover")}
          >
            <Compass size={19} />
            Discover
          </button>
          <button
            className={view === "saved" ? "nav active" : "nav"}
            onClick={() => navigate("saved")}
          >
            <Bookmark size={19} />
            My missions<span className="count">{saved.length}</span>
          </button>
          <button
            className={view === "setup" ? "nav active" : "nav"}
            onClick={() => {
              navigate("setup");
              setStep(0);
            }}
          >
            <Settings2 size={19} />
            Your profile
          </button>
          <div className="rail-bottom">
            <span className="mini-code">&gt;_</span>
            <strong>
              Small patches.
              <br />
              Real impact.
            </strong>
            <p>Your next contribution starts with a little curiosity.</p>
            <span className="version">PATCHPILOT / v0.1</span>
          </div>
        </Sidebar>
        <main id="main">
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
            <>
              <div className="setup-heading">
                <div>
                  <span className="eyebrow">LET’S FIND YOUR ORBIT</span>
                  <h1>{stepTitles[step]}</h1>
                  <p className="intro">
                    {step === 0
                      ? "Tell us what you know. We’ll help you find where it matters."
                      : step === 1
                        ? "Pick the ecosystems you’re curious about. Familiar or completely new."
                        : "A quick fix or a deeper challenge. Make it your own."}
                  </p>
                </div>
                <span className="step-counter">
                  0{step + 1}
                  <span> / 03</span>
                </span>
              </div>
              <Progress
                value={((step + 1) / 3) * 100}
                className="setup-progress"
              />
              {step === 0 ? (
                <>
                  <section className="github-import">
                    <div className="import-icon">
                      <CodeXml size={27} />
                    </div>
                    <div>
                      <h3>Let your GitHub do the introduction</h3>
                      <p>
                        Suggest languages from your public repos. No sign-in
                        needed.
                      </p>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        importProfile();
                      }}
                    >
                      <input
                        aria-label="GitHub username"
                        placeholder="Your GitHub username"
                        value={profile.username}
                        onChange={(e) =>
                          setProfile({ ...profile, username: e.target.value })
                        }
                      />
                      <button
                        className="secondary"
                        disabled={!!busy || !profile.username.trim()}
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <ArrowRight size={17} />
                        )}
                        Import
                      </button>
                    </form>
                  </section>
                  <div className="section-title">
                    <h2>What have you built with?</h2>
                    <span>Choose all that fit</span>
                  </div>
                  <div className="skill-list">
                    {Array.from(
                      new Set([
                        "TypeScript",
                        "JavaScript",
                        "Python",
                        "Go",
                        "Rust",
                        "Java",
                        "C#",
                        "Ruby",
                        ...profile.skills,
                      ]),
                    ).map((skill) => (
                      <label
                        className={
                          "skill " +
                          (profile.skills.includes(skill) ? "selected" : "")
                        }
                        key={skill}
                      >
                        <Checkbox
                          checked={profile.skills.includes(skill)}
                          onCheckedChange={() => toggle("skills", skill)}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                  <div className="category-grid">
                    {categories.map((c) => (
                      <div className="context-card" key={c.id}>
                        <span className="category-icon">{c.icon}</span>
                        <h3>{c.name}</h3>
                        <p>{c.description}</p>
                        <div className="repo-examples">{c.examples}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : step === 1 ? (
                <>
                  <div className="category-grid">
                    {categories.map((c) => (
                      <label
                        className={
                          "choice-card " +
                          (profile.interests.includes(c.id) ? "selected" : "")
                        }
                        key={c.id}
                      >
                        <div className="choice-top">
                          <span className="category-icon">{c.icon}</span>
                          <Checkbox
                            checked={profile.interests.includes(c.id)}
                            onCheckedChange={() => toggle("interests", c.id)}
                          />
                        </div>
                        <h3>{c.name}</h3>
                        <p>{c.description}</p>
                        <div className="repo-examples">{c.examples}</div>
                      </label>
                    ))}
                  </div>
                  <h3 className="mt">Take the familiar path, or explore?</h3>
                  <Tabs
                    value={profile.discovery}
                    onValueChange={(discovery) =>
                      setProfile({ ...profile, discovery })
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="familiar">
                        Build on my skills
                      </TabsTrigger>
                      <TabsTrigger value="new">Try something new</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </>
              ) : (
                <>
                  <div className="category-grid kinds">
                    {kinds.map((c) => (
                      <label
                        className={
                          "choice-card " +
                          (profile.kinds.includes(c.id) ? "selected" : "")
                        }
                        key={c.id}
                      >
                        <div className="choice-top">
                          <span className="category-icon">{c.icon}</span>
                          <Checkbox
                            checked={profile.kinds.includes(c.id)}
                            onCheckedChange={() => toggle("kinds", c.id)}
                          />
                        </div>
                        <h3>{c.name}</h3>
                        <p>{c.description}</p>
                        <div className="repo-examples">{c.examples}</div>
                      </label>
                    ))}
                  </div>
                  <h2 className="mt">How much room for adventure?</h2>
                  <Tabs
                    value={profile.pace}
                    onValueChange={(pace) => setProfile({ ...profile, pace })}
                  >
                    <TabsList className="pace-list">
                      <TabsTrigger value="quick">
                        Quick win · 30 min–2 hrs
                      </TabsTrigger>
                      <TabsTrigger value="challenge">
                        Challenge · 2–6 hrs
                      </TabsTrigger>
                      <TabsTrigger value="deep">
                        Deep dive · 1–3 days
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="muted small">
                    Your time budget is saved with your profile. Actual issue
                    difficulty still needs investigation.
                  </p>
                </>
              )}
              <footer className="setup-footer">
                <span className="muted small">
                  {step === 0
                    ? "Your suggestions are always editable."
                    : "You can change these preferences any time."}
                </span>
                <div>
                  {step > 0 && (
                    <button
                      className="text-button"
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}
                  <button
                    className="primary"
                    disabled={
                      !!busy ||
                      (step === 0 && !profile.skills.length) ||
                      (step === 1 && !profile.interests.length) ||
                      (step === 2 && !profile.kinds.length)
                    }
                    onClick={() => {
                      if (step < 2) setStep(step + 1);
                      else {
                        persist(profile);
                        navigate("discover");
                      }
                    }}
                  >
                    {step === 2 ? "Find my projects" : "Continue"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </footer>
            </>
          ) : view === "discover" ? (
            <>
              <span className="eyebrow">
                YOUR NEXT CONTRIBUTION STARTS HERE
              </span>
              <h1>
                Find a project.
                <br />
                <span className="subtle">Make your mark.</span>
              </h1>
              <p className="intro">
                Good work starts with the right place to contribute.
              </p>
              <div className="profile-strip">
                <span className="status-dot" />
                <span>
                  {profile.skills.length
                    ? profile.skills.join(" / ")
                    : "All experience levels"}
                </span>
                <span className="separator">·</span>
                <span>
                  {profile.pace === "quick"
                    ? "Quick wins"
                    : profile.pace === "deep"
                      ? "Deep dives"
                      : "Challenges"}
                </span>
                <button
                  onClick={() => {
                    navigate("setup");
                    setStep(0);
                  }}
                >
                  Tune your profile <Settings2 size={15} />
                </button>
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="line" className="discover-tabs">
                  <TabsTrigger value="for-you">For you</TabsTrigger>
                  <TabsTrigger value="explore">
                    Explore something new
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="section-title">
                <h2>
                  {tab === "explore"
                    ? "Beyond your usual stack"
                    : "Your launchpad"}
                </h2>
                <span>{visible.length} curated projects</span>
              </div>
              <p className="muted small section-note">
                Ranked by your selected interests and languages. Open a project
                to load its current GitHub issues.
              </p>
              <div className="project-grid">
                {visible.map((p, index) => (
                  <article className="project-card" key={p.repo}>
                    <div className="project-top">
                      <span
                        className="project-mark"
                        style={{ color: p.color, background: p.color + "15" }}
                      >
                        {p.mark}
                      </span>
                      <span className="language">{p.language}</span>
                    </div>
                    <h2>{p.name}</h2>
                    <span className="repo-name">{p.repo}</span>
                    <p>{p.description}</p>
                    <div className="match-reason">
                      <span>
                        {index === 0 && tab === "for-you" ? "✳" : "↳"}
                      </span>
                      {p.reason}
                    </div>
                    <button
                      className="project-action"
                      onClick={() => openProject(p)}
                    >
                      Explore missions
                      <ArrowRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
              {!visible.length && (
                <p>
                  You’ve selected every ecosystem. Switch to For you to explore
                  the full catalog.
                </p>
              )}
            </>
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
              <p className="intro">A real issue. A useful next step.</p>
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
                      ? `Fetched ${new Date(fetched).toLocaleString()}. Issues from the 100 most recently updated issue/PR entries; pull requests excluded. Ordered by your preferred work types and beginner labels; labels do not guarantee difficulty.`
                      : "Live data has not loaded yet."}
                  </p>
                  <div className="issue-list">
                    {displayed.map((i) => (
                      <article className="issue-row" key={i.number}>
                        <span className="issue-symbol">⊙</span>
                        <div>
                          <div className="issue-meta">
                            #{i.number} · {i.comments} comments ·{" "}
                            {i.assignees.length ? "Assigned" : "Unassigned"}
                          </div>
                          <h3>{i.title}</h3>
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
                  {fetched && !displayed.length && (
                    <div className="empty">
                      No issues match this view. Try another filter or project.
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
