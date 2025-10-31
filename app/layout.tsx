import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "./_components/ThemeProvider";
import { TopNavigation } from "./_components/TopNavigation";
import { PageTransition } from "./_components/PageTransition";

const aeonik = localFont({
    src: [
        {
            path: "../public/assets/fonts/fonnts.com-Aeonik-Regular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../public/assets/fonts/fonnts.com-Aeonik-Bold.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-aeonik",
    display: "swap",
});

export const metadata: Metadata = {
    title: "FOT Portal | Past Papers & GPA Calculator",
    description:
        "Access Faculty of Technology (FOT) past examination papers and calculate your GPA for Rajarata University Sri Lanka. Find ITT, CMT and other department papers by year, semester, and subject. Created for FOT students.",
    keywords: [
        "FOT past papers",
        "GPA calculator",
        "Rajarata University",
        "Faculty of Technology",
        "Sri Lanka",
        "past examination papers",
        "university exams",
        "study materials",
        "exam papers",
        "grade calculator",
        "Rajarata University Sri Lanka",
        "FOT Rajarata",
        "past papers download",
        "university resources",
        "exam preparation",
    ],
    authors: [{ name: "Vidula Deneth Salwathura" }],
    creator: "Vidula Deneth Salwathura",
    publisher: "Vidula Deneth Salwathura",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL("https://past-paper-portal.pages.dev"),
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "FOT Portal | Past Papers & GPA Calculator",
        description:
            "Access Faculty of Technology (FOT) past examination papers and calculate your GPA for Rajarata University Sri Lanka. Find ITT, CMT and other department papers by year, semester, and subject.",
        url: "https://past-paper-portal.pages.dev",
        siteName: "RUSL FOT Portal",
        locale: "en_US",
        type: "website",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "FOT Past Papers Portal - Rajarata University Sri Lanka",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "FOT Portal | Past Papers & GPA Calculator",
        description:
            "Access Faculty of Technology (FOT) past examination papers and calculate your GPA for Rajarata University Sri Lanka. Find ITT, CMT and other department papers by year, semester, and subject.",
        images: ["/og-image.png"],
        creator: "Vidula Deneth Salwathura",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    category: "education",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=5"
                />
                <meta name="theme-color" content="#000000" />
                <meta name="msapplication-TileColor" content="#000000" />
                <meta
                    name="application-name"
                    content="FOT Past Papers Portal"
                />
                <meta name="apple-mobile-web-app-title" content="FOT Papers" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="default"
                />
                <meta name="geo.region" content="LK" />
                <meta name="geo.country" content="Sri Lanka" />
                <meta name="geo.placename" content="Mihintale" />
                <meta name="DC.title" content="FOT Past Papers Portal" />
                <meta name="DC.creator" content="viduwa@21/22" />
                <meta
                    name="DC.subject"
                    content="Education, Past Papers, University Resources"
                />
                <meta
                    name="DC.description"
                    content="Faculty of Technology past examination papers for Rajarata University Sri Lanka students"
                />
                <meta name="DC.publisher" content="Vidula Deneth Salwathura" />
                <meta name="DC.type" content="InteractiveResource" />
                <meta name="DC.format" content="text/html" />
                <meta name="DC.language" content="en" />
                <link rel="icon" href="/favicon.ico" />
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/apple-touch-icon.png"
                />
                <meta
                    name="google-site-verification"
                    content="RYaAiNrcPHHq2GcpqImIhWliNIJJ_U-VtbLAbcGwSoE"
                />
                <link rel="manifest" href="/site.webmanifest" />
            </head>
            <body className={`${aeonik.variable} antialiased font-sans`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "EducationalOrganization",
                                name: "FOT Past Papers Portal",
                                description:
                                    "Faculty of Technology Past Papers Portal for Rajarata University Sri Lanka students",
                                url: "https://past-paper-portal.pages.dev",
                                logo: "https://past-paper-portal.pages.dev/favicon.ico",
                                sameAs: [
                                    "https://github.com/viduwaa/past-paper-portal",
                                ],
                                educationalCredentialAwarded:
                                    "Past Examination Papers",
                                provider: {
                                    "@type": "Student Developer",
                                    name: "Vidula Deneth Salwathura",
                                    address: {
                                        addressCountry: "LK",
                                    },
                                },
                                offers: {
                                    "@type": "Offer",
                                    category: "Educational Resource",
                                    description:
                                        "Access to past examination papers for RUSL Faculty of Technology students",
                                },
                                audience: {
                                    "@type": "EducationalAudience",
                                    educationalRole: "student",
                                    audienceType: "university students",
                                },
                            }),
                        }}
                    />
                    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
                        <TopNavigation />
                        <main className="mx-auto px-4 py-8 md:w-[90%] sm:w-4/5">
                            <PageTransition>{children}</PageTransition>
                        </main>
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
