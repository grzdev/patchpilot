"use client";
import { useEffect, useState } from "react";
import { GitBranch, CodeXml } from "lucide-react";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { Onboarding } from "@/components/onboarding";
import { Discovery } from "@/components/discovery";
import { SourceScan, ScanResults } from "@/components/source-scan";
import { SidebarProvider } from "@/components/ui/sidebar";
import { initialProfile, projects, type Profile, type Project } from "@/lib/catalog";
import type { Scan } from "@/lib/scan-types";
const key = "patchpilot.profile.v1", savedKey = "patchpilot.scans.v1";
export default function Home() {
  const [profile,setProfile] = useState<Profile>(initialProfile), [ready,setReady] = useState(false),
    [disconnecting,setDisconnecting] = useState(false), [profiled,setProfiled] = useState(false), [view,setView] = useState("discover"), [project,setProject] = useState<Project|null>(null),
    [saved,setSaved] = useState<Scan[]>([]), [opened,setOpened] = useState<Scan|null>(null), [notice,setNotice] = useState("");
  useEffect(()=> {
    const params = new URLSearchParams(window.location.search);
    if(params.has("auth")) setView("setup");
    const repoParam = params.get("repo");
    if(repoParam) {
      const match = projects.find(p => p.repo.toLowerCase() === repoParam.toLowerCase());
      if(match) { setProject(match); setView("issues"); }
      else {
        const parts = repoParam.split("/");
        const name = parts[1] || parts[0];
        setProject({ repo: repoParam, name, language: "TypeScript", description: "Repository investigation", category: "other", mark: name[0]?.toUpperCase() || "R", color: "#93c5fd" });
        setView("issues");
      }
    }
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (p && Array.isArray(p.skills) && Array.isArray(p.kinds) && Array.isArray(p.interests)) {
        // Restore preferences from browser storage after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile({...initialProfile,...p});setProfiled(true);
        if (!params.has("auth") && !repoParam) setView("discover");
      }
      const scans = JSON.parse(localStorage.getItem(savedKey) || "[]");
      if (Array.isArray(scans)) setSaved(scans.filter(s=>s?.repo && s?.commit && Array.isArray(s.files) && Array.isArray(s.findings) && Array.isArray(s.warnings) && Array.isArray(s.research)));
    } catch {}
    setReady(true);
  },[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:"instant"});document.getElementById("main")?.scrollTo({top:0,behavior:"instant"});},[view,project,opened]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(""),5000);return()=>clearTimeout(timer);},[notice]);
  async function disconnect() {
    setDisconnecting(true);
    try {
      const response=await fetch("/api/auth/github/session",{method:"DELETE"});
      if(!response.ok)throw new Error("Could not disconnect. Please retry.");
      setProfile(initialProfile);setProfiled(false);
      try {localStorage.removeItem(key);} catch {}
      window.history.replaceState({},"",window.location.pathname);
      setView("discover");setNotice("GitHub profile removed. Open Your profile to connect another account.");
    } catch(error) {setNotice((error as Error).message);} finally {setDisconnecting(false);}
  }
  function navigate(next:string) {setNotice("");setOpened(null);setView(next);}
  function openProject(p:Project) {setProject(p);navigate("issues");}
  function save(scan:Scan) {
    const next = [scan,...saved.filter(s=>s.repo!==scan.repo || s.commit!==scan.commit || s.scannedAt!==scan.scannedAt)].slice(0,20);
    setSaved(next);
    try {localStorage.setItem(savedKey,JSON.stringify(next));setNotice("Added to My missions.");}
    catch {setNotice("Saved for this session. Browser storage is unavailable.");}
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() =>
            navigate("discover")
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
          {notice && <div className="app-toast" role="status">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice("")}>×</button></div>}
          {!ready ? <p>Opening your workspace…</p> : view === "setup" ? <><button className="back-link" onClick={()=>navigate("discover")}>Back to suggested repositories</button><div className="profile-account-actions">{profile.username && <><span>GitHub profile: <strong>{profile.username}</strong></span><button className="secondary" disabled={disconnecting} onClick={disconnect}>{disconnecting ? "Disconnecting…" : "Disconnect GitHub profile"}</button></>}</div><Onboarding profile={profile} setProfile={setProfile} onComplete={()=>{setProfiled(true);try {localStorage.setItem(key,JSON.stringify(profile));} catch {} navigate("discover");}}/></> : view === "discover" ? <Discovery profiled={profiled} profile={profile} openProject={openProject} edit={()=>navigate("setup")}/> : view === "issues" && project ? <SourceScan key={project.repo} project={project} profile={profile} back={()=>navigate("discover")} onSave={save}/> : <><h1>Saved investigations</h1>{opened ? <><button className="back-link" onClick={()=>setOpened(null)}>Back to saved investigations</button><ScanResults scan={opened}/></> : saved.length ? <div className="saved-grid">{saved.map(s=><article className="saved-mission" key={s.scannedAt+s.repo}><div className="saved-mission-top"><span className="eyebrow">SAVED MISSION</span><span>{s.findings.length} suggestions</span></div><h2>{s.repo}</h2><p>{s.focus || "Repository sample"} · {s.files.length} files inspected</p><p className="muted">{new Date(s.scannedAt).toLocaleDateString()} · Commit {s.commit.slice(0,8)}</p><div className="saved-mission-actions"><button className="primary" onClick={()=>setOpened(s)}>Review findings</button><a href={`https://github.com/${s.repo}`} target="_blank" rel="noreferrer">View on GitHub ↗</a></div></article>)}</div> : <div className="empty">Scan a repository and save an investigation to keep it here.</div>}</>}
        </main>
      </SidebarProvider>
    </div>
  );
}
