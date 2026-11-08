import { expect, test } from "@playwright/test";

test("главная страница отдаёт 200", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mark Pourel" }),
  ).toBeVisible();
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
