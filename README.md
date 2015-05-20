# coffee-autocompile package

Auto compile Coffee-script file on save.

---

Add the parameters on the first line of the Coffee-script file.

```
out (string): path of JS file to create
compress (bool): compress JS file
sourcemap (bool): create sourcemap in {out}.map
```

```
# out: ../styles.css
```

```
# out: ../styles.css, compress: true
```

```
# main: init.coffee
```
