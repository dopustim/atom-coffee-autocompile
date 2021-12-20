"use babel"

/**
 * Configuration Object
 */
export default {

    compileOnSave: {
        title: "Compile on Save",
        description: "Enable this if you want to compile on save.",
        type: "boolean",
        default: false,
        order: 0
    },
    displayNotifications: {
        title: "Display Notifications",
        description: "Enable this if you want to check rendered file on success.",
        type: "boolean",
        default: true,
        order: 1
    },
    statusTimeout: {
        title: "Status Bar Message Timeout",
        description: "Timeout before the status bar message disappears (seconds).",
        type: "integer",
        default: 6,
        enum: [ 2, 4, 6, 8 ],
        order: 2
    },
    indentSize: {
        title: "Indent Size",
        description: "The number of white spaces in Pretty mode.",
        type: "integer",
        default: 4,
        enum: [ 2, 4 ],
        order: 3
    },
    quotesStyle: {
        title: "Quotes Style",
        description: "Preferred quote style for strings in Pretty mode.",
        type: "integer",
        default: 2,
        enum: [
            { value: 1, description: "Single" },
            { value: 2, description: "Double" }
        ],
        order: 4
    },
    allowComments: {
        title: "Allow Comments",
        description: "Do not strip the comments in Pretty mode.",
        type: "boolean",
        default: false,
        order: 5
    },
    safetyWrapper: {
        title: "Wrap in IIFE",
        description: "Enable safety wrapping in Pretty mode.",
        type: "boolean",
        default: false,
        order: 6
    },
    inlineMap: {
        title: "Include Source Map",
        description: "Generate inline source map in Pretty mode.",
        type: "boolean",
        default: false,
        order: 7
    }
}
