const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const importX = require("eslint-plugin-import-x");

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        sourceType: "module",

        parserOptions: {
            project: ["tsconfig.json"],
        },
    },

    extends: [
        js.configs.recommended,
        importX.flatConfigs.errors,
        importX.flatConfigs.warnings,
        importX.flatConfigs.typescript,
        typescriptEslint.configs["flat/recommended"],
    ],

    settings: {
        "import-x/resolver-next": [
            importX.createNodeResolver({
                extensions: [".ts", ".tsx", ".js", ".jsx"],
            }),
        ],
    },

    rules: {
        "quotes": ["error", "double"],
        "import-x/no-unresolved": 0,
        "max-len": 0,
    },
}, globalIgnores(["lib/**/*"])]);
