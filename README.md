
# Coffee Autocompile for Atom

This plugin makes it easy to compile JavaScript from CoffeeScript with options and notifications.

[![Atom Package](https://img.shields.io/apm/dm/coffee-autocompile.svg?style=flat-square)](https://atom.io/packages/coffee-autocompile)

## Installation

Via Atom: Settings ➔ Install ➔ Search for "coffee-autocompile"

Via command line:

```sh
apm install coffee-autocompile
```

## Usage

Via menu: Packages ➔ Coffee Autocompile ➔ Compile ...

Via context menu: Right Click ➔ Compile ...

## Keymaps

Works only with ".coffee" files!

**Windows / Linux**

| Command | Description |
| --- | --- |
| `Ctrl+ Shift+ C` then `D` | compile selection |
| `Ctrl+ Shift+ C` then `F` | compile file |

**macOS**

| Command | Description |
| --- | --- |
| `Cmd+ Shift+ C` then `D` | compile selection |
| `Cmd+ Shift+ C` then `F` | compile file |

## Options Line

The options line should be the first. The output file will be minified (default behaviour). Always start the options line with comment `#-` and separate options by comma `, `.

| Parameter | Description |
| --- | --- |
| `out: path/to/output.js` | path to output (target) JavaScript file |
| `pretty: true` | makes JavaScript pretty (`false` to vice versa) |

## Example

**index.coffee**

```coffee
#- out: build/index.js, pretty: true
a = (num for num in [ 0..5 ] when num % 2 is 0)
```

**build/index.js**

```js
var a, num;

a = function() {
    var i, results;
    results = [];
    for (num = i = 0; i <= 5; num = ++i) {
        if (num % 2 === 0) {
            results.push(num);
        }
    }
    return results;
}();
```
