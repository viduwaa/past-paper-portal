"use client";

import Link from "next/link";
import { Calculator, Github, FileText } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function TopNavigation() {
    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo/Title */}
                    <Link
                        href="/"
                        className="flex items-center space-x-2 hover:opacity-80 transition-opacity group"
                    >
                        <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-lg hidden sm:block">
                            FOT Papers Portal
                        </span>
                        <span className="font-semibold text-sm sm:hidden">
                            FOT Papers
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link
                            href="https://gpa-cal.pages.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-all duration-200 text-sm font-medium hover:scale-105"
                        >
                            <Calculator className="h-4 w-4" />
                            <span className="hidden sm:block">
                                GPA Calculator
                            </span>
                            <span className="sm:hidden">GPA</span>
                        </Link>

                        <Link
                            href="https://github.com/viduwaa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md hover:bg-muted transition-all duration-200 hover:scale-105"
                            aria-label="GitHub Profile"
                        >
                            <Github className="h-4 w-4" />
                        </Link>

                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </nav>
    );
}
