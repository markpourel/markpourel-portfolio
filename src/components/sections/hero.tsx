import { heroContent } from "@/content/hero";
import { siteConfig } from "@/lib/site";

import "./hero.css";

/**
 * Первый экран главной по макету владельца.
 *
 * Композиция и значения берутся из Frame 28 (1920×1080) и его мобильного
 * кадра Frame 15 (383×832.4): портрет — отдельный декоративный слой,
 * поверх него идёт текстовая колонка и верхняя строка со значком AI
 * и меню. Разметка семантическая, текст остаётся в потоке документа
 * и доступен скринридеру; абсолютно позиционируются только слои
 * композиции (портрет, верхняя строка, текстовый блок).
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      {/*
        Портрет — оригинальный рендер из макета. У мобильного кадра кадрирование
        своё, поэтому источник подменяется через <picture>, а слоты 1x/2x
        отдают ровно те файлы, что экспортированы из Figma.
      */}
      <div className="hero__portrait" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero/portrait-mobile.png 1x, /images/hero/portrait-mobile@2x.png 2x"
          />
          {/* Исходный растр 1:1: оптимизатор next/image пересэмплирует кадр. */}
          <img
            className="hero__portrait-image"
            src="/images/hero/portrait-desktop.png"
            srcSet="/images/hero/portrait-desktop.png 1x, /images/hero/portrait-desktop@2x.png 2x"
            width={1019}
            height={971}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>

      <header className="hero__bar">
        <span className="hero__badge" aria-hidden="true">
          {/* SVG из макета: next/image не оптимизирует векторные файлы. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero__badge-icon"
            src="/images/hero/ai.svg"
            width={16}
            height={16}
            alt=""
          />
        </span>

        {/*
          Панель навигации в макете не нарисована — есть только кнопка.
          Обработчик появится вместе с меню, поэтому сейчас кнопка без
          aria-expanded и без подмены поведения.
        */}
        <button type="button" className="hero__menu" aria-label="Меню">
          {/* SVG из макета: next/image не оптимизирует векторные файлы. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero__menu-icon"
            src="/images/hero/menu.svg"
            width={30}
            height={18}
            alt=""
          />
        </button>
      </header>

      <div className="hero__content">
        <h1 id="hero-title" className="hero__title">
          {heroContent.title}
        </h1>
        <p className="hero__caption">{heroContent.caption}</p>
        <a className="hero__cta" href={siteConfig.social.telegram}>
          <span className="hero__cta-label">{heroContent.action}</span>
        </a>
        <p className="hero__meta">{heroContent.meta}</p>
      </div>
    </section>
  );
}
