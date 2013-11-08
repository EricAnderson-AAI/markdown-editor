# Hacking the Brackets shell
This is a quick hack to make use of Adobe's Brackets shell to make your own desktop apps in HTML and javascript. If you haven't seen Brackets, [take a look](http://brackets.io/) ~ it's a full-featured IDE written in javascript which installs on the desktop as a self contained app or exe. It's powered by the Chromium Embedded Framework (CEF3), and now has a separate node server process. This where it differs from [node-webkit](https://github.com/rogerwang/node-webkit), where Chromium and node run in the same thread. In certain scenarios the Brackets approach could offer performance benefits, but the downside is that communication (via web-sockets) needs to be set up between the two processes, making use of node modules more difficult.

The good news is that CEF extensions are included to allow most of the file system operations that an application might want to do, as long as you're dealing with text files only, and have no need to read or write binary files or connect to sqlite, etc. The other plus is the the Brackets team have the build process extremely well gruntified, and (at least on the mac) it's insanely quick to get up and running.

In this post, I'm going to take you through the steps to create a viable application:

* Download and build Brackets.
* Hack the shell to use your own icon and application name.
* Where to look for API documentation.
* Using the API in your code to set up a File menu.

## Building Brackets
There are very detailed instructions on building Brackets on the [Brackets shell github wiki](https://github.com/adobe/brackets-shell/wiki/Building-Brackets-Shell), note that it's best to clone the Brackets project as well as the shell project into adjacent folders, as the grunt files assume it to be there. Once you have the whole of brackets building OK, then you can start hacking.

## Hacking the shell
A search for the string "Brackets" on the `brackets-shell` project root quickly reveals likely candidates for files to change:

* `/Gruntfile.js` ~ one reference under `build.name`.
* `/appshell/config.h` ~ defines `APP_NAME` for each OS.
* `/appshell_config.gypi` ~ one reference under `variables.appname`.
* `/appshell/mac/English.lproj` ~ 5 references, covering all mentions of the app name in the main menu.

To customise the app icon, simply replace `/appshell/mac/appshell.icns` with your own icon file. The `/appshell/res/` folder has an `appshell.ico` file for Windows and various sized png's of the icon.

If you now run `grunt full-build` in the `brackets-shell` root you should get a rebranded version of Brackets.

## Exploring the API
When you build the shell, the fully packaged app appears in `/installer/mac/staging/`. But you also get an empty shell in `/xcodebuild/Release/`, with no HTML in it. When you run it, you are prompted for an html file to open, which gets loaded into the webkit window. This is really useful for experimenting and for the development process, as you don't have to build after every change. Also, when you right click on the window, you get a "Show Dev Tools" option. This opens up a console just like the Chrome Dev Tools. If you type "appshell" at the console prompt, you get to see the API objects.

    Object {fs: Object, app: Object, shellAPI: Object}
        app: Object
            ERR_NODE_FAILED: -3
            ERR_NODE_NOT_YET_STARTED: -1
            ERR_NODE_PORT_NOT_YET_SET: -2
            NO_ERROR: 0
            abortQuit: function () {
            addMenu: function (title, id, position, relativeId, callback) {
            addMenuItem: function (parentId, title, id, key, displayStr, position, relativeId, callback) {
            closeLiveBrowser: function (callback) {
            dragWindow: function () {
            get language: function () { return GetCurrentLanguage(); }
            getApplicationSupportDirectory: function () {
            getDroppedFiles: function (callback) {
            getElapsedMilliseconds: function () {
            getMenuItemState: function (commandid, callback) {
            getMenuPosition: function (commandId, callback) {
            getMenuTitle: function (commandid, callback) {
            getNodeState: function (callback) {
            getPendingFilesToOpen: function (callback) {
            getRemoteDebuggingPort: function () {
            getUserDocumentsDirectory: function () {
            openLiveBrowser: function (url, enableRemoteDebugging, callback) {
            openURLInDefaultBrowser: function (url, callback) {
            quit: function () {
            removeMenu: function (commandId, callback) {
            removeMenuItem: function (commandId, callback) {
            set language: undefined
            setMenuItemShortcut: function (commandId, shortcut, displayStr, callback) {
            setMenuItemState: function (commandid, enabled, checked, callback) {
            setMenuTitle: function (commandid, title, callback) {
            showDeveloperTools: function () {
            showExtensionsFolder: function (appURL, callback) {
            showOSFolder: function (path, callback) {
            __proto__: Object
        fs: Object
            ERR_BROWSER_NOT_INSTALLED: 11
            ERR_CANT_READ: 4
            ERR_CANT_WRITE: 6
            ERR_FILE_EXISTS: 10
            ERR_INVALID_PARAMS: 2
            ERR_NOT_DIRECTORY: 9
            ERR_NOT_FILE: 8
            ERR_NOT_FOUND: 3
            ERR_OUT_OF_SPACE: 7
            ERR_UNKNOWN: 1
            ERR_UNSUPPORTED_ENCODING: 5
            NO_ERROR: 0
            chmod: function (path, mode, callback) {
            copyFile: function (src, dest, callback) {
            isNetworkDrive: function (path, callback) {
            makedir: function (path, mode, callback) {
            moveToTrash: function (path, callback) {
            readFile: function (path, encoding, callback) {
            readdir: function (path, callback) {
            rename: function (oldPath, newPath, callback) {
            showOpenDialog: function (allowMultipleSelection, chooseDirectory, title, initialPath, fileTypes, callback) {
            showSaveDialog: function (title, initialPath, proposedNewFilename, callback) {
            stat: function (path, callback) {
            unlink: function (path, callback) {
            writeFile: function (path, data, encoding, callback) {
            __proto__: Object
        shellAPI: Object
        __proto__: Object

As you can see, the `appshell.app` object lets you work with the window and menus, and the `appshell.fs` object lets you work with the file system. The `appshell.shellAPI` object is where the shell communicates with your code, as I'll show later.

You can get more documentation on the API from the comments in `/appshell_extensions.js`.

## Using the API
If you want to cut to the chase, [clone my project](https://github.com/Hyperlounge/markdown-editor) to a folder adjacent to the `brackets-shell` folder. Run the shell in `/xcodebuild/Release/` and open the `index.html` in the `markdown-editor` project root. You should see a nice markdown editor UI with a fully functional file menu. Take a look at `/hackdown.js` ~ the comments in this file explain what's going on. 

## Packaging the app
To create a build with your app in the shell, you need to change a file ~ In the `brackets-shell` project, change the `Gruntfile.js` thus: 

* Remove `/src` from `copy.www.files[0].cwd`.
* Change `git.www.repo` to `../markdown-editor`.

Then run `grunt full-build` in the `brackets-shell` folder. Your packaged app should now be in `/installer/mac/staging/`.

## Acknowledgements
Thanks to [James Taylor](https://github.com/jbt) for the markdown editor code that I based this demo on, and [Clint Berry](http://clintberry.com/blog/) who's blog helped me get up and running.

