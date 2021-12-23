# Bitburner Connector for VSCode

This extension allows for you to have all of your scripts on your host machine and push them to the running game client!

_This is an early WIP with a few hours gone in to it at the moment across the extension and the game support! Use at your own risk! Remember to backup your save and scripts!_

## Pushing Files

### Through the context menu

- Right Click in the VSCode Editor (Your source code) and choose 'Bitburner: Push file to game'

### With the file watcher (Disabled by default)

- Open the Command Palette (CTRL/CMD + SHIFT + P)
  - Enable with 'Bitburner: Enable File Watcher'
  - Disable with 'Bitburner: Disable File Watcher'

This is currently disabled by default, the behaviour is - It will push all files that have a `.js`, `.ns` or `.script` extension within your currently open folder/workspace - Respecting any folders that you may have them in.

You can change the directory being watching with the `bitburner.scriptRoot` settng within the plugin configuration, open VSCode preferences to modify the value - default as `./` (workspace root).

**NOTE: You can only watch paths within the workspace VSCode has open.**

### Behaviour

Pushing files will push them to the game, relative to your workspace root (or configured `bitburner.scriptRoot` VSCode setting) and the games 'Home' computer.

- `/script.js` will push to `~/script.js` in game.
- `src/script.js` will push to `~/src/script.js` in game.
