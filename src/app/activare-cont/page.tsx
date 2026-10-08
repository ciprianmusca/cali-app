import { redirect } from "next/navigation";

/** Legacy path — keep bookmarks working. */
export default async function LegacyActivateRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.token ? `?token=${encodeURIComponent(sp.token)}` : "";
  redirect(`/activare${q}`);
}
