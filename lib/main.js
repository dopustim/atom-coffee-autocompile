"use babel"

import { Emitter, CompositeDisposable } from "atom"

import config from "./config"
import utils from "./utils"
import View from "./view"

/**
 * Main Object
 */
export default {

    config,
    userConf: null,
    view: null,
    viewTooltip: null,
    emitter: null,
    subscriptions: null,
    statusBarTile: null,

    // Activate the plugin
    activate: function() {
        // User configuration
        this.userConf = atom.config.getAll("coffee-autocompile")[0].value
        // View
        this.view = new View()
        // Tooltip
        this.viewTooltip = atom.tooltips.add(this.view.getElement(), {
            title: "Coffee Autocompile plugin"
        })
        // Emitter for custom events
        this.emitter = new Emitter()
        // Subscriptions
        this.subscriptions = new CompositeDisposable()
        // When the file has been saved
        this.subscriptions.add(atom.workspace.observeActiveTextEditor((editor) => {
            if (editor) editor.onDidSave(() => this.handleSave(editor))
        }))
        // When the config has been changed
        this.subscriptions.add(atom.config.onDidChange("coffee-autocompile", () => {
            this.userConf = atom.config.getAll("coffee-autocompile")[0].value
        }))
        // When the command has been executed
        this.subscriptions.add(atom.commands.add("atom-text-editor", {
            "coffee-autocompile:compile-file": () => this.compileFile(),
            "coffee-autocompile:compile-direct": () => this.compileDirect()
        }))
    },
    // Use the status bar
    consumeStatusBar: function(statusBar) {
        // https://github.com/atom/status-bar
        this.statusBarTile = statusBar.addLeftTile({
            item: this.view.getElement(),
            priority: 100
        })
    },
    // Handle Save event
    handleSave: function(editor) {
        // Editor is required
        if (!editor) return
        // User can disable compiling on save
        if (!this.userConf.compileOnSave) return
        // Create JS
        const filePath = editor.getPath()
        this.createJS(filePath)
    },
    // Compile from the file content (writes the result to a file)
    compileFile: function() {
        const editor = atom.workspace.getActiveTextEditor()
        // Create JS
        const filePath = editor.getPath()
        this.createJS(filePath)
    },
    // Compile from the current selection (replaces the selected with the result)
    compileDirect: function() {
        const editor = atom.workspace.getActiveTextEditor()
        // Create JS
        const filePath = editor.getPath()
        try {
            const code = editor.getSelectedText()
            const compiled = utils.compileCoffeePretty(code, this.userConf)
            editor.insertText(compiled)
            this.emitter.emit("did-compiled-direct", filePath)
            this.showSuccess("Created JS from CoffeeScript")
        } catch (err) {
            this.showError(err.message)
        }
    },
    // Main action
    createJS: function(filePath) {
        utils.createJS(filePath, this.userConf)
            .then((message) => {
                this.emitter.emit("did-compiled-file", filePath)
                this.showSuccess(message)
            })
            .catch((err) => {
                this.showError(err.message)
            })
    },
    // Show message with Success status
    showSuccess: function(message) {
        // Status bar
        this.view.showSuccess(this.userConf.statusTimeout)
        // Notification
        if (this.userConf.displayNotifications)
            atom.notifications.addSuccess("Coffee Autocompile", { detail: message })
    },
    // Show message with Error status
    showError: function(message) {
        // Status bar
        this.view.showError(this.userConf.statusTimeout)
        // Notification
        if (this.userConf.displayNotifications)
            atom.notifications.addError("Coffee Autocompile", { detail: message })
    },
    // Run this callback when the file has been compiled
    onDidCompiledFile: function(callback) {
        this.emitter.on("did-compiled-file", callback)
    },
    // Run this callback when the selection has been compiled
    onDidCompiledDirect: function(callback) {
        this.emitter.on("did-compiled-direct", callback)
    },
    // Deactivate the plugin
    deactivate: function() {
        // Release them all
        this.emitter.dispose()
        this.subscriptions.dispose()
        this.viewTooltip.dispose()
        this.view.destroy()
        this.statusBarTile.destroy()
        this.userConf = null
    }
}
