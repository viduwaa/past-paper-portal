"use client";

import { motion } from "framer-motion";
import {
    Sparkles,
    Construction,
    ArrowLeft,
    Github
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WebsiteFeedback } from "../_components/WebsiteFeedback";

export default function NotesHub() {
    return (
        <div className="min-h-[70vh] flex flex-col justify-between relative">
            {/* Main Coming Soon Banner */}
            <div className="flex-1 flex items-center justify-center py-12 px-4">
                <motion.div
                    className="max-w-xl w-full bg-card/60 backdrop-blur-xl border border-primary/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Glowing Accent Ring */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                    <div className="space-y-6 relative z-10">
                        {/* Icon Badge */}
                        <motion.div
                            className="inline-flex p-4 rounded-2xl bg-primary/5 text-primary border border-primary/10 mx-auto"
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 10 }}
                            transition={{
                                repeat: Infinity,
                                repeatType: "reverse",
                                duration: 2,
                                ease: "easeInOut"
                            }}
                        >
                            <Construction className="h-10 w-10 text-primary" />
                        </motion.div>

                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider">
                                <Sparkles className="h-3 w-3 animate-pulse" />
                                <span>Under Development</span>
                            </span>
                            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent pt-1">
                                Notes Portal Coming Soon
                            </h2>
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                            We are actively building the notes section to help you organize lecture summaries, syllabus reference guides, and shared study materials. Stay tuned for a launch next semester!
                        </p>

                        {/* Interactive Progress Bar */}
                        <div className="space-y-1.5 max-w-xs mx-auto pt-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                <span>Drafting & Design</span>
                                <span>65% Complete</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: "65%" }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Navigation back */}
                        <div className="pt-4">
                            <Link href="/">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 hover:bg-muted text-xs transition-all hover:translate-x-[-2px]"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    <span>Back to Past Papers</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Contribution Section (Consistent with home/GPA calc) */}
            <motion.div
                className="text-center mt-12 p-6 bg-muted/50 rounded-lg border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <h3 className="text-lg font-semibold mb-2">
                    Contribute to This Project
                </h3>
                <p className="text-muted-foreground mb-4">
                    If you like to contribute to this project by adding missing
                    papers, Please contact or create a PR in Github repo.
                </p>
                <div className="flex justify-center items-center gap-4">
                    <a
                        href="https://github.com/viduwaa/past-paper-portal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
                        aria-label="GitHub Repository"
                    >
                        <Github className="h-5 w-5" />
                        View Repository
                    </a>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                    Created by viduwa@21/22
                </p>
                <WebsiteFeedback />
            </motion.div>
        </div>
    );
}
