/**
 * Тексты hero-экрана главной.
 *
 * Источник — макет владельца (Figma «ChatExpoExtention», Frame 28 для 1920×1080
 * и Frame 15 для мобильного кадра). Тексты переносятся 1:1, без правок
 * и без добавления новых строк: состав и порядок слов совпадают с макетом.
 */
export const heroContent = {
  /** Заголовок первого экрана. */
  title: "Дизайнер",

  /** Подпись к визуалу: три строки в макете, переносы задаёт ширина блока. */
  caption:
    "CGI, 3D render, digital illustration, airbrushed skin, plastic texture",

  /** Строка о работе и инструментах под кнопкой. */
  meta: "Проектирую и создаю, 2026. Инструменты: Figma, Photoshop, After Effects, 3dsMax, Redshift, OpenCode, ComfyUI, Plasticity",

  /** Подпись единственной кнопки-действия. */
  action: "Написать",
} as const;
