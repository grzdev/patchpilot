"use client";
import { useEffect, useRef, useState } from "react";
import { mixProjects } from "@/lib/discovery-mix";
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Info,
  RotateCcw,
  Star,
} from "lucide-react";
import {
  categories,
  rankProjects,
  type Profile,
  type Project,
} from "@/lib/catalog";

type DiscoveryResponse = {
  projects: Project[];
  more: boolean;
  exact?: boolean;
  error?: string;
  retryAfterSeconds?: number;
};

const languageThemes: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  TypeScript: { bg: "#152238", text: "#60a5fa", dot: "#3178c6", border: "#253b5c" },
  JavaScript: { bg: "#252215", text: "#fde047", dot: "#f1e05a", border: "#443c19" },
  Python: { bg: "#142333", text: "#7dd3fc", dot: "#3572A5", border: "#203a54" },
  Go: { bg: "#122530", text: "#38bdf8", dot: "#00ADD8", border: "#1d4154" },
  Rust: { bg: "#2a1e18", text: "#fdba74", dot: "#dea584", border: "#493325" },
  "C++": { bg: "#2b1925", text: "#f472b6", dot: "#f34b7d", border: "#4a263c" },
  "C#": { bg: "#142819", text: "#86efac", dot: "#178600", border: "#214427" },
  Java: { bg: "#2b2017", text: "#fdba74", dot: "#b07219", border: "#493521" },
  Ruby: { bg: "#2b1619", text: "#fca5a5", dot: "#CC342D", border: "#492026" },
  PHP: { bg: "#1a1f35", text: "#a5b4fc", dot: "#4F5D95", border: "#2b3258" },
  Swift: { bg: "#2b1a14", text: "#fb923c", dot: "#F05138", border: "#49291c" },
  Kotlin: { bg: "#221a35", text: "#c084fc", dot: "#A97BFF", border: "#392955" },
  Dart: { bg: "#122628", text: "#2dd4bf", dot: "#00B4AB", border: "#1b4245" },
  Svelte: { bg: "#2b1715", text: "#fb7185", dot: "#ff3e00", border: "#49211d" },
  HTML: { bg: "#2a1a14", text: "#fb923c", dot: "#e34c26", border: "#48271b" },
  CSS: { bg: "#201a35", text: "#c084fc", dot: "#563d7c", border: "#352a55" },
};

function getLanguageTheme(lang: string) {
  return (
    languageThemes[lang] || {
      bg: "#18222e",
      text: "#a6b8cc",
      dot: "#7e93aa",
      border: "#2e3f52",
    }
  );
}

function formatStars(stars?: number) {
  if (!stars) return "0";
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(stars);
}

function RepoIcon({
  repo,
  mark,
  color,
}: {
  repo: string;
  mark: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const owner = repo.split("/")[0] || "";
  const avatarUrl = `https://github.com/${encodeURIComponent(owner)}.png?size=64`;

  return (
    <span className="project-mark" style={{ color, background: color + "18" }}>
      {!failed ? (
        <img
          src={avatarUrl}
          alt={`${owner} avatar`}
          loading="lazy"
          width={38}
          height={38}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="repo-monogram">{mark}</span>
      )}
    </span>
  );
}

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
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("all");
  const [activity, setActivity] = useState("90");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState("suggested");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Project[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applied, setApplied] = useState({
    category: "all",
    language: "all",
    activity: "90",
    size: "all",
    sort: "suggested",
  });

  const pendingFilters =
    JSON.stringify({ category, language, activity, size, sort }) !==
    JSON.stringify(applied);

  function applyFilters() {
    setApplied({ category, language, activity, size, sort });
    setSubmitted(query.trim());
    setPage(1);
    setRefresh((n) => n + 1);
  }

  function resetFilters() {
    setCategory("all");
    setLanguage("all");
    setActivity("90");
    setSize("all");
    setSort("suggested");
    setApplied({
      category: "all",
      language: "all",
      activity: "90",
      size: "all",
      sort: "suggested",
    });
    setSubmitted("");
    setQuery("");
    setPage(1);
    setRefresh((n) => n + 1);
  }

  const openRef = useRef(openProject);
  useEffect(() => {
    openRef.current = openProject;
  }, [openProject]);

  useEffect(() => {
    if (!retry) return;
    const timer = setInterval(() => setRetry((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    setError("");
    if (page === 1) setItems([]);

    fetch(
      "/api/github?" +
        new URLSearchParams({
          action: "projects",
          query: submitted,
          ...applied,
          sort: applied.sort === "suggested" ? "stars" : applied.sort,
          page: String(page),
        }),
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = (await response.json()) as DiscoveryResponse;
        if (!response.ok) {
          setRetry(data.retryAfterSeconds || 0);
          throw new Error(
            data.error || "GitHub discovery is unavailable. Please retry.",
          );
        }
        return data;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.exact && data.projects[0]) {
          openRef.current(data.projects[0]);
          return;
        }
        const batch =
          applied.sort === "suggested"
            ? mixProjects(data.projects, profile)
            : data.projects;
        setItems((old) =>
          page === 1
            ? batch
            : [...old, ...batch.filter((p: Project) => !old.some((o) => o.repo === p.repo))],
        );
        setMore(data.more);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
  }, [submitted, applied, page, refresh, profile]);

  async function choose(project: Project) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/github?" +
          new URLSearchParams({ action: "projects", query: project.repo }),
      );
      const data = (await response.json()) as DiscoveryResponse;
      if (!response.ok) {
        if (response.status === 404 || response.status === 400)
          setItems((old) => old.filter((p) => p.repo !== project.repo));
        setRetry(data.retryAfterSeconds || 0);
        throw new Error(
          response.status === 404
            ? "That repository is no longer accessible and has been removed from this list."
            : data.error || "Repository lookup failed.",
        );
      }
      if (!data.projects?.[0])
        throw new Error("Repository lookup returned no project. Please retry.");
      openRef.current(data.projects[0]);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const change =
    (setter: (s: string) => void) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setter(event.target.value);
    };

  return (
    <>
      <header className="personal-discovery-heading">
        <div>
          <span className="eyebrow">LIVE GITHUB DISCOVERY</span>
          <h1>
            {profiled
              ? "Find your next contribution."
              : "Bring a repo. Find a useful fix."}
          </h1>
          <p>Explore public repositories or paste the one you want to inspect.</p>
        </div>
        <button className="secondary" onClick={edit}>
          {profiled ? "Edit preferences" : "Set up your profile"}
        </button>
      </header>

      <form
        className="repo-search"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Repository link or search keywords"
            placeholder="GitHub link, owner/repository, or search keywords"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy || retry > 0}>
          {busy ? "Searching…" : "Search GitHub"}
        </button>
      </form>

      <section className="discovery-filters">
        <button
          type="button"
          className="filter-toggle secondary"
          aria-expanded={filtersOpen}
          aria-controls="repository-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal size={15} />
          <span>Refine repositories</span>
          <ChevronDown
            size={15}
            className={`filter-chevron ${filtersOpen ? "rotate-180" : ""}`}
          />
          {pendingFilters && (
            <span className="pending-filters-badge">Unapplied</span>
          )}
        </button>

        {filtersOpen && (
          <div id="repository-filters" className="filters-container">
            <div className="filters-panel">
              <label>
                <span>Language</span>
                <select value={language} onChange={change(setLanguage)}>
                  <option value="all">Any language</option>
                  {[
                    ...new Set([
                      ...profile.skills,
                      "TypeScript",
                      "JavaScript",
                      "Python",
                      "Go",
                      "Rust",
                      "Java",
                      "C#",
                      "Ruby",
                      "PHP",
                      "C++",
                      "Swift",
                      "Kotlin",
                      "Dart",
                      "Svelte",
                      "HTML",
                      "CSS",
                    ]),
                  ]
                    .sort()
                    .map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                </select>
              </label>

              <label>
                <span>Project focus</span>
                <select value={category} onChange={change(setCategory)}>
                  <option value="all">Any focus</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Last code activity</span>
                <select value={activity} onChange={change(setActivity)}>
                  <option value="all">Any time</option>
                  <option value="30">Within a month</option>
                  <option value="90">Within 3 months</option>
                  <option value="365">Within a year</option>
                </select>
              </label>

              <label>
                <span>Repository size</span>
                <select value={size} onChange={change(setSize)}>
                  <option value="all">Any size</option>
                  <option value="small">Under 5 MB</option>
                  <option value="medium">5–50 MB</option>
                  <option value="large">Over 50 MB</option>
                </select>
              </label>

              <label>
                <span>Sort results</span>
                <select value={sort} onChange={change(setSort)}>
                  <option value="suggested">For me · Top starred first</option>
                  <option value="stars">Most starred</option>
                  <option value="updated">Recently updated</option>
                  <option value="forks">Most forked</option>
                </select>
              </label>
            </div>

            <div className="filter-bottom-bar">
              <span
                className={`filter-status-hint ${pendingFilters ? "has-changes" : ""}`}
              >
                {pendingFilters
                  ? "● Unapplied filter changes ready"
                  : "Choose your filters, then click Apply to refresh."}
              </span>

              <div className="filter-actions">
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={resetFilters}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  className="primary filter-apply-btn"
                  disabled={busy || retry > 0}
                  onClick={applyFilters}
                >
                  <Sparkles size={14} />
                  <span>Apply filters</span>
                </button>
              </div>
            </div>

            <div className="filter-info-strip">
              <Info size={14} />
              <span>
                Archived repositories and forks are excluded. Size reflects
                GitHub&apos;s repository size. &ldquo;For me&rdquo; arranges
                results according to your familiarity preference.
              </span>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="message error" role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            disabled={busy || retry > 0}
            onClick={() => setRefresh((n) => n + 1)}
          >
            {retry > 0
              ? `Retry in ${Math.ceil(retry / 60)} min`
              : "Retry discovery"}
          </button>
        </div>
      )}

      <div className="section-title">
        <h2>Repositories to explore</h2>
        <span>{items.length} loaded</span>
      </div>

      {busy && (
        <div
          className="discovery-loading-bar"
          role="progressbar"
          aria-label="Searching GitHub repositories"
        >
          <div className="discovery-loading-indicator" />
        </div>
      )}

      {busy && page === 1 ? (
        <div className="project-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="card-skeleton" key={i}>
              <div className="skeleton-top">
                <div className="skeleton-shimmer skeleton-icon" />
                <div className="skeleton-shimmer skeleton-badge" />
              </div>
              <div className="skeleton-shimmer skeleton-title" />
              <div className="skeleton-shimmer skeleton-sub" />
              <div className="skeleton-shimmer skeleton-text" />
              <div className="skeleton-shimmer skeleton-action" />
            </div>
          ))}
        </div>
      ) : (
        <div className="project-grid">
          {items.map((p) => (
            <article className="project-card" key={p.repo}>
              <div className="project-top">
                <RepoIcon repo={p.repo} mark={p.mark} color={p.color} />
                <div className="project-top-badges">
                  {p.stars !== undefined && p.stars > 0 && (
                    <span
                      className="stars-badge"
                      title={`${p.stars.toLocaleString()} stars on GitHub`}
                    >
                      <Star size={11} className="star-icon" aria-hidden="true" />
                      <span>{formatStars(p.stars)}</span>
                    </span>
                  )}
                  {(() => {
                    const theme = getLanguageTheme(p.language);
                    return (
                      <span
                        className="language-badge"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.text,
                          borderColor: theme.border,
                        }}
                      >
                        <span
                          className="language-dot"
                          style={{ backgroundColor: theme.dot }}
                        />
                        <span>{p.language}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <h2>
                <a
                  className="project-name-button"
                  href={`https://github.com/${p.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`View ${p.name} on GitHub`}
                >
                  <span>{p.name}</span>
                  <ArrowRight size={15} />
                </a>
              </h2>
              <span className="repo-name">{p.repo}</span>
              <p className="project-description" title={p.description}>
                {p.description}
              </p>
              <details className="project-fit">
                <summary className="project-fit-summary">
                  <span className="fit-label">
                    <Sparkles size={13} />
                    <span>Why this project?</span>
                  </span>
                  <ChevronDown size={13} className="fit-chevron" />
                </summary>
                <div className="project-fit-content">
                  <p>
                    {rankProjects(profile, [p])[0]?.reason ||
                      "Matches your developer profile."}
                  </p>
                </div>
              </details>
              <button
                type="button"
                className="project-action"
                disabled={busy || retry > 0}
                onClick={() => choose(p)}
              >
                <span>Choose repository</span>
                <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}

      {!busy && !error && !items.length && (
        <div className="empty">
          No public repositories match these filters. Try another language or a
          wider activity range.
        </div>
      )}

      {more && (
        <button
          className="secondary mt"
          disabled={busy || retry > 0}
          onClick={() => setPage((n) => n + 1)}
        >
          Load more repositories
        </button>
      )}

      {!!items.length && !more && (
        <p className="muted discovery-help">
          End of this search. Change keywords or filters to explore another set
          of repositories.
        </p>
      )}
    </>
  );
}
