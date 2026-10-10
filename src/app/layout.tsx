import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import { TelemetryConsent } from "@/components/telemetry-consent";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Peekytoe", template: "%s · Peekytoe" },
  description: "Practise your pitch, earn a Pitch-Readiness Score, and get discovered by the right investors.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}{process.env.WATCHUP_API_KEY || (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) ? <TelemetryConsent watchupEnabled={Boolean(process.env.WATCHUP_API_KEY)} /> : null}</body>
    </html>
  );
}
