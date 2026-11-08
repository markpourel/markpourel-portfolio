const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Публичный адрес сайта. Валидируется как абсолютный http(s)-URL,
 * чтобы битая конфигурация обнаруживалась на сборке, а не в рантайме.
 */
function readSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    return DEFAULT_SITE_URL;
  }

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute URL, received: "${raw}"`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use http or https, received: "${raw}"`,
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

export const siteUrl = readSiteUrl();

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Серверные переменные. Вызов из клиентского компонента — ошибка,
 * секреты не должны попадать в браузерный бандл.
 *
 * Telegram-переменные не обязательны до этапа 7: сайт должен собираться
 * и работать без настроенной формы.
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must be called on the server only");
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const telegramChatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";

  return {
    telegramBotToken,
    telegramChatId,
    contactChannelConfigured: Boolean(telegramBotToken && telegramChatId),
  };
}
