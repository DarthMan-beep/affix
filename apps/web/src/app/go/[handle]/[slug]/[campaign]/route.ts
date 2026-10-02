import type { NextRequest } from "next/server";
import { trackClick } from "@/lib/track-click";

/** A campaign link: /go/<handle>/<product>/<campaign>. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string; campaign: string }> },
) {
  const { handle, slug, campaign } = await params;
  return trackClick(request, `${handle}/${slug}/${campaign}`, slug);
}
