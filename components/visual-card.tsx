import { ExternalLink, ImageIcon, LoaderCircle } from "lucide-react";
import type { VisualResult } from "@/lib/reader-types";

export function VisualCard({ status, result }: { status: string; result?: string }) {
  if (status !== "complete") {
    return (
      <div className="visual-card visual-card--loading">
        <LoaderCircle className="spin" size={20} />
        <div>
          <strong>Gathering the scene</strong>
          <span>Looking closely at the words on the page…</span>
        </div>
      </div>
    );
  }

  let data: VisualResult | { error: string };
  try {
    data = JSON.parse(result || "{}");
  } catch {
    data = { error: "The visual result could not be displayed." };
  }

  if ("error" in data) {
    return <div className="visual-card visual-card--error">{data.error}</div>;
  }

  return (
    <figure className="visual-card">
      {data.imageUrl ? (
        // The generated image is a data URL; reference images are remote public thumbnails.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.imageUrl} alt={data.title} />
      ) : (
        <div className="visual-card__empty"><ImageIcon /></div>
      )}
      <figcaption>
        <span className="visual-card__eyebrow">
          {data.kind === "generated" ? "Interpretive illustration" : "Historical reference"}
        </span>
        <strong>{data.title}</strong>
        <p>{data.caption}</p>
        {data.sourceUrl && (
          <a href={data.sourceUrl} target="_blank" rel="noreferrer">
            View on {data.sourceLabel || "source"} <ExternalLink size={13} />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
