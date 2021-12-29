This is an 'assets' branch for the [vscode-bitburner-connector](https://github.com/hexnaught/vscode-bitburner-connector).

A place to commit assets such as images to be statically hosted/linked for this repository.

## How to use this branch

### Add an asset via git

- `git add images/my-image.png`
- `git commit -m "add images for use in readme"`
- `git push origin assets`

### Reference the image from another branch

Link to the asset in a relative or absolute way:

- `![My Image](../assets/images/my-image.png)`
- `https://raw.githubusercontent.com/hexnaught/vscode-bitburner-connector/assets/images/my-image.png`
