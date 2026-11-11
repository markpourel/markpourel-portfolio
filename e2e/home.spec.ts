import { expect, test } from "@playwright/test";

const SITE_URL = "https://markpourel.ru";

test("главная страница отдаёт 200", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mark Pourel" }),
  ).toBeVisible();
});

test("временная страница показывает подтверждённый контакт", async ({ page }) => {
  await page.goto("/");

  const telegram = page.getByRole("link", { name: /Telegram @markpourel/ });
  await expect(telegram).toBeVisible();
  await expect(telegram).toHaveAttribute("href", "https://t.me/markpourel");
});

test("canonical и og:url указывают на домен этапа 4Б", async ({ page }) => {
  await page.goto("/");

  // Next нормализует корневой путь без завершающего слэша.
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical?.replace(/\/$/, "")).toBe(SITE_URL);

  const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
  expect(ogUrl?.replace(/\/$/, "")).toBe(SITE_URL);
});

test("robots.txt разрешает индексацию и не заявляет sitemap", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Allow: /");
  expect(body).not.toContain("Sitemap:");
});

test("www перенаправляется на основной адрес кодом 301", async ({ request }) => {
  const response = await request.get("/some/path", {
    headers: { host: "www.markpourel.ru" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(301);
  expect(response.headers()["location"]).toBe(
    "https://markpourel.ru/some/path",
  );
});

test("на мобильной ширине нет горизонтальной прокрутки", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test("health отвечает 200 и status ok", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = (await response.json()) as {
    status: string;
    uptime: number;
    commit: string;
    timestamp: string;
  };

  expect(body.status).toBe("ok");
  expect(typeof body.uptime).toBe("number");
  expect(body.commit.length).toBeGreaterThan(0);
  expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
});

test("health принимает HEAD без тела", async ({ request }) => {
  const response = await request.head("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("");
});

test("несуществующий адрес отдаёт 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Страница не найдена" }),
  ).toBeVisible();
});
