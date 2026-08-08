# Upstream Lexicon Inputs

Put the upstream English lexicon file here before running the build.

Example:

```text
src/lexicon-build/upstream/lexicon.ts
```

Then run:

```powershell
npm run build:nlp-qa-lexicon -- src/lexicon-build/upstream/lexicon.ts
```

This folder is intentionally not populated by default because upstream lexicons
can be large and may have separate provenance or license text to preserve.
