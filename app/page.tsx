// First lines to remove unused imports completely:
"use client";

import { useEffect, useState, useMemo } from "react";
import { Filters } from "./_components/Filters";
import { PaperTable } from "./_components/PaperTable";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Github } from "lucide-react";
import { WebsiteFeedback } from "./_components/WebsiteFeedback";
import { PastPaper } from "@/lib/db";
import { Calendar as CalendarIcon } from "lucide-react";
import { TimeTableDialog } from "./_components/TimeTableDialog";

export default function Home() {
    const [papers, setPapers] = useState<PastPaper[]>([]);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [isTimeTableOpen, setIsTimeTableOpen] = useState(false);

    const [filters, setFilters] = useState({
        department: "ITT",
        studyYear: "2nd Year",
        pastPaperYears: [] as string[],
        semesters: ["2nd Semester"] as string[],
        search: "",
    });

    const [visibleCount, setVisibleCount] = useState(15);
    const ITEMS_PER_LOAD = 20;

    // Fetch papers from API
    useEffect(() => {
        const fetchPapers = async () => {
            try {
                // Build query params ensuring we match the URL structure from our new route
                const params = new URLSearchParams();

                if (filters.search) {
                    params.append("searchQuery", filters.search);
                } else {
                    if (filters.department)
                        params.append("department", filters.department);
                    if (filters.studyYear)
                        params.append("year", filters.studyYear);
                    // Handle array values properly depending on how we set up the UI filters
                    // If semesters array has values, we use the first for now or adapt the API to handle multiple
                    if (filters.semesters.length > 0)
                        params.append("semester", filters.semesters[0]);
                }

                const res = await fetch(`/api/papers?${params.toString()}`);

                if (res.status === 429) {
                    setIsRateLimited(true);
                    return; // Stop processing further
                } else {
                    setIsRateLimited(false);
                }

                if (!res.ok) throw new Error("Failed to fetch");

                const data = await res.json();
                setPapers(data);
            } catch (err) {
                console.error("Error loading papers:", err);
            }
        };

        // Add a small debounce for search typing
        const timeoutId = setTimeout(() => {
            fetchPapers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    // Apply local client-side filtering if API doesn't handle multiple checkbox values natively yet
    const filteredPapers = useMemo(() => {
        if (filters.search) return papers; // Search already handled securely by backend

        return papers.filter((paper) => {
            if (
                filters.pastPaperYears.length > 0 &&
                !filters.pastPaperYears.includes(paper.exam_year)
            ) {
                return false;
            }
            if (
                filters.semesters.length > 0 &&
                !filters.semesters.includes(paper.semester)
            ) {
                return false;
            }
            return true;
        });
    }, [papers, filters]);

    useEffect(() => {
        setVisibleCount(15);
    }, [filters]);

    const displayedPapers = filteredPapers.slice(0, visibleCount);
    const hasMorePapers = filteredPapers.length > visibleCount;

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + ITEMS_PER_LOAD);
    };

    useEffect(() => {
        // Page loaded successfully
    }, []);

    return (
        <div className="space-y-8 relative">
            <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <motion.h2
                    className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    FOT Past Papers Portal
                </motion.h2>
                <motion.p
                    className="text-muted-foreground text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    Find and access past examination papers for your department
                </motion.p>
                <motion.p
                    className="text-sm text-blue-700 dark:text-amber-400 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    These can only be viewed with a valid tec.rjt.ac.lk domain
                    email. You need to use your student mail to view these
                    papers.
                </motion.p>
            </motion.div>

<motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-full">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-left">Exam Time Table Released!</h3>
                        <p className="text-sm opacity-90">The official exam time table for this semester is now available to view.</p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsTimeTableOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shadow-sm text-center"
                >
                    View Time Table
                </Button>
            </motion.div>
            
            <TimeTableDialog open={isTimeTableOpen} onOpenChange={setIsTimeTableOpen} />
            
            <Filters onFilterChange={setFilters} />

            <AnimatePresence>
                {isRateLimited && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-lg text-center"
                    >
                        <p className="font-semibold">Too many requests</p>
                        <p className="text-sm mt-1">
                            Please wait a moment before trying to search or
                            filter again.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="text-sm text-muted-foreground mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                Showing {displayedPapers.length} of {filteredPapers.length}{" "}
                papers
            </motion.div>
            <PaperTable papers={displayedPapers} />
            {hasMorePapers && (
                <motion.div
                    className="flex justify-center mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                >
                    <Button
                        onClick={handleLoadMore}
                        variant="outline"
                        size="lg"
                        className="px-8 py-3"
                    >
                        Load More Papers ({filteredPapers.length - visibleCount}{" "}
                        remaining)
                    </Button>
                </motion.div>
            )}
            <motion.div
                className="text-center mt-12 p-6 bg-muted/50 rounded-lg border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
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
