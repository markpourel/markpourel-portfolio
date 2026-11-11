import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Шаблон эксперимента",
};

export default function TemplateExperimentPage() {
  return (
    <main>
      <p>
        <Link href="/">← Песочница</Link>
      </p>

      <h1>Шаблон эксперимента</h1>
      <p>
        Пустой пример. Скопируйте папку в <code>app/experiments/&lt;имя&gt;/</code>,
        переименуйте, допишите <code>README.md</code> и добавьте запись в{" "}
        <code>app/experiments.ts</code>.
      </p>

      <h2>Что проверяем</h2>
      <p>—</p>

      <h2>Вывод</h2>
      <p>—</p>
    </main>
  );
}
