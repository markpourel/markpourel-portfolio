import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ESLint песочницы. Запускается только из `lab/` (`npm run lint` внутри lab)
// и не видит код сайта: корень его не сканирует.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", ".local/**"]),
]);

export default eslintConfig;
