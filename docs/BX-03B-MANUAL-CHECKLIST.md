# BX-03.b — UI baseline and owner checklist

## Automated baseline

Run `npm ci`, `npm run test:ui`, then `npm run check`. Record the CI run URL and outcome before decomposing `src/App.tsx`. Do not mark this section passed based on source inspection alone.

## Owner manual checklist (must be performed in the deployed UI)

- [ ] App opens and the existing Simple Mode layout renders.
- [ ] Send a text-only message; verify reply and loading/error states.
- [ ] Attach a supported file; verify it appears and can be removed.
- [ ] Export/download a generated document; verify the file opens.
- [ ] Connect/disconnect Google Drive and verify explicit user action is required.
- [ ] Reload the page; verify expected local/session state behavior.
- [ ] Test narrow/tablet viewport and keyboard focus on primary actions.
- [ ] Verify login/logout and that protected APIs reject unauthenticated requests.
- [ ] Record any deviations with screenshots and browser/OS version.

**Status:** Not executed by the assistant. `src/App.tsx` decomposition remains deferred until the automated baseline and owner checklist are recorded, as required by `docs/BX-03-SPEC.md`.
