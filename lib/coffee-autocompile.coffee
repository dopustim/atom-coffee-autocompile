fs = require 'fs'
path = require 'path'
mkdirp = require 'mkdirp'
coffee = require 'coffee-script'
uglify = require 'uglify-js'

class StylusAutocompile
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
    params = @getParams @activeEditor.getURI(), @activeEditor.getText()
    return unless params?

    @render params, @activeEditor.getText()

  render: (params, source) ->
    renderer = coffee.compile source,
      sourceMap: params.sourcemap

    console.log renderer

    filePath = path.resolve path.dirname(params.file), params.out
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

  getParams: (filePath, fileContent) ->
    serialized = @getSerializedParams fileContent
    return unless serialized?

    params = file: filePath
    for param in serialized.split /\s*,\s*/
      [key, value] = param.split /\s*:\s*/
      continue unless key? and value?
      params[key] = value

    params.compress = @parseBoolean params.compress
    params.sourcemap = @parseBoolean params.sourcemap
    return params if params.out or params.main

  getSerializedParams: (fileContent) ->
    serialized = if fileContent.match /^#!/
      fileContent.match /\n.*\n/
    else
      fileContent.match /^.*\n/
    return unless serialized?
    serialized[0].replace(/^#\s+/, '').replace(/\n/g, '')

  writeFile: (filePath, content) ->
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

module.exports = new StylusAutocompile()
