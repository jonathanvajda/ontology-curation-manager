# NLP QA English Lexicon Build

This folder contains the repeatable build path for a purpose-built spelling
lexicon used by the static NLP Quality Assurance page.

## Inputs

Place an upstream English POS lexicon in `src/lexicon-build/upstream/`.

Supported shapes:

```js
window.POSTAGGER_LEXICON = {
  "regulated": ["VBN", "JJ"]
};
```

```js
export const lexicon = {
  regulated: "VBN|JJ"
};
```

```js
module.exports = {
  lexicon: {
    regulated: "VBN|JJ"
  }
};
```

## Build

```powershell
npm run build:nlp-qa-lexicon -- src/lexicon-build/upstream/lexicon.ts
```

The default output is:

```text
docs/app/data/nlp-qa-english-lexicon.js
```

## Policy

The build keeps words useful for spelling lookup and drops entries that are
more likely to add noise in ontology annotation QA:

- punctuation-only entries
- very short uncommon tokens
- slash-heavy compounds
- proper nouns by default

Ontology labels, prefLabels, acronyms, imported ontology terms, and user
allowlists should be layered at runtime rather than baked into this base asset.
