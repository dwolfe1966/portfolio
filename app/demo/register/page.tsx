import { redirect } from "next/navigation";

type SearchParams = { next?: string };

function sanitizeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/workspace/dashboard";
  if (value.startsWith("/workspace/login") || value.startsWith("/workspace/register")) return "/workspace/dashboard";
  return value;
}

export default async function WorkspaceRegisterRedirectPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next);
  redirect(`/workspace/login?mode=signup&next=${encodeURIComponent(next)}`);
}
