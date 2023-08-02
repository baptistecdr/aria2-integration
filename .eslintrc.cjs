module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    jest: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "airbnb",
    "airbnb-typescript",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2022,
    sourceType: "module"
  },
  plugins: [],
  rules: {
    "jsx-a11y/label-has-associated-control": [
      "error",
      {
        assert: "either"
      }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off"
  },
  ignorePatterns: ["dist", "public", "scripts", "vite.config.ts"]
};
