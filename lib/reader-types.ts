export type ReaderContext = {
  title: string;
  author: string;
  published: string;
  chapter: string;
  location: string;
  estimatedPage: string;
  progress: number;
  visibleText: string;
  surroundingText: string;
  selectedText: string;
};

export type VisualResult = {
  kind: "generated" | "reference";
  title: string;
  caption: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};
