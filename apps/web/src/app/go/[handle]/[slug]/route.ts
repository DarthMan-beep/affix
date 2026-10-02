import type { NextRequest } from "next/server";
import { trackClick } from "@/lib/track-click";

/** The smart link /go/<handle>/<product>, shown to people as affix.to/<handle>/<product>. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  const { handle, slug } = await params;
  return trackClick(request, `${handle}/${slug}`, slug);
}
