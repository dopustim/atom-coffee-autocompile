'use babel';
import fs from 'fs';
import path from 'path';
import {CompositeDisposable} from 'atom';
import mkdirp from 'mkdirp';
import coffee from 'coffee-script';
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
    default: '5000',
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
  var renderer;
  var js;
  var sourcemap;

  try {
    renderer = coffee.compile(source, {
      generatedFile: getRelativePath(params.outPath),
      sourceFiles: [getRelativePath(params.inPath)],
      sourceMap: !!params.sourcemap,
    });
  } catch (error) {
    return showView('error', 'coffee-script:', error.toString());
  }

  allowUnsafeNewFunction(() => {
    if (params.sourcemap) {
      ({js, sourcemap} = postRenderWithSourcemap(renderer, params));
      writeFile(`${params.outPath}.map`, sourcemap);
    } else {
      js = postRenderNoSourcemap(renderer, params);
    }
  });

  writeFile(params.outPath, js);
}

function postRenderWithSourcemap(renderer, {outPath, compress}) {
  var {js, v3SourceMap: sourcemap} = renderer;
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

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath), error => {
    if (error) return showView('error', error.message);

    fs.writeFile(filePath, content, error => {
      if (error) return showView('error', error.message);

      showView('success', getRelativePath(filePath));
    });
  });
}

function getParams(textEditor) {
  var firstLine = textEditor.lineTextForBufferRow(0);
  if (firstLine.match(/^#!/)) firstLine = textEditor.lineTextForBufferRow(1);

  var [, paramString] = firstLine.match(/\s*#\s*(.*)/) || [];
  if (!paramString) return {};
  paramString = paramString.trim();
  var out = getParam(paramString, 'out');
  var compress = getParam(paramString, 'compress', true);
  var sourcemap = getParam(paramString, 'sourcemap', true);
  return {out, compress, sourcemap};
}

function getParam(paramString, key, isBool = false) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [];
  if (!value) return '';
  value = value.trim();
  if (isBool) value = parseBool(value);
  return value;
}

function parseBool(value) {
  return value == 'false' ? false : !!value;
}

function getProjectPath(filePath) {
  for (let projectPath of atom.project.getPaths()) {
    if (filePath.match(projectPath)) return projectPath;
  }
}

function getRelativePath(filePath) {
  var regex = new RegExp(`^${getProjectPath(filePath)}/?`);
  return filePath.replace(regex, '');
}

export function consumeStatusBar(statusBar) {
  initView(statusBar);
}
