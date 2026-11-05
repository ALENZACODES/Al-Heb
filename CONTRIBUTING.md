# Contributing

Al-Heb is a private repository for the ALEF Hebrew course. It is not an open-source project, and it is not seeking public contributions. No licence has been chosen. Until one is, all rights are reserved.

People who already have access can open a GitHub issue for a defect. Do not put secrets, tokens, or someone else's private data in the repository or in an issue. Do not mark Hebrew, audio, or images as reviewed or approved unless a person has reviewed them and that review is recorded in the repo.

```sh
npm test
node tools/docs/linkcheck.mjs
node tools/meta/scan.mjs --text
```

`npm test` is the fast unit tier. The CI workflow on `main` also runs the browser tier and the `build-dist` job. See [README.md](README.md) and [docs/INDEX.md](docs/INDEX.md).
