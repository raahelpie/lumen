import type { Metadata } from "next";
import { Providers } from "./providers";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marginalia — a companion inside the book",
  description: "Read an EPUB with an AI companion that can explain and illustrate the world inside it.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
