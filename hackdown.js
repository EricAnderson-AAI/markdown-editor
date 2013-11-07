/**
 * Created with IntelliJ IDEA.
 * User: derekking
 * Date: 07/11/2013
 * Time: 15:15
 * To change this template use File | Settings | File Templates.
 */

// Because highlight.js is a bit awkward at times
var languageOverrides = {
	js: 'javascript',
	html: 'xml'
}

marked.setOptions({
	highlight: function (code, lang) {
		if (languageOverrides[lang]) lang = languageOverrides[lang];
		return hljs.LANGUAGES[lang] ? hljs.highlight(lang, code).value : code;
	}
});

function update(e) {
	var val = e.getValue();

	setOutput(val);

	clearTimeout(hashto);
	hashto = setTimeout(updateHash, 1000);

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

var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
	mode: 'gfm',
	lineNumbers: true,
	matchBrackets: true,
	lineWrapping: true,
	theme: 'default',
	onChange: update
});

var fs = appshell.fs,
	app = appshell.app,
	shellAPI = appshell.shellAPI = {},
	currentPath,
	pendingPath,
	exporting = false,
	changed = false,
	newFile = false;

app.addMenu('File', 'file');
app.addMenuItem('file', 'New', 'file.new', 'Cmd-N', '', '', '');
app.addMenuItem('file', 'Open', 'file.open', 'Cmd-O', '', '', '');
app.addMenuItem('file', 'Save', 'file.save', 'Cmd-S', '', '', '');
app.addMenuItem('file', 'Save As', 'file.saveas', 'Cmd-Shift-S', '', '', '');
app.addMenuItem('file', 'Export HTML', 'file.export', 'Cmd-E', '', '', '');
app.addMenuItem('file', 'Quit', 'file.quit', 'Cmd-Q', '', '', '');

shellAPI.executeCommand = function (command) {
	var handlers = {
		'file.new': cmdFileNew,
		'file.open': cmdFileOpen,
		'file.save': cmdFileSave,
		'file.saveas': cmdFileSaveAs,
		'file.export': cmdFileExport,
		'file.quit': cmdFileQuit,
		'file.close_window': cmdCloseWindow
	};

	var handler = handlers[command];

	handler && handler();
}

cmdFileNew();

function cmdFileNew() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) {
		currentPath = 'Untitled.md';
		editor.setValue('');
		changed = false;
		updateFileName();
		newFile = true;
		updateMenus();
	}
}

function cmdFileOpen() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) fs.showOpenDialog(false, false, 'Open File', null, ['md', 'markdown', 'txt'], onFileChosen);
}

function cmdFileSave() {
	if (getFolder(currentPath) === '') {
		exporting = false;
		fs.showSaveDialog('Save As', null, currentPath, onSaveConfirmed);
	} else {
		pendingPath = null;
		fs.writeFile(currentPath, editor.getValue(), 'utf8', onFileWritten);
	}
}

function cmdFileSaveAs() {
	exporting = false;
	fs.showSaveDialog('Save As', getFolder(currentPath), getBaseName(currentPath) + ' copy' + getExtension(currentPath), onSaveConfirmed)
}

function cmdFileExport() {
	exporting = true;
	fs.showSaveDialog('Export HTML As', getFolder(currentPath), getBaseName(currentPath) + '.html', onSaveConfirmed)
}

function cmdFileQuit() {
	var discard = false;
	if (changed) {
		discard = confirm('Discard changes?');
	}
	if (!changed || discard) app.quit();
}

// TODO: this isn't working properly
function cmdCloseWindow() {
	if (changed) {
		app.abortQuit();
		cmdFileSave();
	}
}

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
	app.setMenuItemState('file.saveas', !newFile, false);
}

function getHTML() {
	var output = document.getElementById('out').innerHTML;
	var html = '<!DOCTYPE html><html><head><title>$title</title></head><body>$output</body></html>';
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

var hashto;

changed = true;

function updateHash() {
	window.location.hash = btoa(RawDeflate.deflate(unescape(encodeURIComponent(editor.getValue()))))
}

if (window.location.hash) {
	var h = window.location.hash.replace(/^#/, '');
	if (h.slice(0, 5) == 'view:') {
		setOutput(decodeURIComponent(escape(RawDeflate.inflate(atob(h.slice(5))))));
		document.body.className = 'view';
	} else {
		editor.setValue(decodeURIComponent(escape(RawDeflate.inflate(atob(h)))))
		update(editor);
		editor.focus();
	}
} else {
	update(editor);
	editor.focus();
}

changed = false;

