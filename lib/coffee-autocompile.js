'use babel';
import fs from 'fs';
import path from 'path';
import CSON from 'season';
import { CompositeDisposable } from 'atom';
import mkdirp from 'mkdirp';
import coffee from 'coffee-script';
import uglify from 'uglify-js';

var disposables;

export function activate() {
  disposables = new CompositeDisposable(
    atom.commands.add('atom-workspace', 'core:save', () => handleSave),
  );
}

export function deactivate() {
  disposables.dispose();
  disposables = null;
}

function handleSave() {
  var activeTextEditor = atom.workspace.getActiveTextEditor();
  if(!activeTextEditor) return;

  if(activeTextEditor.getGrammar() == atom.grammars.grammarForScopeName('source.coffee')) {
    compile(activeTextEditor);
  }
}

function compile(textEditor) {
  var code = textEditor.getText();

  // match the first comment in the file while ignoring
  // the hashbang if the file has one
  var comment = code.match(/^(?:#![^\n]*\n*)?\s*#([^\n]+)\n/);
  if(!comment) return;

  try {
    var params = CSON.parse(comment[1]);
  } catch(error) {
    return;
  }

  params.compress = parseBool(params.compress);
  params.sourcemap = parseBool(params.sourcemap);

  params.inPath = textEditor.getURI();
  params.outPath = path.resolve(path.dirname(params.inPath), params.out);

  render(code, params);
}

function render(code, params) {
  var renderer = coffee.compile(code, {
    sourceMap: params.sourcemap,
  });

  var js;
  var sourcemap;

  if(params.sourcemap) {
    ( { js, sourcemap } = postRenderWithSourcemap(renderer, params) );
  } else {
    ( { js } = postRenderNoSourcemap(renderer, params) );
  }

  writeFile(params.outPath, js);
  if(sourcemap) {
    writeFile(`${params.outPath}.map`, sourcemap);
  }
}

function postRenderWithSourcemap(renderer, params) {
  var { js, v3SourceMap: sourcemap } = renderer;
  var outSourcemapPath = `${path.relative(path.dirname(params.outPath), params.outPath)}.map`;

  if(params.compress) {
    ( { code: js, map: sourcemap } = uglify.minify(js, {
      fromString: true,
      inSourceMap: JSON.parse(sourcemap),
      outSourceMap: outSourcemapPath,
    }) );
  } else {
    js += `\n//# sourceMappingURL=${outSourcemapPath}`;
  }

  return { js, sourcemap };
}

function postRenderNoSourcemap(renderer, params) {
  var js = renderer;

  if(params.compress) {
    ( { code: js } = uglify.minify(js, {
      fromString: true,
    }) );
  }

  return { js };
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath), error => {
    if(error) return onError(error);

    fs.writeFile(filePath, content, error => {
      if(error) return onError(error);

      atom.notifications.addSuccess(`Saved to ${filePath}`);
    });
  });
}

function onError(error) {
  return void atom.notifications.addError(error.message);
}

function parseBool(value) {
  switch(value) {
    case 'true':
    case 'yes':
    case 1:
      return true;
    default:
      return false;
  }
}
