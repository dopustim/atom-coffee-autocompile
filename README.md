# coffee-autocompile package

Auto compile Coffee-script file on save.

---

Add the parameters on the first line (or the second line if the file contains a shebang) of the Coffee-script file.

* out (string): path of JS file to create
  * If the `compileIfNoOutSpecified` setting is enabled, this may be omitted. The file will then be saved in the same directory as the source file. If the file has the `.coffee` extension it will be removed, and the `.js` extension will always be appended.
* compress (bool): compress output JavaScript
* sourcemap (bool): create a sourcemap
  * The sourcemap file will be saved in {outputFilePath}.map

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
