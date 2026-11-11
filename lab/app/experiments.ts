/**
 * Список экспериментов для главной страницы песочницы.
 *
 * Один эксперимент = папка `app/experiments/<slug>/` с `page.tsx`
 * и коротким `README.md`. Удаление файла — удаление эксперимента;
 * папки на диске и этот список держим вручную, автогенерация не нужна.
 */
export type Experiment = {
  slug: string;
  title: string;
  description: string;
};

export const experiments: Experiment[] = [
  {
    slug: "template",
    title: "Шаблон эксперимента",
    description:
      "Пустой пример: скопировать папку, переименовать, дописать README.",
  },
];
