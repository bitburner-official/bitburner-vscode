# Bitburner Connector for VSCode

This extension allows for you to have all of your scripts on your host machine and push them to the running game client!

_This is an early WIP with a few hours gone in to it at the moment across the extension and the game support! Use at your own risk! Remember to backup your save and scripts!_

## Extension Configuration

| Configuration | Key | Description | Default |
| ------------- | --- | ----------- | ------- |
| Script Root  | `bitburner.scriptRoot` | The directory that the File Watcher (if enabled) uses as the 'root' directory to watch. | `./` |
| File Watcher - Enable | `bitburner.fileWatcher.enable` | A configuration option that is only read from the Workspace or Folder configurations, a way to enable the File Watcher by default. | `false` |
| Show File Push Notifications | `bitburner.showPushSuccessNotification` | If true, this will show a notification/toast when a file has been successfully pushed to the game. Errors will always show. | `false` |
| Show File Watcher Enabled Notifications | `bitburner.showFileWatcherEnabledNotification` | If true, this will show a notification/toast whenever the File Watcher is enabled and/or the extension configuration scriptRoot has changed. Errors will always show. | `false` |

## Pushing Files

### Through the context menu

- Right Click in the VSCode Editor (Your source code) and choose 'Bitburner: Push file to game'

### With the file watcher (Disabled by default)

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
