import React, { useEffect, useState } from 'react';

/**
 * Shows the short git commit of the running build, e.g. "Commit 02cb2db".
 * Value comes from /api/health (server resolves platform env or build-stamp).
 */
export function CommitBadge() {
  const [commit, setCommit] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        const c = typeof data?.commit === 'string' ? data.commit.trim() : '';
        if (!cancelled && c && c !== 'unknown') setCommit(c.slice(0, 7));
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!commit) return null;
  return (
    <span className="commit-badge" data-testid="commit-badge" title={`Running build commit ${commit}`}>
      Commit {commit}
    </span>
  );
}
