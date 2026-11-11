import type { NextConfig } from "next";

// Отдельное приложение песочницы: дефолты, без правил Turbopack корня.
// CSS-модули здесь работают — отдельные *.module.css это осознанная замена
// правилу корня (там "*.css" уходит в @tailwindcss/turbopack и модули ломает).
const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
