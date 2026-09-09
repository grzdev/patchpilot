"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CodeXml,
  LoaderCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { categories, kinds, type Profile } from "@/lib/catalog";
const titles = [
  "Let’s start with you.",
  "What’s in your toolkit?",
  "What would you like to explore?",
  "What sounds fun today?",
  "How long would you like to work?",
  "Familiar ground or a new adventure?",
];
const notes = [
  "Connect GitHub, enter a username, or build a profile yourself.",
  "Keep the suggestions that fit. You can change these later.",
  "Pick a few worlds you’re curious about.",
  "Choose the kind of contribution you’d enjoy making.",
  "This is your available work time, including learning the repo and testing a fix.",
  "We’ll use this to shape your project shortlist.",
];
export function Onboarding({
  profile,
  setProfile,
  onComplete,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0),
    [leaving, setLeaving] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [connected, setConnected] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    fetch("/api/auth/github/session")
      .then((r) => r.json())
      .then((data: unknown) => {
        const result = data as {
          profile?: { username: string; languages: string[] };
        };
        if (active && result.profile) {
          setConnected(result.profile.username);
          setNote(
            "GitHub account verified. Continue to review your suggested languages.",
          );
          if (query.get("auth") === "connected" || !profile.skills.length)
            setProfile({
              ...profile,
              username: result.profile.username,
              skills: result.profile.languages,
            });
        }
      })
      .catch(() => {});
    if (query.has("auth")) {
      // Read the OAuth redirect outcome once after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        query.get("auth") === "unavailable"
          ? "GitHub sign-in needs the app owner’s OAuth setup. You can still use a username or continue manually."
          : query.get("auth") === "failed"
            ? "GitHub sign-in did not finish. Please retry or use your username."
            : "",
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
    return () => {
      active = false;
    };
    // Check the session only on entry; later edits must remain the user’s own choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function move(next: number) {
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(
      () => {
        setStep(next);
        setLeaving(false);
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 140,
    );
  }
  function toggle(field: "skills" | "interests" | "kinds", value: string) {
    setProfile({
      ...profile,
      [field]: profile[field].includes(value)
        ? profile[field].filter((v) => v !== value)
        : [...profile[field], value],
    });
  }
  async function importUsername() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/github?" +
          new URLSearchParams({
            action: "profile",
            username: profile.username.trim(),
          }),
      );
      const data = (await response.json()) as {
        error?: string;
        username: string;
        languages: string[];
        sample: number;
      };
      if (!response.ok) throw new Error(data.error);
      setProfile({
        ...profile,
        username: data.username,
        skills: data.languages,
      });
      setNote(
        `Read ${data.sample} public repositories. Review your language suggestions next.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const valid =
    step === 1
      ? profile.skills.length > 0
      : step === 2
        ? profile.interests.length > 0
        : step === 3
          ? profile.kinds.length > 0
          : true;
  return (
    <section className="onboarding">
      <div className="step-trail">
        <span>YOUR DEVELOPER PROFILE</span>
        <span>
          Step {step + 1} of {titles.length}
        </span>
      </div>
      <Progress
        value={((step + 1) / titles.length) * 100}
        className="setup-progress"
      />
      <div key={step} className={"step-scene " + (leaving ? "leaving" : "")}>
        <h1 tabIndex={-1} ref={heading}>
          {titles[step]}
        </h1>
        <p className="intro">{notes[step]}</p>
        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}
        {step === 0 ? (
          <div className="identity-options">
            <div className="connect-card">
              <CodeXml size={28} />
              <h2>
                {connected ? `Connected as ${connected}` : "The easy way in"}
              </h2>
              <p>
                Verify your account and import your public profile. No private
                repository access requested.
              </p>
              {connected ? (
                <span className="connected">
                  <Check size={16} />
                  GitHub verified
                </span>
              ) : (
                <a className="primary" href="/api/auth/github">
                  Continue with GitHub <ArrowRight size={16} />
                </a>
              )}
            </div>
            <div className="manual-import">
              <h3>Or use your public username</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  importUsername();
                }}
              >
                <input
                  aria-label="GitHub username"
                  placeholder="e.g. grzdev"
                  value={profile.username}
                  onChange={(e) =>
                    setProfile({ ...profile, username: e.target.value })
                  }
                />
                <button
                  className="secondary"
                  disabled={busy || !profile.username.trim()}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    "Import profile"
                  )}
                </button>
              </form>
              <p className="muted small">
                Prefer to skip GitHub? Continue and choose your skills yourself.
              </p>
            </div>
            {note && (
              <p role="status" className="message">
                {note}
              </p>
            )}
          </div>
        ) : step === 1 ? (
          <div className="skill-list large-skills">
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
                "HTML",
                "CSS",
                ...profile.skills,
              ]),
            ).map((skill) => (
              <label
                key={skill}
                className={
                  "skill " + (profile.skills.includes(skill) ? "selected" : "")
                }
              >
                <Checkbox
                  checked={profile.skills.includes(skill)}
                  onCheckedChange={() => toggle("skills", skill)}
                />
                {skill}
              </label>
            ))}
          </div>
        ) : step === 2 || step === 3 ? (
          <div className="category-grid">
            {(step === 2 ? categories : kinds).map((c) => {
              const field = step === 2 ? "interests" : "kinds";
              return (
                <label
                  className={
                    "choice-card " +
                    (profile[field].includes(c.id) ? "selected" : "")
                  }
                  key={c.id}
                >
                  <div className="choice-top">
                    <span className="category-icon">{c.icon}</span>
                    <Checkbox
                      checked={profile[field].includes(c.id)}
                      onCheckedChange={() => toggle(field, c.id)}
                    />
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <div className="repo-examples">{c.examples}</div>
                </label>
              );
            })}
          </div>
        ) : step === 4 ? (
          <>
            <RadioGroup
              className="time-options"
              value={profile.pace}
              onValueChange={(pace) => setProfile({ ...profile, pace })}
            >
              {[
                {
                  id: "quick",
                  title: "A little session",
                  time: "30 minutes–2 hours",
                  description:
                    "Prioritize beginner-friendly signals and a contained change.",
                },
                {
                  id: "challenge",
                  title: "An afternoon",
                  time: "2–6 hours",
                  description:
                    "Room to learn the codebase, reproduce a bug, and test a fix.",
                },
                {
                  id: "deep",
                  title: "A deeper project",
                  time: "1–3 days",
                  description:
                    "Room for more exploration and a more involved contribution.",
                },
              ].map((c) => (
                <label
                  className={
                    "time-card " + (profile.pace === c.id ? "selected" : "")
                  }
                  key={c.id}
                >
                  <RadioGroupItem value={c.id} />
                  <div>
                    <h3>{c.title}</h3>
                    <strong>{c.time}</strong>
                    <p>{c.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            <p className="muted small">
              We use this as a preference, not a promise. A reliable time
              estimate needs source-code investigation.
            </p>
          </>
        ) : (
          <RadioGroup
            className="time-options"
            value={profile.discovery}
            onValueChange={(discovery) => setProfile({ ...profile, discovery })}
          >
            {[
              {
                id: "familiar",
                title: "Build on what I know",
                description: "Favor the languages and ecosystems you selected.",
              },
              {
                id: "new",
                title: "Take me somewhere new",
                description:
                  "Explore unfamiliar languages within your interests.",
              },
            ].map((c) => (
              <label
                className={
                  "time-card " + (profile.discovery === c.id ? "selected" : "")
                }
                key={c.id}
              >
                <RadioGroupItem value={c.id} />
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        )}
      </div>
      <footer className="setup-footer">
        <span className="muted small">Your choices stay editable.</span>
        <div>
          {step > 0 && (
            <button
              className="text-button"
              onClick={() => move(step - 1)}
              disabled={leaving || busy}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <button
            className="primary"
            disabled={!valid || leaving || busy}
            onClick={() => (step === 5 ? onComplete() : move(step + 1))}
          >
            {step === 5 ? "Build my shortlist" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </section>
  );
}
