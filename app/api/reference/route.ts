export const runtime = "nodejs";

type CommonsPage = {
  title?: string;
  fullurl?: string;
  thumbnail?: { source?: string };
  original?: { source?: string };
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "A search query is required." }, { status: 400 });

  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo|info",
      iiprop: "url",
      iiurlwidth: "900",
      inprop: "url",
      format: "json",
      origin: "*",
    });

    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("Reference search is unavailable.");

    const data = (await response.json()) as {
      query?: { pages?: Record<string, CommonsPage & { imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string }> }> };
    };
    const pages = Object.values(data.query?.pages || {});
    const match = pages.find((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);
    const info = match?.imageinfo?.[0];
    if (!match || !info) throw new Error("No suitable public reference image was found.");

    return Response.json({
      kind: "reference",
      title: match.title?.replace(/^File:/, "") || query,
      caption: `A historical reference result for “${query}”. Open the source to inspect its date, creator, and license.`,
      imageUrl: info.thumburl || info.url,
      sourceUrl: info.descriptionurl || match.fullurl,
      sourceLabel: "Wikimedia Commons",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reference search failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
