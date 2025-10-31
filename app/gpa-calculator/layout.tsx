import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "GPA Calculator | FOT Portal - Rajarata University",
    description:
        "Calculate your Grade Point Average (GPA) easily. Perfect for students at Faculty of Technology, Rajarata University Sri Lanka. Add subjects, credits, and grades to get instant GPA calculations.",
    keywords: [
        "GPA calculator",
        "grade calculator",
        "university GPA",
        "FOT GPA calculator",
        "Rajarata University",
        "academic calculator",
        "grade point average",
        "student tools",
        "FOT tools",
        "university tools",
    ],
    openGraph: {
        title: "GPA Calculator | FOT Portal",
        description:
            "Calculate your Grade Point Average (GPA) easily. Add subjects, credits, and grades to get instant results.",
        type: "website",
    },
};

export default function GPACalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
