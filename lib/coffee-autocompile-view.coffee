{View, $, $$} = require 'atom'

module.exports =
class CoffeeAutocompileView extends View
  @content: ->
    @div class: 'coffee-autocompile tool-panel panel-bottom hide', =>
      @div class: "inset-panel", =>
        @div class: "panel-heading no-border", =>
          @span class: 'inline-block pull-right loading loading-spinner-tiny hide'
          @span 'Coffee-script AutoCompile'
        @div class: "panel-body padded hide"

  initialize: (serializeState) ->
    @inProgress = false
    @timeout = null

    @panelHeading = @find('.panel-heading')
    @panelBody = @find('.panel-body')
    @panelLoading = @find('.loading')

    atom.workspace.addBottomPanel item: this

    atom.commands.add 'atom-workspace', 'core:save': (e) =>
      if !@inProgress
        @compile atom.workspace.getActiveTextEditor()

  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    @detach()

  compile: (editor) ->
    path = require 'path'

    if editor?
      filePath = editor.getUri()
      fileExt = path.extname filePath

      if fileExt == '.coffee'
        @compileCoffee filePath

  getParams: (filePath, callback) ->
    fs = require 'fs'
    path = require 'path'
    readline = require 'readline'

    params =
      file: filePath
      compress: false
      main: false
      out: false

    parse = (firstLine) =>
      firstLine.split(',').forEach (item) ->
        i = item.indexOf ':'

        if i < 0
          return

        key = item.substr(0, i).trim()
        match = /^\s*\/\/\s*(.+)/.exec(key);

        if match
          key = match[1]

        value = item.substr(i + 1).trim()

        params[key] = value

      if params.main isnt false
        @getParams path.resolve(path.dirname(filePath), params.main), callback
      else
        callback params

    if !fs.existsSync filePath
      @showPanel()
      @addMessagePanel '', 'error', "main: #{filePath} not exist"
      @hidePanel()

      @inProgress = false

      return null

    rl = readline.createInterface
      input: fs.createReadStream filePath
      output: process.stdout
      terminal: false

    firstLine = null

    rl.on 'line', (line) ->
      if firstLine is null
        firstLine = line
        parse firstLine

  writeFile: (contents, newFile, newPath, callback) ->
    fs = require 'fs'
    mkdirp = require 'mkdirp'

    mkdirp newPath, (error) ->
      fs.writeFile newFile, contents, callback

  addMessagePanel: (icon, typeMessage, message)->
    @panelHeading.removeClass 'no-border'

    @panelBody.removeClass('hide').append $$ ->
      @p =>
        @span class: "icon #{icon} text-#{typeMessage}", message

  showPanel: ->
    @inProgress = true

    clearTimeout @timeout

    @panelHeading.addClass 'no-border'
    @panelBody.addClass('hide').empty()
    @panelLoading.removeClass 'hide'

    @removeClass 'hide'

  hidePanel: ->
    @panelLoading.addClass 'hide'

    @timeout = setTimeout =>
      @addClass 'hide'
    , 3000

  compileCoffee: (filePath) ->
    fs = require 'fs'
    coffee = require 'coffee-script'
    uglify = require 'uglify-js'
    path = require 'path'

    compile = (params) =>
      if params.out is false
        return

      @showPanel()

      fs.readFile params.file, (error, data) =>
        @addMessagePanel 'icon-file-text', 'info', filePath
        try
          js = coffee.compile data.toString()
          if params.compress
            js = uglify.minify(js, fromString: true).code
          newFile = path.resolve path.dirname(params.file), params.out
          newPath = path.dirname newFile

          try
            @writeFile js, newFile, newPath, =>
              @inProgress = false
              @addMessagePanel 'icon-file-symlink-file', 'success', newFile
          catch e
            @inProgress = false
            @addMessagePanel '', 'error', "#{e.message}"
        catch e
          @inProgress = false
          @addMessagePanel '', 'error', "#{e.message}"

        @hidePanel()

    @getParams filePath, (params) ->
      if params isnt null
        compile params
