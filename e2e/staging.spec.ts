import { expect, test } from "@playwright/test";

/**
 * Второй сервер из playwright.config.ts — тот же билд с `STAGING_BASIC_AUTH`.
 * Здесь проверяется поведение staging: пароль, исключения и noindex.
 */
const STAGING_URL = "http://127.0.0.1:3100";
const LOGIN = "staging";
const PASSWORD = "staging-local-password";

test.describe("staging за паролем", () => {
  test("без пароля страница отдаёт 401 и WWW-Authenticate", async ({
    request,
  }) => {
    const response = await request.get(`${STAGING_URL}/`);

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain("Basic");
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("неверный пароль не пускает", async ({ request }) => {
    const wrong = `Basic ${Buffer.from(`${LOGIN}:wrong`).toString("base64")}`;
    const response = await request.get(`${STAGING_URL}/`, {
      headers: { Authorization: wrong },
    });

    expect(response.status()).toBe(401);
  });

  test("с паролем страница и её ассеты открываются, но с noindex", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      httpCredentials: { username: LOGIN, password: PASSWORD },
    });
    const page = await context.newPage();

    // Стили приходят с того же хоста: если proxy закроет /_next/static,
    // страница откроется без оформления — проверяем, что этого не происходит.
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(`${STAGING_URL}/`);

    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    await expect(
      page.getByRole("heading", { level: 1, name: "Mark Pourel" }),
    ).toBeVisible();
    expect(failed).toEqual([]);

    await context.close();
  });

  test("health отвечает 200 без пароля", async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/health`);

    expect(response.status()).toBe(200);
  });

  test("robots.txt без пароля запрещает индексацию", async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/robots.txt`);

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Disallow: /");
    expect(body).not.toContain("Allow: /");
  });
});

test.describe("прод не включает защиту staging", () => {
  test("главная отдаётся без пароля и без X-Robots-Tag", async ({
    request,
  }) => {
    const response = await request.get("/");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBeUndefined();
  });
});
