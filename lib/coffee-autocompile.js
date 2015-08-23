'use babel';
import fs from 'fs';
import path from 'path';
import { CompositeDisposable } from 'atom';
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
  var source = textEditor.getText();

  try {
    // match the first comment in the file while ignoring
    // the hashbang if the file has one
    var [ , paramString ] = source.match(/^(?:#![^\n]*\n*)?\s*#([^\n]+)\n/);
    var params = parseParams(paramString);
  } catch(e) {
    if(!atom.config.get('coffee-autocompile.compileIfNoOutSpecified')) return;
    params = {};
  }

  if(!params.out) params.out = textEditor.getURI().replace(/\.coffee$/, '') + '.js';

  params.inPath = textEditor.getURI();
  params.outPath = path.resolve(path.dirname(params.inPath), params.out);

  render(source, params);
}

function render(source, params) {
  var renderer = coffee.compile(source, {
    sourceMap: !!params.sourcemap,
  });
  var js;
  var sourcemap;

  if(params.sourcemap) {
    ({ js, sourcemap } = postRenderWithSourcemap(renderer, params));
  } else {
    ({ js } = postRenderNoSourcemap(renderer, params));
  }

  writeFile(params.outPath, js);
  if(sourcemap) writeFile(`${params.outPath}.map`, sourcemap);
}

function postRenderWithSourcemap(renderer, params) {
  var { js, v3SourceMap: sourcemap } = renderer;
  var outSourcemapPath = `${path.relative(path.dirname(params.outPath), params.outPath)}.map`;

  if(params.compress) {
    ({ code: js, map: sourcemap } = uglifyJS.minify(js, {
      fromString: true,
      inSourceMap: JSON.parse(sourcemap),
      outSourceMap: outSourcemapPath,
    }));
  } else {
    js += `\n//# sourceMappingURL=${outSourcemapPath}`;
  }

  return { js, sourcemap };
}

function postRenderNoSourcemap(renderer, params) {
  var js = renderer;

  if(params.compress) {
    ({ code: js } = uglifyJS.minify(js, {
      fromString: true,
    }));
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
    else if(['false', 'no', '0'].indexOf(value) > -1) value = false;
    params[key] = value;
  }
  return params;
}
