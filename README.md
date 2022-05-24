### **Archived - Repo moved to https://github.com/bitburner-official/bitburner-vscode**

----

# Bitburner Connector for VSCode

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This extension allows for you to have all of your scripts on your host machine and push them to the running game client!

_**Note: The extension currently works with the 'dev' branch of the game. (as of 28th December 2021)**_

_This is an early WIP with a few hours gone in to both the extension and the game functionality, a lot is subject to change. Use at your own risk! Remember to backup your save and scripts!_

## Extension Configuration

| Configuration | Key | Description | Default |
| ------------- | --- | ----------- | ------- |
| Script Root  | `bitburner.scriptRoot` | The directory that the File Watcher (if enabled) uses as the 'root' directory to watch. | `./` |
| File Watcher - Enable | `bitburner.fileWatcher.enable` | A configuration option that is only read from the Workspace or Folder configurations, a way to enable the File Watcher by default. | `false` |
| Show File Push Notifications | `bitburner.showPushSuccessNotification` | If true, this will show a notification/toast when a file has been successfully pushed to the game. Errors will always show. | `false` |
| Show File Watcher Enabled Notifications | `bitburner.showFileWatcherEnabledNotification` | If true, this will show a notification/toast whenever the File Watcher is enabled and/or the extension configuration scriptRoot has changed. Errors will always show. | `false` |
| Game Authentication Token | `bitburner.authToken` | The auth token that the game generates, needed for you to be able to push files in to your game client. See [#authentication](#authentication) section below. | (No Default) |

## Pushing Files

### Authentication

When the game is started for the first time, it generates an 'Auth Token' that can be used by third party programs/applications/scripts to push files to the game. This extension **requires** that token to in order to function.

You can copy the token from the Bitburner application 'API Server' context menu:

![Image showing API Server context menu in the bitburner game client](https://raw.githubusercontent.com/bitburner-official/bitburner-vscode/assets/images/bit-burner-menu-auth-token.png)

#### Adding the token to the extension:

The token will ultimately end up in the workspace configuration (See your workspaces`./.vscode/settings.json`), so you can either:

- Add the token manually to the workspace `settings.json` to the key of `bitburner.authToken`.
- Use the command palette (CTRL/CMD + SHIFT + P) and select `Bitburner: Add Auth Token`.
  - Paste the Auth Token copied via the games context menu in to the input box.

### Push through the context menu

- Right Click in the VSCode Editor (Your source code) and choose 'Bitburner: Push file to game'

### Push through the command palette

- Open the Command Palette (CTRL/CMD + SHIFT + P)
  - Choose 'Bitburner: Push File To The Game' to save and push a single file (File open in editor)
  - Choose 'Bitburner: Push All Files To The Game' to push all files from your configured `scriptRoot`.

### Push With the file watcher (Disabled by default)

- Open the Command Palette (CTRL/CMD + SHIFT + P)
  - Enable with 'Bitburner: Enable File Watcher'
  - Disable with 'Bitburner: Disable File Watcher'

This is currently disabled by default (but can be overwritten in Workspace/Folder preferences), the behaviour is - It will push all files that have a `.js`, `.ns` or `.script` extension within your currently open folder/workspace - Respecting any folders that you may have them in.

You can change the directory being watching with the `bitburner.scriptRoot` setting within the plugin configuration, open VSCode preferences to modify the value - default as `./` (workspace root).

You can enable the fileWatcher by default with the `bitburner.fileWatcher.enable` setting within the plugin configuration. This setting will not work if set in user settings, it must be set at the workspace or folder level.

**NOTE: You can only watch paths within the workspace VSCode has open.**

### Behaviour

Files that are pushed to the game will be done so relative to the 'Script Root' (See configuration: `bitburner.scriptRoot`), respecting any folders from that root to your scripts location. For example:

_With the the following configuration `scriptRoot: "./out/"`..._

- `./out/script.js` will push to `Home:~/script.js` in game.
- `./out/folder/script.js` will push to `Home:~/folder/script.js` in game.
- `./out/folder/subfolder/script.js` will push to `Home:~/folder/subfolder/script.js` in game.
- `./test.js` will not be pushed to the game as it is a level above the configured 'script root'.

## Bitburner

> Bitburner is a programming-based incremental game. Write scripts in JavaScript to automate gameplay, learn skills, play minigames, solve puzzles, and more in this cyberpunk text-based incremental RPG.

### Relevant Links

The game can be played via Steam or via the Web with any browser that supports and has Javascript enabled. The discord is the place to go for information, help, to raise bugs or talk/help contribute features to the game!

- [Steam Page](https://store.steampowered.com/app/1812820/Bitburner/)
- [Web Version](https://danielyxie.github.io/bitburner/)
- [Game Discord](https://discord.gg/TFc3hKD)
- [Github](https://github.com/danielyxie/bitburner/)
