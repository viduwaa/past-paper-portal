"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const themes = ["light", "dark", "rose-dark", "emerald-dark"];

export function ThemeSwitcher() {
    const { setTheme, theme } = useTheme();

    const cycleTheme = () => {
        const currentIndex = themes.indexOf(theme || "light");
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={cycleTheme}
            className="relative transition-colors"
            title="Cycle Themes"
        >
            <Palette className="h-[1.2rem] w-[1.2rem] transition-all text-primary" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
