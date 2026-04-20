# درب النور — static site (GitHub Pages)

This folder is a **minimal copy** of the game for hosting only. Regenerate it from the main project:

```bash
powershell -ExecutionPolicy Bypass -File scripts/sync-github-pages.ps1
```

Then enable **GitHub Pages** on this repository (deploy from branch root, e.g. `main`).

Site URL: `https://<username>.github.io/<repo>/` → root `index.html` redirects to `game/`.

Do not hand-edit files here unless you accept them being overwritten on the next sync.
