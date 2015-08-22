'use babel';
import fs from 'fs';
import path from 'path';
import { CompositeDisposable } from 'atom';
import mkdirp from 'mkdirp';
import coffeeScript from 'coffee-script';
import uglifyJS from 'uglify-js';

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
  var coffee = textEditor.getText();

  // match the first comment in the file while ignoring
  // the hashbang if the file has one
  var [ , paramString ] = coffee.match(/^(?:#![^\n]*\n*)?\s*#([^\n]+)\n/) || [];
  if(!paramString) return;

  var params = parseParams(paramString);
  if(!params.out) return;

  params.inPath = textEditor.getURI();
  params.outPath = path.resolve(path.dirname(params.inPath), params.out);

  render(coffee, params);
}

function render(coffee, params) {
  var renderer = coffeeScript.compile(coffee, {
    sourceMap: params.sourcemap,
  });

  if(params.sourcemap) {
    var { js, sourcemap } = postRenderWithSourcemap(renderer, params);
  } else {
    var { js } = postRenderNoSourcemap(renderer, params);
  }

  writeFile(params.outPath, js);
  if(sourcemap) writeFile(`${params.outPath}.map`, sourcemap);
}

function postRenderWithSourcemap(renderer, params) {
  var { js, v3SourceMap: sourcemap } = renderer;
  var outSourcemapPath = `${path.relative(path.dirname(params.outPath), params.outPath)}.map`;

  if(params.compress) {
    var { code: js, map: sourcemap } = uglifyJS.minify(js, {
      fromString: true,
      inSourceMap: JSON.parse(sourcemap),
      outSourceMap: outSourcemapPath,
    });
  } else {
    js += `\n//# sourceMappingURL=${outSourcemapPath}`;
  }

  return { js, sourcemap };
}

function postRenderNoSourcemap(renderer, params) {
  var js = renderer;

  if(params.compress) {
    var { code: js } = uglifyJS.minify(js, {
      fromString: true,
    });
  }

  return { js };
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

function parseParams(string) {
  var params = {};
  for(let pair of string.replace(/\s/g, '').split(',')) {
    let [ key, value ] = pair.split(':');
    if(['true', 'yes', '1'].indexOf(value) > -1) value = true;
    params[key] = value;
  }
  return params;
}
