import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import ChatwootWidget from "./chatwoot-widget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Customer Agent",
  description: "Customer Agent for knowledge bases",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900`}
      >
              <ChatwootWidget />

        {children}
      </body>
    </html>
  );
}
