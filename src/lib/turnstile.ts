/** Cloudflare Turnstile helpers (DES-06). */

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function getTurnstileSiteKey(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const key = (env as { TURNSTILE_SITE_KEY?: string }).TURNSTILE_SITE_KEY;
    if (key) return key;
  } catch {
    /* not in worker */
  }
  if (process.env.TURNSTILE_SITE_KEY) return process.env.TURNSTILE_SITE_KEY;
  return TURNSTILE_TEST_SITE_KEY;
}

export async function getTurnstileSecret(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const key = (env as { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
    if (key) return key;
  } catch {
    /* not in worker */
  }
  if (process.env.TURNSTILE_SECRET_KEY) return process.env.TURNSTILE_SECRET_KEY;
  return TURNSTILE_TEST_SECRET;
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteip?: string | null
): Promise<boolean> {
  if (!token || token.trim().length < 8) return false;
  const secret = await getTurnstileSecret();
  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteip) body.set("remoteip", remoteip);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}
