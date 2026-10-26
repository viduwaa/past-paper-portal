"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Github, FileText, X, Sparkles, BookOpen, HeartHandshake, Users } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LiveBadge } from "./LiveBadge";
import { STATS_ENABLED } from "@/lib/flags";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopNavigation() {
    const [showAlert, setShowAlert] = useState(true);
    const [showContributeHint, setShowContributeHint] = useState(false);
    const showAlertBanner = true; // Set to true to show notification banner
    const pathname = usePathname();

    useEffect(() => {
        // Auto-hide alert after 10 seconds
        const timer = setTimeout(() => {
            setShowAlert(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    // A one-off nudge on the papers page: points at the Contributors button
    // and clears itself after five seconds. Starts false and is enabled in
    // an effect so the server and client render the same markup.
    useEffect(() => {
        if (pathname !== "/") {
            setShowContributeHint(false);
            return;
        }

        setShowContributeHint(true);
        const timer = setTimeout(() => setShowContributeHint(false), 5000);

        return () => clearTimeout(timer);
    }, [pathname]);

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
            {/* Alert Banner */}
            <AnimatePresence>
                {showAlertBanner && showAlert && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400 text-black overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Sparkles className="h-4 w-4 animate-pulse text-yellow-200" />
                                    <span className="text-sm font-medium">
                                        Good Luck on your Exams, and make sure to contriubte the pass papers of this year for future!
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAlert(false)}
                                    className="p-1 hover:bg-yellow-200/20 rounded transition-colors"
                                    aria-label="Close alert"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                    {/* Logo/Title */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        <span className="font-semibold text-base sm:text-lg hidden sm:block">
                            FOT Portal
                        </span>
                        <span className="font-semibold text-sm sm:hidden">
                            FOT
                        </span>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center space-x-0.5 sm:space-x-1 bg-muted/30 rounded-lg p-0.5 sm:p-1">
                        <Link
                            href="/"
                            className={`relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 text-xs sm:text-sm font-medium ${
                                isActive("/")
                                    ? "bg-background shadow-sm text-primary"
                                    : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:block">Papers</span>
                            <span className="sm:hidden">Papers</span>
                            {isActive("/") && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
                                    transition={{
                                        type: "spring",
                                        duration: 0.5,
                                    }}
                                />
                            )}
                        </Link>
                        <Link
                            href="/gpa-calculator"
                            className={`relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 text-xs sm:text-sm font-medium ${
                                isActive("/gpa-calculator")
                                    ? "bg-background shadow-sm text-primary"
                                    : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:block">GPA Calc</span>
                            <span className="sm:hidden">GPA</span>
                            {isActive("/gpa-calculator") && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
                                    transition={{
                                        type: "spring",
                                        duration: 0.5,
                                    }}
                                />
                            )}
                        </Link>
                        <Link
                            href="/notes"
                            className={`relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 text-xs sm:text-sm font-medium ${
                                isActive("/notes")
                                    ? "bg-background shadow-sm text-primary"
                                    : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Notes</span>
                            {isActive("/notes") && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
                                    transition={{
                                        type: "spring",
                                        duration: 0.5,
                                    }}
                                />
                            )}
                        </Link>
                        <div className="relative">
                            <Link
                                href="/contribute"
                                className={`relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 text-xs sm:text-sm font-medium ${
                                    isActive("/contribute")
                                        ? "bg-background shadow-sm text-primary"
                                        : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <HeartHandshake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span className="hidden sm:block">Contribute</span>
                                <span className="sm:hidden">Upload</span>
                                {isActive("/contribute") && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-background rounded-md shadow-sm -z-10"
                                        transition={{
                                            type: "spring",
                                            duration: 0.5,
                                        }}
                                    />
                                )}
                            </Link>

                            {/* Transient hint, papers page only: sits under the
                                Contribute tab and clears itself after 5s. */}
                            <AnimatePresence>
                                {showContributeHint && (
                                    <motion.div
                                        role="status"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.2 }}
                                        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[210px] rounded-lg border bg-popover/95 px-3 py-2 text-xs font-medium leading-relaxed text-popover-foreground shadow-lg backdrop-blur-md"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute -top-1 right-6 h-2 w-2 rotate-45 rounded-[2px] border-l border-t border-border bg-popover"
                                        />
                                        Now you can contribute past papers!
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <Link
                            href="/contributors"
                            aria-label="Contributors"
                            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
                                isActive("/contributors")
                                    ? "bg-muted text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden md:inline">
                                Contributors
                            </span>
                        </Link>

                        {STATS_ENABLED && <LiveBadge />}
                        {/* <Link
                            href="https://github.com/viduwaa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-all duration-200 hover:scale-105"
                            aria-label="GitHub Profile"
                        >
                            <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Link> */}

                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </nav>
    );
}
