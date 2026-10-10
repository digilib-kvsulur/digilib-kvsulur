import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Deno Edge Functions use a different runtime — exclude from browser lint
  { ignores: ["dist", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Large existing codebase uses `any` extensively for Supabase generics,
      // event handlers and third-party interop — flag but don't fail CI
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow `require()` in config files (tailwind, postcss)
      "@typescript-eslint/no-require-imports": "warn",
      // Allow empty catch blocks used as deliberate swallows
      "no-empty": ["error", { allowEmptyCatch: true }],
      // @ts-nocheck is used intentionally in complex Supabase-typed files
      "@typescript-eslint/ban-ts-comment": "warn",
      // Empty interface extending a type is fine as a named alias
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  }
);
