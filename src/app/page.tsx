import { siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {siteConfig.author.role}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {siteConfig.name}
      </h1>
      <p className="max-w-xl text-lg text-neutral-600">
        {siteConfig.description}
      </p>
      <p className="text-sm text-neutral-500">
        Smoke-деплой этапа 4 прошёл.
      </p>
    </main>
  );
}
