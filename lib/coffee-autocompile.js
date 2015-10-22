'use babel';
import fs from 'fs';
import path from 'path';
import {CompositeDisposable} from 'atom';
import mkdirp from 'mkdirp';
import coffee from 'coffee-script';
import uglifyJS from 'uglify-js';

export var config = {
  compileIfNoOutSpecified: {
    description: 'compile coffeescript files where no "out" parameter is specified at the top of the file',
    type: 'boolean',
    default: false,
  },
};

var disposables;

export function activate() {
  disposables = new CompositeDisposable(
    atom.commands.add('atom-text-editor', 'core:save', event => handleSave(event.currentTarget.getModel())),
  );
}

export function deactivate() {
  disposables.dispose();
  disposables = null;
}

const coffeeScriptGrammar = atom.grammars.grammarForScopeName('source.coffee');

function handleSave(textEditor) {
  if(textEditor.getGrammar() == coffeeScriptGrammar) {
    compile(textEditor);
  }
}

function compile(textEditor) {
  var params = getParams(textEditor);
  if(!params.out && !atom.config.get('coffee-autocompile.compileIfNoOutSpecified'))
    return;
  params.inPath = textEditor.getURI();
  params.outPath = params.out ?
    path.resolve(path.dirname(params.inPath), params.out) :
    params.inPath.replace(/\.coffee$/, '.js');
  render(textEditor.getText(), params);
}

function render(source, params) {
  var renderer = coffee.compile(source, {
    sourceMap: !!params.sourcemap,
  });
  var js;
  var sourcemap;

  if(params.sourcemap) {
    ({js, sourcemap} = postRenderWithSourcemap(renderer, params));
    writeFile(`${params.outPath}.map`, sourcemap);
  } else {
    js = postRenderNoSourcemap(renderer, params);
  }

  writeFile(params.outPath, js);
}

function postRenderWithSourcemap(renderer, {outPath, compress}) {
  var {js, v3SourceMap: sourcemap} = renderer;
  var outSourcemapPath = `${path.basename(outPath)}.map`;

  if(compress) {
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
    if(error) return atom.notifications.addError(error.message);

    fs.writeFile(filePath, content, error => {
      if(error) return atom.notifications.addError(error.message);

      atom.notifications.addSuccess(`Saved to ${filePath}`);
    });
  });
}

function getParams(textEditor) {
  var firstLine = textEditor.lineTextForBufferRow(0);
  if(firstLine.match(/^#!/)) firstLine = textEditor.lineTextForBufferRow(1);

  var [, paramString] = firstLine.match(/\s*#\s*(.*)/) || [];
  if(!paramString) return {};
  paramString = paramString.trim();
  var out = getParam(paramString, 'out');
  var compress = getParam(paramString, 'compress', true);
  var sourcemap = getParam(paramString, 'sourcemap', true);
  return {out, compress, sourcemap};
}

function getParam(paramString, key, isBool = false) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [];
  if(!value) return '';
  value = value.trim();
  if(isBool) value = parseBool(value);
  return value;
}

function parseBool(value) {
  return value == 'false' ? false : !!value;
}
