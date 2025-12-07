"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Github, FileText, X, Sparkles } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopNavigation() {
    const [showAlert, setShowAlert] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        // Auto-hide alert after 10 seconds
        const timer = setTimeout(() => {
            setShowAlert(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
            {/* Alert Banner */}
            <AnimatePresence>
                {showAlert && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 text-white overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Sparkles className="h-4 w-4 animate-pulse" />
                                    <span className="text-sm font-medium">
                                        Site Updated for 2026 Year!
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAlert(false)}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
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
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <Link
                            href="https://github.com/viduwaa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-all duration-200 hover:scale-105"
                            aria-label="GitHub Profile"
                        >
                            <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Link>

                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </nav>
    );
}
