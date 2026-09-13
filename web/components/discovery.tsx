"use client";
import { useState } from "react";
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  LoaderCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  categories,
  projects,
  rankProjects,
  type Profile,
  type Project,
} from "@/lib/catalog";
export function Discovery({
  profile,
  profiled = false,
  openProject,
  edit,
}: {
  profile: Profile;
  profiled?: boolean;
  openProject: (p: Project) => void;
  edit: () => void;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [language, setLanguage] = useState("all"),
    [personal, setPersonal] = useState(true),
    [extra, setExtra] = useState<Project[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [searched, setSearched] = useState(false);
  const pool = searched ? extra : [
    ...projects,
    ...extra.filter((p) => !projects.some((c) => c.repo === p.repo)),
  ];
  const ranked = rankProjects(profile, pool);
  const visible = ranked.filter(
    (p) =>
      (!personal ||
        (profile.interests.length
          ? profile.interests.includes(p.category)
          : !profile.skills.length || profile.skills.includes(p.language))) &&
      (category === "all" || category === p.category) &&
      (language === "all" || language === p.language) &&
      (!query ||
        searched ||
        `${p.repo} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  async function searchGitHub(next = 1) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        "/api/github?" +
          new URLSearchParams({
            action: "projects",
            query,
            category,
            language,
            page: String(next),
          }),
      );
      const data = (await res.json()) as {
        error?: string;
        projects: Project[];
        more: boolean;
        exact?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "GitHub lookup failed. Please try again.");
      if(data.exact && data.projects[0]) {openProject(data.projects[0]);return;}
      setExtra((current) =>
        next === 1
          ? data.projects
          : [
              ...current,
              ...data.projects.filter(
                (p) => !current.some((c) => c.repo === p.repo),
              ),
            ],
      );
      setPage(next);
      setMore(data.more);
      setSearched(true);
      setPersonal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {profiled ? <header className="personal-discovery-heading">
        <div><span className="eyebrow">YOUR WORKSPACE</span><h1>Find your next contribution.</h1>
        <p>Explore projects matched to your interests, or bring a repository of your own.</p></div>
        <button className="secondary" onClick={edit}>Edit preferences</button>
      </header> : <><span className="eyebrow">REPOSITORY INVESTIGATION</span>
      <h1>Bring a repo. Find a useful fix.</h1>
      <p className="intro">Paste a public GitHub repository to investigate its source code for repair opportunities.</p></>}
      <Collapsible>
        <div className="discovery-toolbar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchGitHub();
            }}
            className="repo-search"
          >
            <label className="search">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearched(false);
                }}
                aria-label="GitHub repository URL, owner/repository, or discovery keywords"
                placeholder="https://github.com/grzdev/portfolio or owner/repository"
              />
            </label>
            <button className="primary" disabled={busy || !query.trim()}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                "Find repository"
              )}
            </button>
          </form>
          <CollapsibleTrigger className="secondary">
            <SlidersHorizontal size={16} />
            Filters
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="filters-panel">
          <label>
            <span>Ecosystem</span>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setSearched(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ecosystems</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            <span>Language</span>
            <Select
              value={language}
              onValueChange={(v) => {
                setLanguage(v);
                setSearched(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {Array.from(new Set(pool.map((p) => p.language)))
                  .sort()
                  .map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </label>
          <label className="switch-label">
            <Switch checked={personal} onCheckedChange={setPersonal} />
            Match my profile
          </label>
          <button
            className="text-button"
            onClick={() => {
              setCategory("all");
              setLanguage("all");
              setQuery("");
              setPersonal(false);
              setSearched(false);
            }}
          >
            Reset filters
          </button>
        </CollapsibleContent>
      </Collapsible>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {!profiled && <p className="discovery-help muted small">Paste a repository link to open its scan setup, or search by keyword.</p>}
      <div className="section-title">
        <h2>
          {searched ? "GitHub search results" : profiled ? "Projects for you" : "Need a starting point?"}
        </h2>
        <span>{visible.length} projects</span>
      </div>
      <p className="muted small">
        {searched
          ? "Repositories matching your GitHub search."
          : "Optional suggestions based on your preferences. Any public repository can be submitted above."}{" "}

      </p>
      <div className="project-grid">
        {visible.map((p) => (
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
            <h2><a className="project-name-button" href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer" aria-label={`About ${p.name} on GitHub (opens a new tab)`}>{p.name}<ArrowRight size={17}/></a></h2>
            <span className="repo-name">{p.repo}</span>
            <p>{p.description}</p>
            <details className="project-fit"><summary>Why this project?</summary><p>{p.reason}</p></details>
            <button className="project-action" onClick={() => openProject(p)}>
              Choose repository
              <ArrowRight size={17} />
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty">
          <h2>No projects match these filters yet.</h2>
          <p>
            Broaden the filters or search GitHub to discover more repositories.
          </p>
        </div>
      )}
      {more && searched && (
        <button
          className="secondary mt"
          disabled={busy}
          onClick={() => searchGitHub(page + 1)}
        >
          Load more from GitHub
        </button>
      )}
    </>
  );
}
