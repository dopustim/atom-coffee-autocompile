
# Coffee Autocompile plugin for Atom

[![apm](https://img.shields.io/apm/dm/coffee-autocompile.svg?style=flat-square)](https://atom.io/packages/coffee-autocompile)

This plugin allows you easy compile CoffeeScipt files to JavaScript with options.

Atom Package: https://atom.io/packages/coffee-autocompile

---

Add the parameters on the first line (or the second line if the file contains a shebang) of the Coffee-script file.

* `out` (string)<sup><a id="ref-1" href="#note-1">1</a> <a id="ref-2" href="#note-2">2</a></sup>: path of JS file to create
* `bare` (bool): pass the `--bare` option to the Coffee-script compiler
* `compress` (bool): compress output JavaScript
* `sourcemap` (bool): create a sourcemap
  * The sourcemap file will be saved in {outputFilePath}.map

<sup><a id="note-1" href="#ref-1">1</a></sup> If the `compileIfNoOutSpecified` setting is enabled, this may be omitted. The file will then be saved in the same directory as the source file. If the file has the `.coffee` extension it will be removed, and the `.js` extension will always be appended.

<sup><a id="note-2" href="#ref-2">2</a></sup> The output filename may contain `$1` or `$2`, which will be replaced by the input basename and extension, respectively. So a file named `in.coffee` and is configured with `# out: $1.$2.js` will compile to `in.coffee.js`.

Coffee autocompile will check if Coffee-script is installed in the (parent) directory of the Coffee-script file and use that one to compile the file. If no local installation is found, it uses the bundled Coffee-script module.

## Examples

Compile the CoffeeScript file to main.js in the same directory as the source file

```coffee
# out: ./main.js
```

Compress the file and saves to the absolute path /path/to/main.min.js

```coffee
# out: /path/to/main.min.js, compress: true
```

Save a sourcemap in the same directory as the output file (the parent directory of the source file)

```coffee
# out: ../main.js, sourcemap: true
```
