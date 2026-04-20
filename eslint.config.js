import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import next from "@next/eslint-plugin-next";

export default [
    {
        ignores: [
            "node_modules/",
            ".next/",
            "dist/",
            "build/",
            ".now/*",
            "*.css",
            ".changeset",
            "esm/*",
            "public/*",
            "tests/*",
            "*.config.js",
            ".DS_Store",
            "coverage",
            "!.commitlintrc.cjs",
            "!.lintstagedrc.cjs",
            "!jest.config.js",
            "!plopfile.js",
            "!react-shim.js",
            "!tsup.config.ts",
            "src/dev"
        ]
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node
            },
            parser: tseslint.parser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 12,
                sourceType: "module"
            }
        },
        plugins: {
            react: react,
            "react-hooks": reactHooks,
            import: importPlugin,
            "jsx-a11y": jsxA11y,
            prettier: prettier,
            "unused-imports": unusedImports,
            "@next/next": next
        },
        settings: {
            react: { version: "detect" }
        }
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    // react.configs.recommended,
    // reactHooks.configs.recommended,
    // jsxA11y.configs.recommended,
    {
        rules: {
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/no-script-tag": "off",
            "react-hooks/exhaustive-deps": "off",
            "no-console": "off",
            "jsx-a11y/click-events-have-key-events": "warn",
            "jsx-a11y/interactive-supports-focus": "warn",
            "prettier/prettier": "warn",
            "no-unused-vars": "off",
            "unused-imports/no-unused-vars": "off",
            "unused-imports/no-unused-imports": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "after-used",
                    ignoreRestSiblings: false,
                    argsIgnorePattern: "^_.*?$"
                }
            ],
            "import/order": [
                "warn",
                {
                    groups: ["type", "builtin", "object", "external", "internal", "parent", "sibling", "index"],
                    pathGroups: [
                        {
                            pattern: "~/**",
                            group: "external",
                            position: "after"
                        }
                    ],
                    "newlines-between": "always"
                }
            ],
            "react/self-closing-comp": "warn",
            "react/jsx-sort-props": [
                "warn",
                {
                    callbacksLast: true,
                    shorthandFirst: true,
                    noSortAlphabetically: false,
                    reservedFirst: true
                }
            ],
            "padding-line-between-statements": [
                "warn",
                { blankLine: "always", prev: "*", next: "return" },
                { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
                { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] }
            ]
        }
    }
];
