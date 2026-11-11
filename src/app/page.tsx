import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

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
 * Временная страница этапа 4Б.
 *
 * Оформление нейтральное (светлый фон, тёмный текст, системный шрифт,
 * без картинок, анимаций и форм) и не является дизайн-решением:
 * дизайн определяется на этапе 6 по макету владельца.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-20">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {siteConfig.author.role}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {siteConfig.name}
      </h1>
      <p className="max-w-xl text-lg text-neutral-700">
        {siteConfig.description}
      </p>
      <p className="max-w-xl text-neutral-600">
        Сайт собирается заново: здесь пока одна страница. Полная версия
        появится позже.
      </p>
      <p className="text-neutral-700">
        Написать:{" "}
        <a
          className="underline decoration-neutral-400 underline-offset-4 hover:decoration-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          href={siteConfig.social.telegram}
        >
          Telegram @markpourel
        </a>
      </p>
    </main>
  );
}
