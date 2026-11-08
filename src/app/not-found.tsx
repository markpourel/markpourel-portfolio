import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">404</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Страница не найдена
      </h1>
      <p className="max-w-xl text-neutral-600">
        Адрес изменился или в ссылке опечатка.
      </p>
      <Link
        href="/"
        className="w-fit rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        На главную
      </Link>
    </main>
  );
}
