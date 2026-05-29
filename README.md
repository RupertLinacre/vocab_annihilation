# vocab_annihilation

Vocabulary source of truth lives in `vocab_definitions/`, with one file per definition grouped into difficulty folders such as `reception/`, `year_1/`, `year_2/`, and `year_6_plus_plus/`.

`src/generated/vocab.ts` is a generated build artifact created from those source files by `pnpm run build:vocab`.

After cloning, run:

```sh
pnpm run build:vocab
```

Most other scripts also regenerate vocab automatically through npm lifecycle hooks.