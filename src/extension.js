// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const http = require("http");

// TODO: Move to extension config? Does this _need_ to be configurable?
const BB_GAME_CONFIG = {
  port: 9990,
  schema: `http`,
  url: `localhost`,
  filePostURI: `/`,
};

/**
 * @type vscode.FileSystemWatcher
 */
let fsWatcher;
let fwEnabled = false;

let sanitizedUserConfig;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  /**
   * @type Array<vscode.Disposable>
   */
  const disposableCommands = [];

  sanitizeUserConfig();

  const configChangeListener = vscode.workspace.onDidChangeConfiguration(() => {
    sanitizeUserConfig();
    if (fwEnabled) {
      fsWatcher.dispose();
      initFileWatcher(sanitizedUserConfig.scriptRoot);
    }
  });

  disposableCommands.push(
    vscode.commands.registerCommand(
      "ext.bitburner-connector.enableWatcher",
      () => {
        fwEnabled = true;
        initFileWatcher(sanitizedUserConfig.scriptRoot);
      }
    )
  );

  disposableCommands.push(
    vscode.commands.registerCommand(
      "ext.bitburner-connector.disableWatcher",
      () => {
        fwEnabled = false;
        if (fsWatcher) {
          fsWatcher.dispose();
        }
        vscode.window.showInformationMessage(`File Watcher Disabled`);
      }
    )
  );

  disposableCommands.push(
    vscode.commands.registerCommand("ext.bitburner-connector.pushFile", () => {
      vscode.window.activeTextEditor.document.save().then(() => {
        const currentOpenFileURI = getCurrentOpenDocURI();

        const contents = fs.readFileSync(currentOpenFileURI).toString();
        const filename = stripWorkspaceFolderFromFileName(currentOpenFileURI);

        doPostRequestToBBGame({
          action: `UPSERT`,
          filename: filename,
          code: contents,
        });
      });
    })
  );

  // TODO: Not yet implemented delete within the game...
  disposableCommands.push(
    vscode.commands.registerCommand(
      "ext.bitburner-connector.deleteFile",
      () => {
        vscode.window.showInformationMessage(
          `Deleting files is not yet implemented...`
        );
      }
    )
  );

  context.subscriptions.push(
    ...disposableCommands,
    fsWatcher,
    configChangeListener
  );
}

// this method is called when your extension is deactivated
function deactivate() {}

/**
 * Method to initialize a file watcher for the files we expect and register the
 * event handler callbacks.
 * @param {string} rootDir The root directory to watch for changes
 */
const initFileWatcher = (rootDir = `./`) => {
  const fullWatcherPathGlob = `${vscode.workspace.workspaceFolders
    .map((folder) => folder.uri.fsPath.toString())
    .join(`|`)}/${rootDir}/**/*.{script,js,ns}`.replace(/[\\|/]+/g, `/`);

  console.group({ fullWatcherPathGlob });

  fsWatcher = vscode.workspace.createFileSystemWatcher(fullWatcherPathGlob);

  fsWatcher.onDidChange(async (event) => {
    const contents = fs.readFileSync(event.fsPath.toString()).toString();
    const filename = stripWorkspaceFolderFromFileName(event.fsPath.toString());

    doPostRequestToBBGame({
      action: `UPDATE`,
      filename: filename,
      code: contents,
    });
  });

  fsWatcher.onDidCreate((event) => {
    const contents = fs.readFileSync(event.fsPath.toString()).toString();
    const filename = stripWorkspaceFolderFromFileName(event.fsPath.toString());

    doPostRequestToBBGame({
      action: `CREATE`,
      filename: filename,
      code: contents,
    });
  });

  // TODO: Implement 'delete' endpoint in game
  // fsWatcher.onDidDelete((event) => {
  //   const filename = stripWorkspaceFolderFromFileName(event.fsPath.toString());
  //   uploadFilePostRequest({
  //     action: `DELETE`,
  //     filename: filename,
  //   });
  // });

  vscode.window.showInformationMessage(
    `File Watcher Enabled For \`.js\`, \`.ns\` and \`.script\` files within the ${vscode.workspace.workspaceFolders
      .map((ws) => `${ws.uri.fsPath}/${rootDir}/**`)
      .join(`, `)} path(s).`.replace(/[\\|/]+/g, `/`)
  );
};

/**
 * Strip the absolute path to the workspace from a file location URI
 * @param {string} filePath A path to a file
 * @returns Returns the file path and name relative to the workspace root (if possible), otherwise falling back to
 * the name and extension after the final `/` in the path.
 */
const stripWorkspaceFolderFromFileName = (filePath) => {
  const workspaceFolderPaths = vscode.workspace.workspaceFolders.map((wsf) =>
    wsf.uri.fsPath.toString()
  );

  for (const folderName of workspaceFolderPaths) {
    if (filePath.startsWith(folderName)) {
      return filePath
        .replace(folderName, ``)
        .replace(/\.*[\\|/]+/g, `/`)
        .replace(sanitizedUserConfig.scriptRoot.replace(/\.*[\\|/]+/g, `/`), "")
        .replace(/ /g, `-`);
    }
  }
  // If it cant strip the workspace path to keep 'folder' structure, fallback to just the filename.ext
  return filePath.split("/").pop().replace(/ +/g, `-`);
};

/**
 * Get the URI of the currently opened file
 * @returns The file path of the currently open file
 */
const getCurrentOpenDocURI = () =>
  vscode.window.activeTextEditor.document.uri.fsPath.toString();

/**
 * Make a POST request to the expected port of the game
 * @param {{ action: `CREATE` | `UPDATE` | `UPSERT` | `DELETE`, filename: string, code?: string }} payload The payload to send to the game client
 */
const doPostRequestToBBGame = (payload) => {
  // If the file is going to be in a director, it NEEDS the leading `/`, i.e. `/my-dir/file.js`
  // If the file is standalone, it CAN NOT HAVE a leading slash, i.e. `file.js`
  // The game will not accept the file and/or have undefined behaviour otherwise...
  const cleanPayload = {
    filename: `${payload.filename}`.replace(/[\\|/]+/g, `/`),
    code: Buffer.from(payload.code).toString(`base64`),
  };
  if (/\//.test(cleanPayload.filename)) {
    cleanPayload.filename = `/${cleanPayload.filename}`;
  }

  const stringPayload = JSON.stringify(cleanPayload);
  const options = {
    hostname: BB_GAME_CONFIG.url,
    port: BB_GAME_CONFIG.port,
    path: BB_GAME_CONFIG.filePostURI,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": stringPayload.length,
    },
  };

  const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on("data", (d) => {
      process.stdout.write(d);
    });
  });

  req.on("error", (err) => {
    vscode.window.showErrorMessage(
      `Failed to push ${cleanPayload.filename} to the game!\n${err}`
    );
  });

  req.on("finish", () => {
    vscode.window.showInformationMessage(
      `${cleanPayload.filename} has been uploaded!`
    );
  });

  req.write(stringPayload);
  req.end();
};

module.exports = {
  activate,
  deactivate,
};

const sanitizeUserConfig = () => {
  const userConfig = vscode.workspace.getConfiguration(`bitburner`);

  sanitizedUserConfig = {
    scriptRoot: `${userConfig.get(`scriptRoot`)}/`
      .replace(/^\./, ``)
      .replace(/\/*$/, `/`),
  };
};
