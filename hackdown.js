
var languageOverrides,
	editor;

initializeEditor();

var fs = appshell.fs,
	app = appshell.app,
	handlers = {},
	currentPath,
	pendingPath,
	exporting = false,
	changed = false,
	newFile = false;

/*
This is how we receive commands from the native code
 */
appshell.shellAPI = {
	executeCommand: function (command) {
		var handler = handlers[command];
		handler && handler();
	}
};

/*
Create a "File" menu
 */
app.addMenu('File', 'file');

/*
Add a "New" option
 */
app.addMenuItem('file', 'New', 'file.new', 'Cmd-N', '', '', '');

handlers['file.new'] = handleFileNew;

function handleFileNew() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) {
		currentPath = 'Untitled.md';
		editor.setValue('');
		editor.focus();
		changed = false;
		updateFileName();
		newFile = true;
		updateMenus();
	}
}

/*
Add an "Open" option
 */
app.addMenuItem('file', 'Open', 'file.open', 'Cmd-O', '', '', '');

handlers['file.open'] = handleFileOpen;

function handleFileOpen() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) fs.showOpenDialog(
		false,
		false,
		'Open File',
		null,
		['md', 'markdown', 'txt'],
		onFileChosen
	);
}

/*
Add a "Save" option
 */
app.addMenuItem('file', 'Save', 'file.save', 'Cmd-S', '', '', '');

handlers['file.save'] = handleFileSave;

function handleFileSave() {
	if (getFolder(currentPath) === '') {
		exporting = false;
		fs.showSaveDialog('Save As', null, currentPath, onSaveConfirmed);
	} else {
		pendingPath = null;
		fs.writeFile(currentPath, editor.getValue(), 'utf8', onFileWritten);
	}
}

/*
Add a "Save As" option
 */
app.addMenuItem('file', 'Save As', 'file.save_as', 'Cmd-Shift-S', '', '', '');

handlers['file.save_as'] = handleFileSaveAs;

function handleFileSaveAs() {
	exporting = false;
	fs.showSaveDialog(
		'Save As',
		getFolder(currentPath),
		getBaseName(currentPath) + ' copy' + getExtension(currentPath),
		onSaveConfirmed
	);
}

/*
Add an "Export HTML" option
 */
app.addMenuItem('file', 'Export HTML', 'file.export', 'Cmd-E', '', '', '');

handlers['file.export'] = handleFileExport;

function handleFileExport() {
	exporting = true;
	fs.showSaveDialog('Export HTML As', getFolder(currentPath), getBaseName(currentPath) + '.html', onSaveConfirmed)
}

/*
Add a "Quit" option
 */
app.addMenuItem('file', 'Quit', 'file.quit', 'Cmd-Q', '', '', '');

handlers['file.quit'] = handleFileQuit;

function handleFileQuit() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) app.quit();
}

handleFileNew();

/*
Handle the window being closed
 */
// TODO: this isn't working properly
handlers['file.close_window'] = handleCloseWindow;

function handleCloseWindow() {
	if (changed) {
		app.abortQuit();
		handleFileSave();
	}
}

/*
Callbacks
 */

function onFileChosen(err, selection) {
	if (err === fs.NO_ERROR) {
		pendingPath = selection[0];
		fs.readFile(pendingPath, 'utf8', onFileRead);
	} else {
		fsError(err);
	}
}

function onFileRead(err, data) {
	if (err === fs.NO_ERROR) {
		currentPath = pendingPath;
		editor.setValue(data);
		editor.focus();
		changed = false;
		updateFileName();
		newFile = false;
		updateMenus();
	} else {
		fsError(err);
	}
}

function onFileWritten(err) {
	if (err === fs.NO_ERROR) {
		pendingPath && (currentPath = pendingPath);
		changed = false;
		updateFileName();
		newFile = false;
		updateMenus();
		console.log('File saved OK');
	} else {
		fsError(err);
	}
}

function onSaveConfirmed(err, path) {
	if (err === fs.NO_ERROR) {
		if (path !== "") writeFile(path);
	} else {
		fsError(err);
	}
}

/*
Helpers
 */

function writeFile(path) {
	if (exporting) {
		pendingPath = null;
		fs.writeFile(path, getHTML(), 'utf8', onFileWritten);
	} else {
		pendingPath = path;
		fs.writeFile(pendingPath, editor.getValue(), 'utf8', onFileWritten);
	}
}

function fsError(err) {
	var message;

	switch (err) {
		case fs.NO_ERROR:          message = 'no error';                break;
		case fs.ERR_CANT_READ:     message = 'can\'t read file';        break;
		case fs.ERR_CANT_WRITE:    message = 'can\'t write file';       break;
		default:                   message = 'error number ' + err;     break;
	}

	console.log(message);
}

function updateFileName() {
	document.title = (changed ? '* ' : '') + getBaseName(currentPath);
}

function updateMenus() {
	app.setMenuItemState('file.save_as', !newFile, false);
}

function getHTML() {
	var output = document.getElementById('out').innerHTML;
	var html =
		'<!DOCTYPE html>' +
		'<html>' +
		'<head>' +
		'<title>$title</title>' +
		'</head>' +
		'<body>$output</body>' +
		'</html>';
	html = html.replace(/\$title/, document.title);
	html = html.replace(/\$output/, output);
	return html;
}

function getFolder(path) {
	return path.replace(/(^.*?)[^\/]+\.\w+$/, '$1') || '';
}

function getBaseName(path) {
	return path.replace(/^.*?([^\/]+)\.\w+$/, '$1') || '';
}

function getExtension(path) {
	return path.replace(/^.*?[^\/]+(\.\w+$)/, '$1') || '';
}

function initializeEditor() {
// Because highlight.js is a bit awkward at times
	languageOverrides = {
		js: 'javascript',
		html: 'xml'
	}

	marked.setOptions({
		highlight: function (code, lang) {
			if (languageOverrides[lang]) lang = languageOverrides[lang];
			return hljs.LANGUAGES[lang] ? hljs.highlight(lang, code).value : code;
		}
	});

	editor = CodeMirror.fromTextArea(document.getElementById('code'), {
		mode: 'gfm',
		lineNumbers: true,
		matchBrackets: true,
		lineWrapping: true,
		theme: 'default',
		onChange: update
	});
}

function update(e) {
	var val = e.getValue();

	setOutput(val);

	if (! changed) {
		changed = true;
		updateFileName();
	}
}

function setOutput(val) {
	val = val.replace(/<equation>((.*?\n)*?.*?)<\/equation>/ig, function (a, b) {
		return '<img src="http://latex.codecogs.com/png.latex?' + encodeURIComponent(b) + '" />';
	});

	document.getElementById('out').innerHTML = marked(val);
}

