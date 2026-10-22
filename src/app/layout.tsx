import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DepartmentProvider, type DepartmentContextValue } from "@/components/department-provider";
import { getCurrentDepartment, getDepartmentContextValue } from "@/lib/departments-server";
import { NEUTRAL_BRANDING } from "@/lib/departments";
import { WrongAddressBanner } from "@/components/wrong-address-banner";
import { BottomNav } from "@/components/bottom-nav";
import { betriebSpriteSchluessel } from "@/lib/betrieb-sprites";

const inter = Inter({ subsets: ["latin"] });

// Titel und Beschreibung kommen aus dem Fachbereich — vor dem Login aus der
// aufgerufenen Adresse, danach aus dem Profil (PROJ-22).
export async function generateMetadata(): Promise<Metadata> {
  const department = await getCurrentDepartment();
  return {
    title: department?.metaTitle ?? NEUTRAL_BRANDING.appName,
    description: department?.metaDescription ?? "",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const value: DepartmentContextValue =
    (await getDepartmentContextValue()) ?? { department: NEUTRAL_BRANDING, examParts: [] };

  const { department } = value;
  // „Mein Betrieb“ gibt es nur für Bereiche mit isometrischen Sprites (PROJ-34)
  const hatBetrieb = betriebSpriteSchluessel(department.code).length > 0;

  return (
    <html lang="de" className="dark">
      <body className={`${inter.className} antialiased`}>
        <DepartmentProvider value={value}>
          <WrongAddressBanner />
          {children}
          <BottomNav hatBetrieb={hatBetrieb} betriebLabel={hatBetrieb ? department.hofShortName : "Shop"} />
        </DepartmentProvider>
      </body>
    </html>
  );
}
