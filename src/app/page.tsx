import type { Metadata } from "next";

import { Hero } from "@/components/sections/hero";

/**
 * Канонический адрес — только у главной: 404 и служебные маршруты
 * не должны заявлять себя каноническими.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

/**
 * Главная: первый экран по макету владельца (Frame 28 / Frame 15).
 * Остальные секции появятся отдельными срезами этапа 6.
 */
export default function Home() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <Hero />
    </main>
  );
}
