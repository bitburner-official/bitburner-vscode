# Contributing Guidelines

## Contributing some changes

- Fork this repository
- Make your changes
- Create a [Pull Request](https://github.com/bitburner-official/bitburner-vscode/compare) from your fork, to the `bitburner-official/bitburner-vscode` repository with `develop` as the base branch.
- The PR will be reviewed and either merged or commented on.
    - If the PR has comments, it will remain open until all comments are resolved.
    - The PR will be squashed and merged in to `develop`

## Commit Message Format

_If you don't/haven't followed these guidelines, don't worry! I will update the PR title prior to merging your PR_.

We are using `semantic-release` to help automate and version our releases, this relies on commit messages to be in a specific format - We are using the 'Angular' preset, see [the Angular Commit Message Guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commit-message-format) for examples.

We can support custom keywords, these can be seen under the `@semantic-release/commit-analyzer` `releaseRules` within [`.releaserc`](https://github.com/bitburner-official/bitburner-vscode/blob/master/.releaserc).

Current Custom Release Rules:

| Type | Scope | SemVer | Example |
| ---- | ----- | ------ | ------- |
| `docs` | `README` | Patch (`#.#.X`) | `docs(README): update description for foo` |
