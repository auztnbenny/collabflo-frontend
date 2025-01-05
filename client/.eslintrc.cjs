// .eslintrc.cjs

module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node:true
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
    ],
    ignorePatterns: ["dist"], // Removed ".eslintrc.cjs"
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2021, // Updated to 2021 (ES2021)
        sourceType: "module",
    },
    plugins: ["@typescript-eslint"], // Removed "react-refresh"
    rules: {
        "no-unused-vars": "warn",
        "quotes": ["error", "double"],
        // Removed "react-refresh/only-export-components" rule
    },
};
