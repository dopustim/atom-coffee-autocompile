"use babel"

import fs from "fs"
import path from "path"

import main from "../lib/main"

const coffeeFile = path.resolve(__dirname, "./fixtures/main.coffee")
const compiledFile = path.resolve(__dirname, "./fixtures/build/main.js")
const expectedFile = path.resolve(__dirname, "./fixtures/build_ex/main.js")

const compileFileCommand = "coffee-autocompile:compile-file"
const compileDirectCommand = "coffee-autocompile:compile-direct"

const packageName = "coffee-autocompile"

// eslint-disable-next-line max-lines-per-function
describe(`The package "${packageName}"`, () => {

    beforeEach(() => {
        waitsForPromise(() => atom.packages.activatePackage(packageName))
    })

    it("should be activated", () => {
        expect(atom.packages.isPackageActive(packageName)).toBe(true)
    })

    describe(`The Atom editor when the file "${coffeeFile}" is opened`, () => {

        let editor, editorView, compiled, expected

        beforeEach(() => {
            waitsForPromise(() => {
                return atom.workspace.open(coffeeFile).then((ed) => {
                    editor = ed
                    editorView = atom.views.getView(editor)
                })
            })
        })

        it(`should properly compile this file to JavaScript via command
            "${compileFileCommand}"`, () => {

            spyOn(main, "showSuccess")

            runs(() => {
                atom.commands.dispatch(editorView, compileFileCommand)
            })
            waitsFor(() => main.showSuccess.callCount > 0)
            runs(() => {
                compiled = fs.readFileSync(compiledFile, "utf8")
                expected = fs.readFileSync(expectedFile, "utf8")
                expect(compiled).toBe(expected)
            })
        })

        it(`should properly replace selected content with JavaScript via command
            "${compileDirectCommand}"`, () => {

            spyOn(main, "showSuccess")

            runs(() => {
                editor.selectAll()
                atom.commands.dispatch(editorView, compileDirectCommand)
            })
            waitsFor(() => main.showSuccess.callCount > 0)
            runs(() => {
                editor.selectAll()
                compiled = editor.getText()
                expected = fs.readFileSync(expectedFile, "utf8")
                expect(compiled).toBe(expected)
            })
        })
    })
})
