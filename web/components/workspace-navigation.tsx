"use client";
import { Bookmark, Compass, Settings2 } from "lucide-react";
import { Sidebar, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
type Props = {
  view: string;
  count: number;
  navigate: (view: string) => void;
  compact?: boolean;
};
export function WorkspaceNavigation({
  view,
  count,
  navigate,
  compact = false,
}: Props) {
  const { open, openMobile, isMobile, setOpenMobile } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  if (compact === expanded) return null;
  const links = [
    {
      id: "discover",
      title: "Discover",
      Icon: Compass,
      active: ["discover", "issues", "brief"].includes(view),
    },
    {
      id: "saved",
      title: "My missions",
      Icon: Bookmark,
      active: view === "saved",
    },
    {
      id: "setup",
      title: "Your profile",
      Icon: Settings2,
      active: view === "setup",
    },
  ];
  const content = (
    <>
      <div className="rail-heading">
        {!compact && <span className="rail-label">WORKSPACE</span>}
        <SidebarTrigger
          aria-label={compact ? "Open sidebar" : "Close sidebar"}
          title={compact ? "Open sidebar" : "Close sidebar"}
        />
      </div>
      {links.map(({ id, title, Icon, active }) => (
        <button
          key={id}
          className={"nav " + (active ? "active" : "")}
          title={compact ? title : undefined}
          aria-label={compact ? title : undefined}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            navigate(id);
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon size={19} />
          {!compact && (
            <>
              {title}
              {id === "saved" && <span className="count">{count}</span>}
            </>
          )}
        </button>
      ))}
      {!compact && (
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
      )}
    </>
  );
  return compact ? (
    <nav aria-label="Workspace shortcuts" className="compact-rail">
      {content}
    </nav>
  ) : (
    <Sidebar
      collapsible="none"
      className="rail flow-sidebar"
      role="navigation"
      aria-label="Workspace"
    >
      {content}
    </Sidebar>
  );
}
