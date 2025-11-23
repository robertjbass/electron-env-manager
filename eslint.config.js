import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import globals from "globals"
import importPlugin from "eslint-plugin-import"

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "import/no-unresolved": "error",
    },
  },
  {
    ignores: ["dist/", "out/", "node_modules/"],
  },
)
