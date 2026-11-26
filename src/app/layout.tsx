import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบจดคะแนนแยกตามกลุ่ม",
  description: "เว็บแอปจดคะแนน XP แยกตามกลุ่ม พร้อมประวัติการให้คะแนนและแนบรูปหลักฐาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.className} antialiased`}>{children}</body>
    </html>
  );
}
