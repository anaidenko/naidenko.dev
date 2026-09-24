import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            // Allow deliberately unused names, marked with a leading underscore.
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
        }
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        // Generated or local-only output:
        ".wrangler/**",
        ".superpowers/**",
        "worker/worker-configuration.d.ts",
        "playwright-report/**",
        "test-results/**"
    ]),
    // Last: turns off the stylistic rules Prettier owns.
    prettier
]);

export default eslintConfig;
