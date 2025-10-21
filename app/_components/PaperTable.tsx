"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";

interface Paper {
    id: string;
    title: string;
    subjectCode: string;
    department: string;
    studyYear: string;
    semester: string;
    pastPaperYear: string;
    link: string;
}

interface PaperTableProps {
    papers: Paper[];
    onPaperClick?: (paperId: string) => void;
}

export function PaperTable({ papers, onPaperClick }: PaperTableProps) {
    const handleViewClick = (paper: Paper) => {
        onPaperClick?.(paper.id);
        window.open(paper.link, "_blank");
    };

    return (
        <motion.div
            className="rounded-md border shadow-lg bg-card"
            key={papers.length}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">
                                Subject Code
                            </TableHead>
                             <TableHead className="font-semibold">
                                Title
                            </TableHead>
                            <TableHead className="font-semibold">
                                Department
                            </TableHead>
                            <TableHead className="font-semibold">
                                Study Year
                            </TableHead>
                            <TableHead className="font-semibold">
                                Semester
                            </TableHead>
                            <TableHead className="font-semibold">
                                Past Paper Year
                            </TableHead>
                            <TableHead className="text-right font-semibold">
                                Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* AnimatePresence without mode="wait" to prevent odd visual behavior */}
                        <AnimatePresence>
                            {papers.length === 0 ? (
                                <motion.tr
                                    key="no-results"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TableCell
                                        colSpan={7}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        No papers found matching the filters.
                                    </TableCell>
                                </motion.tr>
                            ) : (
                                papers.map((paper, index) => (
                                    <motion.tr
                                        key={paper.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.05,
                                            ease: "easeOut",
                                        }}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <TableCell className="font-mono text-sm">
                                            {paper.subjectCode}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {paper.title}
                                        </TableCell>
                                        <TableCell>
                                            {paper.department}
                                        </TableCell>
                                        <TableCell>{paper.studyYear}</TableCell>
                                        <TableCell>{paper.semester}</TableCell>
                                        <TableCell>
                                            {paper.pastPaperYear}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewClick(paper)
                                                }
                                                className="bg-primary hover:bg-primary/90"
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View - Hidden on desktop */}
            <div className="md:hidden">
                <AnimatePresence>
                    {papers.length === 0 ? (
                        <motion.div
                            key="no-results-mobile"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="text-center py-8 text-muted-foreground"
                        >
                            No papers found matching the filters.
                        </motion.div>
                    ) : (
                        <div className="divide-y divide-border">
                            {papers.map((paper, index) => (
                                <motion.div
                                    key={paper.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.05,
                                        ease: "easeOut",
                                    }}
                                    className="p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="space-y-3">
                                        {/* Title and View Button */}
                                        <div className="flex flex-col space-y-2">
                                            <h3 className="font-semibold text-lg leading-tight">
                                                {paper.title}
                                            </h3>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewClick(paper)
                                                }
                                                className="bg-primary hover:bg-primary/90 self-start"
                                                aria-label={`View ${paper.title} paper`}
                                            >
                                                View Paper
                                            </Button>
                                        </div>

                                        {/* Paper Details */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium text-muted-foreground">
                                                    Subject Code:
                                                </span>
                                                <div className="font-mono mt-1">
                                                    {paper.subjectCode}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-medium text-muted-foreground">
                                                    Department:
                                                </span>
                                                <div className="mt-1">
                                                    {paper.department}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-medium text-muted-foreground">
                                                    Study Year:
                                                </span>
                                                <div className="mt-1">
                                                    {paper.studyYear}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-medium text-muted-foreground">
                                                    Semester:
                                                </span>
                                                <div className="mt-1">
                                                    {paper.semester}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="font-medium text-muted-foreground">
                                                    Past Paper Year:
                                                </span>
                                                <div className="mt-1">
                                                    {paper.pastPaperYear}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
