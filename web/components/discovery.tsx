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
  openProject,
  edit,
}: {
  profile: Profile;
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
  const pool = [
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
      };
      if (!res.ok) throw new Error(data.error);
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
      <span className="eyebrow">YOUR CONTRIBUTION SHORTLIST</span>
      <h1>
        A little more you.
        <br />
        <span className="subtle">A lot to explore.</span>
      </h1>
      <p className="intro">
        Choose a project. PatchPilot will screen its issues for promising
        starting points.
      </p>
      <div className="profile-strip">
        <span>{profile.skills.join(" / ") || "All languages"}</span>
        <span>·</span>
        <span>
          {profile.kinds.includes("polish")
            ? "Fun, polish & delightful UX"
            : profile.kinds.join(" + ")}
        </span>
        <button onClick={edit}>Edit preferences</button>
      </div>
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
                aria-label="Search repositories"
                placeholder="Try drawing, terminal, games, or a repo name…"
              />
            </label>
            <button className="secondary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                "Search GitHub"
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
      <div className="section-title">
        <h2>
          {personal ? "Picked for your interests" : "Explore the possibilities"}
        </h2>
        <span>{visible.length} projects</span>
      </div>
      <p className="muted small">
        {searched
          ? "Live GitHub search results added to your catalog."
          : "A broad starting catalog, filtered by your choices. Search GitHub for more."}{" "}
        Issue screening happens when you open a project.
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
            <h2>{p.name}</h2>
            <span className="repo-name">{p.repo}</span>
            <p>{p.description}</p>
            <div className="match-reason">{p.reason}</div>
            <button className="project-action" onClick={() => openProject(p)}>
              Find promising issues
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
