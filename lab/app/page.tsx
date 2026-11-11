import type { Metadata } from "next";
import Link from "next/link";
import { experiments } from "./experiments";

export const metadata: Metadata = {
  title: "Песочница — markpourel",
  description:
    "Локальная песочница для проверки библиотек. Не часть сайта, в прод не попадает.",
};

export default function LabHomePage() {
  return (
    <main>
      <h1>Песочница</h1>
      <p>
        Отдельное приложение: собственные зависимости, порт 3100, в сборку и
        деплой сайта не входит. Один эксперимент — одна папка{" "}
        <code>app/experiments/&lt;имя&gt;/</code> с <code>page.tsx</code> и{" "}
        <code>README.md</code>.
      </p>

      <h2>Эксперименты</h2>
      <ul>
        {experiments.map((experiment) => (
          <li key={experiment.slug}>
            <Link href={`/experiments/${experiment.slug}`}>
              {experiment.title}
            </Link>
            {" — "}
            {experiment.description}
          </li>
        ))}
      </ul>

      <p>
        Правила переноса на сайт — в <code>lab/README.md</code>.
      </p>
    </main>
  );
}
