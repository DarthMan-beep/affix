import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { and, creative, db, eq, product, vendor } from "@affix/db";
import { bannerSize } from "@/lib/creative-options";
import { PRODUCT_IMAGES } from "@/lib/product-options";

/*
 * A banner as a PNG: /b/<creative id>.png. Public, because affiliates embed
 * it on their own sites. Drawn from the creative's image, its headline and
 * the product's price, in the banner's exact pixel size.
 */

const FOREST = "#0a1d14";
const CREAM = "#eef3ea";
const SPRING = "#7defa1";
const INK = "#0e2a1e";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

async function imageData(imageUrl: string | null) {
  // Only the cover images that ship with the project; never an arbitrary path.
  if (!imageUrl || !(PRODUCT_IMAGES as readonly string[]).includes(imageUrl)) return null;
  try {
    const file = await readFile(path.join(process.cwd(), "public", imageUrl));
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = /^([0-9a-f-]{36})\.png$/i.exec(file)?.[1];
  if (!id) return new Response("Not found", { status: 404 });

  const [banner] = await db
    .select({
      size: creative.size,
      imageUrl: creative.imageUrl,
      headline: creative.headline,
      title: product.title,
      priceCents: product.priceCents,
      vendorName: vendor.displayName,
    })
    .from(creative)
    .innerJoin(product, eq(product.id, creative.productId))
    .innerJoin(vendor, eq(vendor.id, product.vendorId))
    .where(and(eq(creative.id, id), eq(creative.kind, "banner"), eq(product.status, "published")))
    .limit(1);
  const size = bannerSize(banner?.size ?? null);
  if (!banner || !size) return new Response("Not found", { status: 404 });

  const { width: w, height: h } = size;
  const image = await imageData(banner.imageUrl);
  const headline = banner.headline || banner.title;
  const byline = `by ${banner.vendorName}`;
  const cta = `Get it · ${eur.format(banner.priceCents / 100)}`;

  const photo = (pw: number, ph: number) =>
    image ? (
      // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not to the page
      <img src={image} alt="" width={pw} height={ph} style={{ width: pw, height: ph, objectFit: "cover" }} />
    ) : (
      <div style={{ display: "flex", width: pw, height: ph, background: "#143726" }} />
    );
  const button = (fontSize: number) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: SPRING,
        color: INK,
        fontSize,
        padding: `${Math.round(fontSize * 0.55)}px ${Math.round(fontSize * 1.1)}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {cta}
    </div>
  );

  let layout;
  if (w / h >= 3) {
    // Leaderboard: photo, text, button in one row. Only 90px tall, so the
    // headline stays on one line: longer headlines get smaller type, then "…".
    const headlineSize = Math.round(h * (headline.length <= 26 ? 0.28 : headline.length <= 38 ? 0.23 : 0.19));
    layout = (
      <div style={{ display: "flex", width: w, height: h, background: FOREST, color: CREAM, alignItems: "center" }}>
        {photo(Math.round(h * 1.6), h)}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `0 ${Math.round(h * 0.25)}px`, overflow: "hidden" }}>
          <div
            style={{
              display: "block",
              fontSize: headlineSize,
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontSize: Math.round(h * 0.16), opacity: 0.7, marginTop: Math.round(h * 0.06) }}>
            {byline}
          </div>
        </div>
        <div style={{ display: "flex", paddingRight: Math.round(h * 0.25) }}>{button(Math.round(h * 0.18))}</div>
      </div>
    );
  } else if (h / w >= 2) {
    // Skyscraper: photo on top, text and button stacked underneath.
    const pad = Math.round(w * 0.1);
    layout = (
      <div style={{ display: "flex", flexDirection: "column", width: w, height: h, background: FOREST, color: CREAM }}>
        {photo(w, Math.round(h * 0.42))}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: pad, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: Math.round(w * 0.15), lineHeight: 1.12 }}>{headline}</div>
            <div style={{ display: "flex", fontSize: Math.round(w * 0.085), opacity: 0.7, marginTop: Math.round(w * 0.06) }}>
              {byline}
            </div>
          </div>
          <div style={{ display: "flex" }}>{button(Math.round(w * 0.09))}</div>
        </div>
      </div>
    );
  } else {
    // Rectangle and square: full photo, text over a dark fade at the bottom.
    const unit = Math.min(w, h);
    const pad = Math.round(unit * 0.07);
    layout = (
      <div style={{ display: "flex", position: "relative", width: w, height: h, background: FOREST, color: CREAM }}>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}>{photo(w, h)}</div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: w,
            height: h,
            backgroundImage: "linear-gradient(to top, rgba(6,19,12,0.94) 0%, rgba(6,19,12,0.55) 45%, rgba(6,19,12,0) 75%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 0,
            bottom: 0,
            width: w,
            padding: pad,
          }}
        >
          <div style={{ display: "flex", fontSize: Math.round(unit * 0.095), lineHeight: 1.1 }}>{headline}</div>
          <div style={{ display: "flex", fontSize: Math.round(unit * 0.05), opacity: 0.75, marginTop: Math.round(unit * 0.02) }}>
            {byline}
          </div>
          <div style={{ display: "flex", marginTop: Math.round(unit * 0.05) }}>{button(Math.round(unit * 0.055))}</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(layout, {
    width: w,
    height: h,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
