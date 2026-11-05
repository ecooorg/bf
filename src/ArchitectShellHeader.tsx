/**
 * Shared Project top chrome — same pattern as ProjectMode / App Header:
 * CommitBadge + ModeMenu (Simple · Expert · Project) + Drive + More.
 * Used by /architect-lab so the user does not see a different control set.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CircleHelp, Cloud, CloudUpload, MoreHorizontal } from 'lucide-react';
import { ModeMenu } from './ModeMenu.tsx';
import { CommitBadge } from './CommitBadge.tsx';
import { downloadAllLogs } from './allLogs.ts';
import { driveLabel, driveTitle } from './uiStates.tsx';
import { isDriveConfigured } from './driveClient.ts';
import { connectDriveFiles, isMirrorConnected } from './driveMirror.ts';
import { UserGuideModal } from './UserGuide.tsx';

export type ArchitectShellHeaderProps = {
  /** When false, Project entry in the mode menu is disabled. */
  projectEnabled: boolean;
  authenticated: boolean;
  onSignOut?: () => void;
};

export function ArchitectShellHeader(props: ArchitectShellHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [driveConnected, setDriveConnected] = useState(() => isMirrorConnected());
  const [driveBusy, setDriveBusy] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [moreOpen]);

  async function connectDrive() {
    if (!isDriveConfigured()) return;
    setDriveBusy(true);
    try {
      await connectDriveFiles();
      setDriveConnected(isMirrorConnected());
    } catch {
      setDriveConnected(false);
    } finally {
      setDriveBusy(false);
    }
  }

  return (
    <>
      <header className="header project-app-header" style={{ justifyContent: 'flex-end' }} data-testid="architect-shell-header">
        <div className="header-actions has-mode">
          <CommitBadge />
          <ModeMenu
            current="Project"
            projectEnabled={props.projectEnabled}
            onSelect={(mode) => {
              if (mode === 'Project') return;
              const ok = window.confirm('Leave Project workspace and open the selected agent? Unsaved work on this page may be lost.');
              if (!ok) return;
              try { sessionStorage.setItem('biforge-start-mode', mode); } catch { /* ignore */ }
              window.location.href = '/';
            }}
            onOverview={() => {
              const ok = window.confirm('Leave Project workspace and return to agent selection? Unsaved work on this page may be lost.');
              if (!ok) return;
              try { sessionStorage.removeItem('biforge-start-mode'); } catch { /* ignore */ }
              window.location.href = '/';
            }}
          />
          <button
            type="button"
            className="ghost"
            disabled={driveBusy || !isDriveConfigured()}
            onClick={() => { if (isDriveConfigured()) void connectDrive(); }}
            title={driveTitle({ configured: isDriveConfigured(), connected: driveConnected })}
            aria-label={driveLabel({ configured: isDriveConfigured(), connected: driveConnected, busy: driveBusy })}
          >
            {driveConnected ? <CloudUpload size={14} /> : <Cloud size={14} />}
            <span className="lbl">{driveLabel({ configured: isDriveConfigured(), connected: driveConnected, busy: driveBusy })}</span>
          </button>
          <div className="hdr-more-wrap" ref={moreRef}>
            <button
              type="button"
              className="ghost hdr-more-btn"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              title="User guide, logs, sign out"
              data-testid="architect-shell-more"
            >
              <MoreHorizontal size={14} /> <span className="lbl">More</span>
            </button>
            {moreOpen && (
              <div className="hdr-secondary open" role="menu" data-testid="architect-shell-more-menu">
                <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); setShowUserGuide(true); }}>
                  <CircleHelp size={14} /> User guide
                </button>
                <button
                  type="button"
                  className="ghost"
                  role="menuitem"
                  data-testid="all-logs-menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    void downloadAllLogs().catch((e) => window.alert(String(e?.message || e)));
                  }}
                >
                  All Logs
                </button>
                <a href="/project" className="ghost" role="menuitem" style={{ textDecoration: 'none' }} onClick={() => setMoreOpen(false)}>
                  Legacy Project workspace
                </a>
                {props.authenticated && props.onSignOut && (
                  <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); props.onSignOut?.(); }}>
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {showUserGuide && <UserGuideModal open={showUserGuide} onClose={() => setShowUserGuide(false)} />}
    </>
  );
}
