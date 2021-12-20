"use babel"

import fs from "fs"
import path from "path"
import readline from "readline"

import coffee from "coffeescript"
import { minify as pretty } from "uglify-js"

/**
 * Utils Object
 */
export default {

    // Main action
    createJS: function(filePath, config) {

        return new Promise((resolve, reject) => {

            if (!this.isExists(filePath))
                throw new Error("File is not found: " + filePath)

            if (!this.isCoffeeFile(filePath))
                throw new Error("This is not a CoffeeScript-file: " + filePath)

            this.getFirstLine(filePath)
                .then((firstLine) => {
                    // Parse options from the first line
                    const options = this.parseCoffeeOptions(firstLine)

                    if (options.size === 0)
                        reject(new Error("Parsing options failed. First line has no options"))

                    if (options.has("out")) {
                        // Compile this file and write the result to the "out" file
                        const code = this.getFileContent(filePath).replace(firstLine, "")
                        const compiled = options.has("pretty") && options.get("pretty") === "true"
                            ? this.compileCoffeePretty(code, config)
                            : this.compileCoffee(code)

                        const destFilePath = this.resolvePath(filePath, options.get("out"))

                        this.forceWriteFile(destFilePath, compiled)
                            .then((message) => resolve(message))
                            .catch((err) => reject(err))
                    }
                })
                .catch((err) => reject(err))
        })
    },
    // Compile CoffeeScript to JavaScript
    compileCoffee: function(code) {
        const compiled = coffee.compile(code, {
            header: false
        })
        const compiledPretty = pretty(compiled, {
            compress: false
        })
        return compiledPretty.code
    },
    // Compile CoffeeScript to JavaScript in pretty mode
    compileCoffeePretty: function(code, config) {
        const compiled = coffee.compile(code, {
            inlineMap: config.inlineMap,
            header: false,
            bare: !config.safetyWrapper
        })
        const compiledPretty = pretty(compiled, {
            compress: false,
            mangle: false,
            output: {
                beautify: true,
                comments: config.allowComments,
                indent_level: config.indentSize,
                quote_style: config.quotesStyle
            }
        })
        return compiledPretty.code + "\n"
    },
    // Check if file is CoffeeScript
    isCoffeeFile: function(filePath) {
        return filePath.endsWith(".coffee")
    },
    // Parse options
    parseCoffeeOptions: function(optionsLine) {
        const options = new Map()
        optionsLine.replace(/^#-/, "").split(",").forEach((item) => {
            const index = item.indexOf(":")
            if (index !== -1) {
                const key = item.substr(0, index).trim()
                const value = item.substr(index + 1).trim()
                options.set(key, value)
            }
        })
        return options
    },
    // Resolve path relative to another file
    resolvePath: function(baseFilePath, filePath) {
        return path.resolve(path.dirname(baseFilePath), filePath)
    },
    // Check if file is exists
    isExists: function(filePath) {
        return fs.existsSync(filePath)
    },
    // Open file and get the first line
    getFirstLine: function(filePath) {
        return new Promise((resolve, reject) => {
            const ri = readline.createInterface({ input: fs.createReadStream(filePath) })
            ri.on("line", (line) => {
                ri.close()
                if (line)
                    resolve(line)
                else
                    reject(new Error("Getting first line failed"))
            })
        })
    },
    // Read file content
    getFileContent: function(filePath) {
        return fs.readFileSync(filePath, "utf8")
    },
    // Write content to file
    forceWriteFile: function(filePath, fileContent) {
        return new Promise((resolve, reject) => {
            const fileDir = path.dirname(filePath)
            try {
                if (!fs.existsSync(fileDir))
                    fs.mkdirSync(fileDir, { recursive: true })
                fs.writeFileSync(filePath, fileContent)
                resolve("File created: " + filePath)
            } catch (err) {
                reject(err)
            }
        })
    }
}
