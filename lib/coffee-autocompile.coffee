CoffeeAutocompileView = require './coffee-autocompile-view'

module.exports =
  coffeeAutocompileView: null

  activate: (state) ->
    @coffeeAutocompileView = new CoffeeAutocompileView(state.coffeeAutocompileViewState)

  deactivate: ->
    @coffeeAutocompileView.destroy()

  serialize: ->
    coffeeAutocompileViewState: @coffeeAutocompileView.serialize()
