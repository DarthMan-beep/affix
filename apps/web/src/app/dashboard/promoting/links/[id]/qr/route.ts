import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { can } from "@affix/auth/permissions";
import { affiliateLink, db, eq } from "@affix/db";
import { getActor } from "@/lib/dal";

/** Download a link's QR code as an SVG. Only the link's owner (or an admin) may. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new Response("Sign in to download this QR code.", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const link = await db.query.affiliateLink.findFirst({
    where: eq(affiliateLink.id, id),
    columns: { id: true, affiliateId: true, code: true },
  });
  if (!link || !can.manageLink(actor, link)) return new Response("Not found", { status: 404 });

  const url = new URL(`/go/${link.code}`, request.nextUrl.origin).toString();
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#0e2a1e", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="affix-${link.code.replace(/\//g, "-")}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
