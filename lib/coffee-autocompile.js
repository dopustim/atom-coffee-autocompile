'use babel';
import fs from 'fs';
import path from 'path';
import {CompositeDisposable} from 'atom';
import resolve from 'resolve';
import mkdirp from 'mkdirp';
import coffeeFallback from 'coffee-script';
import {allowUnsafeNewFunction} from 'loophole';
import {initView, deinitView, showView} from './coffee-autocompile-view.js';

var uglifyJS;
allowUnsafeNewFunction(() =>
  uglifyJS = require('uglify-js')
);

export var config = {
  compileIfNoOutSpecified: {
    description: 'compile coffeescript files where no "out" parameter is specified at the top of the file',
    type: 'boolean',
    default: false,
  },
  statusBarMessageTimeout: {
    description: 'Timeout before the status bar message disappears',
    type: 'integer',
    default: 5000,
    minimum: 0,
  },
};

var disposables;

export function activate() {
  var coffeeScriptGrammar = atom.grammars.grammarForScopeName('source.coffee');
  disposables = new CompositeDisposable();
  disposables.add(atom.workspace.observeTextEditors(textEditor => {
    var textEditorDisposable;

    if (textEditor.getGrammar() != coffeeScriptGrammar) {
      return;
    }

    textEditorDisposable = new CompositeDisposable(
      textEditor.onDidSave(() =>
        compile(textEditor)
      ),

      textEditor.onDidDestroy(() => {
        textEditorDisposable.dispose();
        disposables.remove(textEditorDisposable);
      })
    );

    disposables.add(textEditorDisposable);
  }));
}

export function deactivate() {
  disposables.dispose();
  disposables = null;
  deinitView();
}

export function consumeStatusBar(statusBar) {
  initView(statusBar);
}

function compile(textEditor) {
  var params = getParams(textEditor);
  if (!params.out && !atom.config.get('coffee-autocompile.compileIfNoOutSpecified'))
    return;
  params.inPath = textEditor.getURI();
  params.outPath = params.out ?
    path.resolve(path.dirname(params.inPath), params.out) :
    params.inPath.replace(/\.coffee$/, '.js');
  render(textEditor.getText(), params);
}

function render(source, params) {
  var {inPath, outPath} = params;
  getCoffeeExecutable(path.dirname(inPath)).then(coffee =>
    coffee.compile(source, {
      bare: params.bare,
      generatedFile: path.basename(outPath),
      sourceFiles: [path.relative(path.dirname(outPath), inPath)],
      sourceMap: !!params.sourcemap,
    })
  ).then(renderer => {
    var {js, sourcemap} = allowUnsafeNewFunction(() =>
      params.sourcemap ?
        postRenderWithSourcemap(renderer, params) :
        postRenderNoSourcemap(renderer, params)
    );
    writeFile(outPath, js);
    if (sourcemap)
      writeFile(`${outPath}.map`, sourcemap);
  }).catch(error =>
    showView('error', 'coffee-script:', error.toString())
  );
}

function postRenderWithSourcemap({js, v3SourceMap: sourcemap}, {outPath, compress}) {
  var outSourcemapPath = `${path.basename(outPath)}.map`;

  if (compress) {
    ({code: js, map: sourcemap} = uglifyJS.minify(js, {
      fromString: true,
      inSourceMap: JSON.parse(sourcemap),
      outSourceMap: outSourcemapPath,
    }));
  } else {
    js += `\n//# sourceMappingURL=${outSourcemapPath}`;
  }

  return {js, sourcemap};
}

function postRenderNoSourcemap(js, {compress}) {
  return !compress ? js : uglifyJS.minify(js, {
    fromString: true,
  }).code;
}

function getCoffeeExecutable(basedir) {
  return getModulePath(basedir, 'coffee-script').then(filename => {
    try {
      return require(filename);
    } catch (e) {
      return coffeeFallback;
    }
  });
}

function getModulePath(basedir, module) {
  return new Promise(accept =>
    resolve(module, {basedir}, (error, filename) => {
      error ? accept('') : accept(filename);
    })
  );
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath), error => {
    if (error) return showView('error', error.message);

    fs.writeFile(filePath, content, error => {
      if (error) return showView('error', error.message);

      showView('success', getPathInProject(filePath));
    });
  });
}

function getParams(textEditor) {
  var firstLine = textEditor.lineTextForBufferRow(0);
  if (firstLine.match(/^#!/)) firstLine = textEditor.lineTextForBufferRow(1);

  var [, paramString] = firstLine.match(/\s*#\s*(.*)/) || [];
  if (!paramString) return {};
  paramString = paramString.trim();
  var out = replacePlaceholders(getParam(paramString, 'out'), textEditor);
  var bare = parseBool(getParam(paramString, 'bare'));
  var compress = parseBool(getParam(paramString, 'compress'));
  var sourcemap = parseBool(getParam(paramString, 'sourcemap'));
  return {out, bare, compress, sourcemap};
}

function getParam(paramString, key) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [, ''];
  return value.trim();
}

function parseBool(value) {
  return value == 'false' ? false : !!value;
}

function getPathInProject(filePath) {
  var projectPath = path.dirname(filePath);
  for (let p of atom.project.getPaths()) {
    if (filePath.match(p)) projectPath = p;
  }
  var regex = new RegExp(`^${projectPath}(/|\\\\)?`);
  return filePath.replace(regex, '');
}

function replacePlaceholders(outPath, textEditor) {
  var inFile = path.basename(textEditor.getURI());
  var extname = path.extname(inFile).substr(1);
  var basename = inFile.substr(0, inFile.length - extname.length - 1);
  return outPath.replace(/\$1/g, basename).replace(/\$2/g, extname);
}
