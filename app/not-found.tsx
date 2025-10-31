"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    FileQuestion,
    Home,
    Calculator,
    ArrowLeft,
    Search,
} from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Animated 404 */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                >
                    {/* Large 404 Text */}
                    <motion.h1
                        className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-primary via-primary/60 to-primary bg-clip-text text-transparent"
                        animate={{
                            backgroundPosition: ["0%", "100%", "0%"],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        404
                    </motion.h1>

                    {/* Floating Icon */}
                    <motion.div
                        className="absolute -top-4 right-1/4 sm:right-1/3"
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <FileQuestion className="h-16 w-16 sm:h-20 sm:w-20 text-primary/40" />
                    </motion.div>
                </motion.div>

                {/* Message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-4"
                >
                    <h2 className="text-2xl sm:text-3xl font-bold">
                        Oops! Paper Not Found
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
                        Looks like this page went missing... just like those
                        past papers before exam week! 📚
                    </p>
                </motion.div>

                {/* Animated Background Elements */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-primary/20 rounded-full"
                            initial={{
                                x: Math.random() * 100 + "%",
                                y: Math.random() * 100 + "%",
                            }}
                            animate={{
                                x: [
                                    Math.random() * 100 + "%",
                                    Math.random() * 100 + "%",
                                ],
                                y: [
                                    Math.random() * 100 + "%",
                                    Math.random() * 100 + "%",
                                ],
                            }}
                            transition={{
                                duration: 10 + i * 2,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4"
                >
                    <Button
                        asChild
                        size="lg"
                        className="gap-2 w-full sm:w-auto"
                    >
                        <Link href="/">
                            <Home className="h-4 w-4" />
                            Back to Papers
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="gap-2 w-full sm:w-auto"
                    >
                        <Link href="/gpa-calculator">
                            <Calculator className="h-4 w-4" />
                            GPA Calculator
                        </Link>
                    </Button>
                </motion.div>

                {/* Fun Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="pt-8 grid grid-cols-3 gap-4 max-w-md mx-auto"
                >
                    <div className="bg-card border rounded-lg p-3 sm:p-4">
                        <motion.p
                            className="text-2xl sm:text-3xl font-bold text-primary"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.8, type: "spring" }}
                        >
                            0
                        </motion.p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            Papers Found
                        </p>
                    </div>

                    <div className="bg-card border rounded-lg p-3 sm:p-4">
                        <motion.p
                            className="text-2xl sm:text-3xl font-bold text-primary"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.9, type: "spring" }}
                        >
                            404
                        </motion.p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            Error Code
                        </p>
                    </div>

                    <div className="bg-card border rounded-lg p-3 sm:p-4">
                        <motion.p
                            className="text-2xl sm:text-3xl font-bold text-primary"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.0, type: "spring" }}
                        >
                            ∞
                        </motion.p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            Ways Back
                        </p>
                    </div>
                </motion.div>

                {/* Helper Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-xs sm:text-sm text-muted-foreground pt-4"
                >
                    If you believe this page should exist, please{" "}
                    <a
                        href="https://github.com/viduwaa/past-paper-portal/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        report it on GitHub
                    </a>
                </motion.p>
            </div>
        </div>
    );
}
