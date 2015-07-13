fs = require 'fs'
path = require 'path'
[mkdirp, coffee, uglify] = []

class CoffeeAutocompile
  activate: ->
    @disposable = atom.commands.add 'atom-workspace', 'core:save', @handleSave

  deactivate: ->
    @disposable.dispose()

  handleSave: =>
    @activeEditor = atom.workspace.getActiveTextEditor()
    return unless @activeEditor?

    scopeName = @activeEditor.getGrammar().scopeName
    return unless scopeName.match /\bcoffee\b/

    @compile()

  compile: ->
    text = @activeEditor.getText()
    firstComment = text.match /^\s*#\s*(.*)\n*/
    return unless firstComment? and firstComment[1]?
    paramsString = firstComment[1].replace(/\s/g,"")
    params = {}
    for param in paramsString.split ","
      [key, value] = param.split ":"
      if key? and value?
        params[key] = value
    params.compress = @parseBoolean params.compress
    params.sourcemap = @parseBoolean params.sourcemap
    return unless params.out or params.main
    @render params, @activeEditor.getText()

  render: (params, source) ->
    coffee ?= require 'coffee-script'
    uglify ?= require 'uglify-js'

    renderer = coffee.compile source,
      sourceMap: params.sourcemap

    filePath = path.resolve path.dirname(@activeEditor.getURI()), params.out
    if params.sourcemap
      {js, v3SourceMap} = renderer
      js += "\n//# sourceMappingURL=#{filePath}.map"
      if params.compress
        {code: js, map: v3SourceMap} = uglify.minify js, fromString: true, inSourceMap: JSON.parse(v3SourceMap), outSourceMap: "#{filePath}.map"
    else
      js = renderer
      if params.compress
        js = uglify.minify(js, fromString: true).code

    @writeFile filePath, js
    @writeFile "#{filePath}.map", v3SourceMap if v3SourceMap

  writeFile: (filePath, content) ->
    mkdirp ?= require 'mkdirp'
    dirPath = path.dirname filePath
    mkdirp dirPath, (err) =>
      if err
        atom.notifications.addError err.message
        return

      fs.writeFile filePath, content, (err) ->
        if err
          atom.notifications.addError err.message
          return

        atom.notifications.addSuccess "#{filePath} created"

  parseBoolean: (value) ->
    (value is 'true' or value is 'yes' or value is 1) and
      value isnt 'false' and value isnt 'no' and value isnt 0

module.exports = new CoffeeAutocompile()
