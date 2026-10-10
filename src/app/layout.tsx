import type { Metadata } from "next";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "CT–AI Learning Lab | ภารกิจนักคิด",
  description: "คิดเป็น แก้ปัญหาเป็น เรียนรู้ร่วมกับ AI สำหรับนักเรียน ป.4–6",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
