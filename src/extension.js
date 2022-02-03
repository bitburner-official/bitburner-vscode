// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require(`vscode`);
const fs = require(`fs`);
const http = require(`http`);
const { getFilesRecursively } = require(`./utils/fs`);

// TODO: Move to extension config? Does this _need_ to be configurable?
const BB_GAME_CONFIG = {
  port: 9990,
  schema: `http`,
  url: `localhost`,
  filePostURI: `/`,
  validFileExtensions: [`.js`, `.script`, `.ns`, `.txt`],
};

/**
 * @type vscode.FileSystemWatcher
 */
let fsWatcher;
let fwEnabled;

/**
 * @type {vscode.SecretStorage}
 */
let secrets;

// TODO: Refactor this user config to combined 'extension/user config' with better internal API/structure
/**
 * @type {{ scriptRoot: string, fwEnabled: boolean, showPushSuccessNotification: boolean, showFileWatcherEnabledNotification: boolean }}
 */
let sanitizedUserConfig;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  secrets = context.secrets;
  /**
   * @type Array<vscode.Disposable>
   */
  const disposableCommands = [];

  sanitizeUserConfig();

  if (fwEnabled) {
    initFileWatcher(sanitizedUserConfig.scriptRoot);
  }

  const configChangeListener = vscode.workspace.onDidChangeConfiguration(() => {
    sanitizeUserConfig();
    if (fwEnabled) {
      fsWatcher.dispose();
      initFileWatcher(sanitizedUserConfig.scriptRoot);
    }
  });

  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.addAuthToken`, () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          password: true,
          placeHolder: `Bitburner Auth Token`,
          title: `Bitburner Auth Token:`,
          prompt: `Please enter the Bitburner Auth Token, for more information, see 'README #authentication'.`,
        })
        .then((authToken) => {
          secrets
            .store(`authToken`, authToken.replace(/^bearer/i, ``).trim())
            .then(() => {
              showToast(`Bitburner Auth Token Added!`);
            })
            .then(undefined, (err) => {
              console.error(`Storing of token failed: `, err);
              showToast(`Failed to add Bitburner Auth Token!`, `error`);
            });
        });
    }),
  );

  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.enableWatcher`, () => {
      if (!isAuthTokenSet()) {
        showAuthError();
        return;
      }

      fwEnabled = true;
      initFileWatcher(sanitizedUserConfig.scriptRoot);
    }),
  );

  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.disableWatcher`, () => {
      fwEnabled = false;
      if (fsWatcher) {
        fsWatcher.dispose();
      }
      showToast(`File Watcher Disabled`);
    }),
  );

  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.pushFile`, () => {
      vscode.window.activeTextEditor.document.save().then(() => {
        if (!isAuthTokenSet()) {
          showAuthError();
          return;
        }

        const currentOpenFileURI = getCurrentOpenDocURI();

        if (!isValidGameFile(currentOpenFileURI)) {
          showToast(
            `Can only push a file that is one of the following file types: ${BB_GAME_CONFIG.validFileExtensions.join(
              `, `,
            )}`,
            `error`,
          );
          return;
        }

        const contents = fs.readFileSync(currentOpenFileURI).toString();
        const filename = stripWorkspaceFolderFromFileName(currentOpenFileURI);

        doPostRequestToBBGame({
          action: `UPSERT`,
          filename: filename,
          code: contents,
        });
      });
    }),
  );

  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.pushAllFiles`, () => {
      vscode.workspace.saveAll(false).then(() => {
        if (!isAuthTokenSet()) {
          showAuthError();
          return;
        }

        const filesURIs = vscode.workspace.workspaceFolders
          .flatMap((wsf) => getFilesRecursively(`${wsf.uri.fsPath.toString()}/${sanitizedUserConfig.scriptRoot}`))
          .filter(isValidGameFile);

        const fileToContentMap = filesURIs.reduce((fileMap, fileURI) => {
          const contents = fs.readFileSync(fileURI).toString();
          const filename = stripWorkspaceFolderFromFileName(fileURI.toString());
          fileMap.set(filename, contents);
          return fileMap;
        }, new Map());

        // TODO: Handle 'success toast' better for 'batch' upload
        // Currently, if notifications are enabled, does a toast per file within doPostRequestToBBGame
        for (const [filename, contents] of fileToContentMap.entries()) {
          doPostRequestToBBGame({
            action: `UPSERT`,
            filename: filename,
            code: contents,
          });
        }
      });
    }),
  );

  // TODO: Not yet implemented delete within the game...
  disposableCommands.push(
    vscode.commands.registerCommand(`ext.bitburner-connector.deleteFile`, () => {
      vscode.window.showInformationMessage(`Deleting files is not yet implemented...`);
    }),
  );

  context.subscriptions.push(...disposableCommands, fsWatcher, configChangeListener);
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
    .join(`|`)}/${rootDir}/**/*{${BB_GAME_CONFIG.validFileExtensions.join(`,`)}}`.replace(/[\\|/]+/g, `/`);

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

  if (sanitizedUserConfig.showFileWatcherEnabledNotification) {
    showToast(
      `File Watcher Enabled For \`${BB_GAME_CONFIG.validFileExtensions.join(
        `\`, \``,
      )}\` files within the ${vscode.workspace.workspaceFolders
        .map((ws) => `${ws.uri.fsPath}/${rootDir}/**`)
        .join(`, `)} path(s).`.replace(/[\\|/]+/g, `/`),
      `information`,
      { forceShow: true },
    );
  }
};

/**
 * Strip the absolute path to the workspace from a file location URI
 * @param {string} filePath A path to a file
 * @returns Returns the file path and name relative to the workspace root (if possible), otherwise falling back to
 * the name and extension after the final `/` in the path.
 */
const stripWorkspaceFolderFromFileName = (filePath) => {
  const workspaceFolderPaths = vscode.workspace.workspaceFolders.map((wsf) => wsf.uri.fsPath.toString());

  for (const folderName of workspaceFolderPaths) {
    if (filePath.startsWith(folderName)) {
      return filePath
        .replace(folderName, ``)
        .replace(/\.*[\\|/]+/g, `/`)
        .replace(sanitizedUserConfig.scriptRoot.replace(/\.*[\\|/]+/g, `/`), ``)
        .replace(/ /g, `-`);
    }
  }
  // If it cant strip the workspace path to keep 'folder' structure, fallback to just the filename.ext
  return filePath.split(`/`).pop().replace(/ +/g, `-`);
};

/**
 * Get the URI of the currently opened file
 * @returns The file path of the currently open file
 */
const getCurrentOpenDocURI = () => vscode.window.activeTextEditor.document.uri.fsPath.toString();

/**
 * Make a POST request to the expected port of the game
 * @param {{ action: `CREATE` | `UPDATE` | `UPSERT` | `DELETE`, filename: string, code?: string }} payload The payload to send to the game client
 */
const doPostRequestToBBGame = async (payload) => {
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

  const token = await secrets.get(`authToken`);
  const stringPayload = JSON.stringify(cleanPayload);
  const options = {
    hostname: BB_GAME_CONFIG.url,
    port: BB_GAME_CONFIG.port,
    path: BB_GAME_CONFIG.filePostURI,
    method: `POST`,
    headers: {
      "Content-Type": `application/json`,
      "Content-Length": stringPayload.length,
      Authorization: `Bearer ${token}`,
    },
  };

  const req = http.request(options, (res) => {
    res.on(`data`, (d) => {
      const responseBody = Buffer.from(d).toString();

      switch (res.statusCode) {
        case 200:
          showToast(`${cleanPayload.filename} has been uploaded!`);
          break;
        case 401:
          showToast(`Failed to push ${cleanPayload.filename} to the game!\n${responseBody}`, `error`);
          break;
        default:
          showToast(`File failed to push, statusCode: ${res.statusCode} | message: ${responseBody}`, `error`);
          break;
      }
    });
  });

  req.write(stringPayload);
  req.end();
};

// TODO: Overhaul internal user/extension config 'API'
const sanitizeUserConfig = async () => {
  const userConfig = vscode.workspace.getConfiguration(`bitburner`);
  const fwInspect = vscode.workspace.getConfiguration(`bitburner`).inspect(`fileWatcher.enable`);

  // Only accepts values from workspace or folder level configs
  const fwVal = fwInspect.workspaceValue || fwInspect.workspaceFolderValue || fwInspect.defaultValue;

  if (fwInspect.globalValue) {
    showToast(
      `Warning: You have enabled the bitburner file watcher in your global (user) settings, the extension will default to workspace or folder settings instead.`,
      `error`,
    );
  }

  // Checks if initializing or user config changed for fileWatcher.enabled
  if (!sanitizedUserConfig || (await secrets.get(`authToken`)) || sanitizedUserConfig.fwEnabled !== fwVal) {
    fwEnabled = fwVal;
  }

  sanitizedUserConfig = {
    scriptRoot: `${userConfig.get(`scriptRoot`)}/`.replace(/^\./, ``).replace(/\/*$/, `/`),
    fwEnabled: fwVal,
    showPushSuccessNotification: userConfig.get(`showPushSuccessNotification`),
    showFileWatcherEnabledNotification: userConfig.get(`showFileWatcherEnabledNotification`),
  };
};

// TODO: refine 'showToast' internal API
const ToastTypes = Object.freeze({
  information: vscode.window.showInformationMessage,
  warning: vscode.window.showWarningMessage,
  error: vscode.window.showErrorMessage,
});

/**
 * Show a toast/notification to the user.
 * @param {string} message The message to be in the toast
 * @param {'information' | 'warning' | 'error'} toastType The type of toast we are wanting to issue, defaults to 'information' if not provided
 * @param {{ forceShow: boolean }} opts Optional toast options
 */
const showToast = (message, toastType = `information`, opts = { forceShow: false }) => {
  if (!Object.keys(ToastTypes).includes(toastType)) {
    return;
  }
  if (!sanitizedUserConfig.showPushSuccessNotification && !opts.forceShow && toastType !== `error`) {
    return;
  }

  ToastTypes[toastType](message);
};

const isValidGameFile = (fileURI) => BB_GAME_CONFIG.validFileExtensions.some((ext) => fileURI.endsWith(ext));

const isAuthTokenSet = async () => Boolean(await secrets.get(`authToken`));
const showAuthError = () => {
  showToast(
    `No Bitburner Auth Token is set. Please see the 'Authorization' section of the extensions README.md for more information.`,
    `error`,
  );
};

module.exports = {
  activate,
  deactivate,
};
