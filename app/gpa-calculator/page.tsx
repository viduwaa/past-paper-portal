"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calculator,
    RotateCcw,
    TrendingUp,
    Award,
    Target,
    BookOpen,
    GraduationCap,
    Github,
} from "lucide-react";
import { WebsiteFeedback } from "../_components/WebsiteFeedback";
import programs, { type Subject as ProgramSubject } from "@/lib/subjectList";

interface SubjectGrade extends ProgramSubject {
    grade: string;
    semester: string;
}

const gradePoints: { [key: string]: number } = {
    "A+": 4.0,
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    "D+": 1.3,
    D: 1.0,
    E: 0.0,
};

const grades = [
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "E",
];

const nonGPAGrades = ["Pass", "Fail"];

export default function GPACalculator() {
    const [selectedProgram, setSelectedProgram] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("gpa-selected-program") || "ITT";
        }
        return "ITT";
    });
    const [subjectGrades, setSubjectGrades] = useState<{
        [key: string]: string;
    }>(() => {
        if (typeof window !== "undefined") {
            const program =
                localStorage.getItem("gpa-selected-program") || "ITT";
            const saved = localStorage.getItem(`gpa-subject-grades-${program}`);
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });
    const [semesterGPAs, setSemesterGPAs] = useState<{ [key: string]: number }>(
        {}
    );
    const [overallGPA, setOverallGPA] = useState<number | null>(null);
    const [totalCredits, setTotalCredits] = useState<number>(0);

    const currentProgram = programs[selectedProgram];
    const availableSemesters = currentProgram
        ? Object.keys(currentProgram.semesters).sort()
        : [];

    const updateGrade = (subjectCode: string, grade: string) => {
        setSubjectGrades((prev) => {
            const updated = {
                ...prev,
                [subjectCode]: grade,
            };
            // Save to localStorage with program-specific key
            if (typeof window !== "undefined") {
                localStorage.setItem(
                    `gpa-subject-grades-${selectedProgram}`,
                    JSON.stringify(updated)
                );
            }
            return updated;
        });
    };

    const calculateSemesterGPA = (semester: string) => {
        const subjects = currentProgram?.semesters[semester] || [];
        let totalPoints = 0;
        let totalCreditsSum = 0;

        subjects.forEach((subject) => {
            const grade = subjectGrades[subject.code];

            // Skip Non GPA subjects for GPA calculation
            if (subject.type === "Non GPA") return;

            if (grade && gradePoints[grade] !== undefined) {
                totalPoints += subject.credits * gradePoints[grade];
                totalCreditsSum += subject.credits;
            }
        });

        return totalCreditsSum > 0 ? totalPoints / totalCreditsSum : 0;
    };

    const calculateOverallGPA = () => {
        let totalPoints = 0;
        let totalGPACredits = 0;
        let totalCompletedCredits = 0;
        const semesterGPAMap: { [key: string]: number } = {};

        availableSemesters.forEach((semester) => {
            const subjects = currentProgram?.semesters[semester] || [];

            subjects.forEach((subject) => {
                const grade = subjectGrades[subject.code];

                if (subject.type === "Non GPA") {
                    // Count credits for Non-GPA subjects if they pass
                    if (grade === "Pass") {
                        totalCompletedCredits += subject.credits;
                    }
                } else {
                    // Calculate GPA for regular subjects
                    if (grade && gradePoints[grade] !== undefined) {
                        totalPoints += subject.credits * gradePoints[grade];
                        totalGPACredits += subject.credits;
                        totalCompletedCredits += subject.credits;
                    }
                }
            });

            semesterGPAMap[semester] = calculateSemesterGPA(semester);
        });

        setSemesterGPAs(semesterGPAMap);

        if (totalGPACredits > 0) {
            setOverallGPA(totalPoints / totalGPACredits);
            setTotalCredits(totalCompletedCredits);
        } else {
            setOverallGPA(null);
            setTotalCredits(totalCompletedCredits);
        }
    };

    const resetCalculator = () => {
        setSubjectGrades({});
        setSemesterGPAs({});
        setOverallGPA(null);
        setTotalCredits(0);
        // Clear localStorage for current program
        if (typeof window !== "undefined") {
            localStorage.removeItem(`gpa-subject-grades-${selectedProgram}`);
        }
    };

    const getGPAColor = (gpa: number) => {
        if (gpa >= 3.7) return "text-green-600 dark:text-green-400";
        if (gpa >= 3.3) return "text-blue-600 dark:text-blue-400";
        if (gpa >= 3.0) return "text-cyan-600 dark:text-cyan-400";
        if (gpa >= 2.0) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const getGPALabel = (gpa: number) => {
        if (gpa >= 3.7) return "First Class";
        if (gpa >= 3.3) return "Second Class (Upper)";
        if (gpa >= 3.0) return "Second Class (Lower)";
        if (gpa >= 2.0) return "General";
        return "Not Eligible";
    };

    // Check if any grades have been selected
    const hasGrades = Object.keys(subjectGrades).length > 0;

    useEffect(() => {
        calculateOverallGPA();
    }, [subjectGrades]);

    useEffect(() => {
        // Save selected program to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("gpa-selected-program", selectedProgram);
        }
    }, [selectedProgram]);

    useEffect(() => {
        // Load grades for the selected program
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(
                `gpa-subject-grades-${selectedProgram}`
            );
            setSubjectGrades(saved ? JSON.parse(saved) : {});
        }
    }, [selectedProgram]);

    return (
        <div className="space-y-6 sm:space-y-8 relative">
            {/* Header Section */}
            <motion.div
                className="text-center space-y-4 sm:space-y-6"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {/* Title */}
                <motion.h2
                    className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    GPA Calculator for RUSL FOT
                </motion.h2>

                {/* Department Selector */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <label className="text-sm sm:text-base font-semibold whitespace-nowrap">
                        Select Your Department:
                    </label>
                    <Select
                        value={selectedProgram}
                        onValueChange={setSelectedProgram}
                    >
                        <SelectTrigger className="w-full sm:w-[350px] h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(programs).map(([code, program]) => (
                                <SelectItem key={code} value={code}>
                                    {program.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Notice/Info Text */}
                <motion.div
                    className="text-center space-y-1 max-w-3xl mx-auto px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-medium">
                        Currently Year 1 & Year 2 have proper values for 21/22
                    </p>
                    <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                        Y3, Y4 subjects & credit values are according to the
                        Prospectus 2018/2019. These will update when we get the
                        proper subject details.
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                        There will be some inaccuracies like ±0.01 for GPA
                        results
                    </p>
                </motion.div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Calculator Section */}
                <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                    {/* All Semesters */}
                    {availableSemesters.map((semester, index) => {
                        const subjects =
                            currentProgram?.semesters[semester] || [];
                        const semesterGPA = semesterGPAs[semester];

                        return (
                            <motion.div
                                key={semester}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                                className="bg-card border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6 gap-2 sm:gap-3">
                                    <h2 className="text-base sm:text-xl md:text-2xl font-semibold flex items-center space-x-1.5 sm:space-x-2">
                                        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                                        <span>{semester}</span>
                                    </h2>
                                    {semesterGPA > 0 && (
                                        <div className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-primary/10 rounded-lg w-fit">
                                            <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                                                Semester GPA:{" "}
                                            </span>
                                            <span
                                                className={`text-sm sm:text-base md:text-lg font-bold ${getGPAColor(
                                                    semesterGPA
                                                )}`}
                                            >
                                                {semesterGPA.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Subjects Table */}
                                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0">
                                    <div className="inline-block min-w-full align-middle">
                                        <table className="w-full table-auto">
                                            <thead className="bg-primary/5 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs md:text-base font-semibold">
                                                        Code
                                                    </th>
                                                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs md:text-base font-semibold">
                                                        Subject Name
                                                    </th>
                                                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs md:text-base font-semibold">
                                                        Credits
                                                    </th>
                                                    <th className="px-2 py-2 text-center text-[10px] sm:text-xs md:text-base font-semibold">
                                                        Grade
                                                    </th>
                                                    <th className="hidden md:table-cell px-2 py-2 text-center text-xs md:text-base font-semibold">
                                                        Value
                                                    </th>
                                                    <th className="hidden md:table-cell px-2 py-2 text-center text-xs md:text-base font-semibold">
                                                        Points
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subjects.map(
                                                    (subject, subIndex) => {
                                                        const grade =
                                                            subjectGrades[
                                                                subject.code
                                                            ];
                                                        const gradeValue = grade
                                                            ? gradePoints[grade]
                                                            : undefined;
                                                        const points =
                                                            grade &&
                                                            gradeValue !==
                                                                undefined
                                                                ? (
                                                                      subject.credits *
                                                                      gradeValue
                                                                  ).toFixed(1)
                                                                : "-";

                                                        return (
                                                            <motion.tr
                                                                key={
                                                                    subject.code
                                                                }
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                }}
                                                                transition={{
                                                                    delay:
                                                                        subIndex *
                                                                        0.02,
                                                                }}
                                                                className="border-b hover:bg-muted/30 transition-colors"
                                                            >
                                                                <td className="px-2 py-2">
                                                                    <span className="text-[10px] sm:text-xs md:text-base font-mono font-medium text-primary block">
                                                                        {
                                                                            subject.code
                                                                        }
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <div className="flex flex-col gap-0.5 sm:gap-1">
                                                                        <span className="text-[10px] sm:text-xs md:text-base leading-tight">
                                                                            {
                                                                                subject.name
                                                                            }
                                                                        </span>
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            {subject.type ===
                                                                                "Non GPA" && (
                                                                                <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                                                    Non-GPA
                                                                                </span>
                                                                            )}
                                                                            {subject.type ===
                                                                                "O" && (
                                                                                <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                                                                                    Optional
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-2 text-center">
                                                                    <span className="text-[10px] sm:text-xs md:text-base font-medium">
                                                                        {
                                                                            subject.credits
                                                                        }
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2 text-center">
                                                                    <Select
                                                                        value={
                                                                            subjectGrades[
                                                                                subject
                                                                                    .code
                                                                            ] ||
                                                                            ""
                                                                        }
                                                                        onValueChange={(
                                                                            value
                                                                        ) =>
                                                                            updateGrade(
                                                                                subject.code,
                                                                                value
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-7 sm:h-8 md:h-10 w-full text-[10px] sm:text-xs md:text-base">
                                                                            <SelectValue placeholder="Select" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {subject.type ===
                                                                            "Non GPA"
                                                                                ? nonGPAGrades.map(
                                                                                      (
                                                                                          gradeOption
                                                                                      ) => (
                                                                                          <SelectItem
                                                                                              key={
                                                                                                  gradeOption
                                                                                              }
                                                                                              value={
                                                                                                  gradeOption
                                                                                              }
                                                                                          >
                                                                                              {
                                                                                                  gradeOption
                                                                                              }
                                                                                          </SelectItem>
                                                                                      )
                                                                                  )
                                                                                : grades.map(
                                                                                      (
                                                                                          gradeOption
                                                                                      ) => (
                                                                                          <SelectItem
                                                                                              key={
                                                                                                  gradeOption
                                                                                              }
                                                                                              value={
                                                                                                  gradeOption
                                                                                              }
                                                                                          >
                                                                                              {
                                                                                                  gradeOption
                                                                                              }
                                                                                          </SelectItem>
                                                                                      )
                                                                                  )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                                <td className="hidden md:table-cell px-2 py-2 text-center">
                                                                    <span className="text-xs md:text-base font-medium">
                                                                        {gradeValue !==
                                                                        undefined
                                                                            ? gradeValue.toFixed(
                                                                                  1
                                                                              )
                                                                            : grade ===
                                                                              "Pass"
                                                                            ? "Pass"
                                                                            : grade ===
                                                                              "Fail"
                                                                            ? "Fail"
                                                                            : "-"}
                                                                    </span>
                                                                </td>
                                                                <td className="hidden md:table-cell px-2 py-2 text-center">
                                                                    <span className="text-xs md:text-base font-bold">
                                                                        {subject.type ===
                                                                        "Non GPA"
                                                                            ? grade ===
                                                                              "Pass"
                                                                                ? (
                                                                                      subject.credits *
                                                                                      1
                                                                                  ).toFixed(
                                                                                      1
                                                                                  )
                                                                                : grade ===
                                                                                  "Fail"
                                                                                ? "0.0"
                                                                                : "-"
                                                                            : points}
                                                                    </span>
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Results Section */}
                <div className="space-y-3 sm:space-y-4">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg lg:sticky lg:top-4"
                    >
                        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            <h2 className="text-xl sm:text-2xl font-semibold">
                                Results
                            </h2>
                        </div>

                        <AnimatePresence mode="wait">
                            {overallGPA !== null ? (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="space-y-4 sm:space-y-6"
                                >
                                    {/* Overall GPA Display */}
                                    <div className="text-center p-4 sm:p-6 bg-card rounded-lg sm:rounded-xl shadow-inner">
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                                Overall GPA
                                            </p>
                                        </div>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15,
                                            }}
                                        >
                                            <p
                                                className={`text-4xl sm:text-6xl font-bold ${getGPAColor(
                                                    overallGPA
                                                )} mb-2`}
                                            >
                                                {overallGPA.toFixed(2)}
                                            </p>
                                        </motion.div>
                                        <p
                                            className={`text-base sm:text-lg font-semibold ${getGPAColor(
                                                overallGPA
                                            )}`}
                                        >
                                            {getGPALabel(overallGPA)}
                                        </p>
                                    </div>

                                    {/* Credits Info */}
                                    <div className="p-3 sm:p-4 bg-card rounded-lg sm:rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-muted-foreground">
                                                Total Credits
                                            </span>
                                            <span className="text-lg font-bold text-primary">
                                                {totalCredits} / 120
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(
                                                        (totalCredits / 120) *
                                                            100,
                                                        100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* GPA Scale Reference */}
                                    <div className="p-3 sm:p-4 bg-card rounded-lg sm:rounded-xl space-y-2">
                                        <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                                            GPA Scale Reference
                                        </p>
                                        <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    3.7 - 4.0
                                                </span>
                                                <span className="text-muted-foreground">
                                                    First Class
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    3.3 - 3.69
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Second Class (Upper)
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                                                    3.0 - 3.29
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Second Class (Lower)
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                                    2.0 - 2.99
                                                </span>
                                                <span className="text-muted-foreground">
                                                    General
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-red-600 dark:text-red-400 font-medium">
                                                    Below 2.0
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Not Eligible
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Reset Button - Only show when grades exist */}
                                    {hasGrades && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="mt-4"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={resetCalculator}
                                                className="gap-1.5 w-full text-xs h-8 text-muted-foreground hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Reset All Grades
                                            </Button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center py-8 sm:py-12"
                                >
                                    <Calculator className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mx-auto mb-3 sm:mb-4" />
                                    <p className="text-sm sm:text-base text-muted-foreground px-4">
                                        Enter grades to calculate your GPA
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* Tips Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 sm:mt-8 bg-card border rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg"
            >
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center space-x-2">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span>How to Use</span>
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                        <p className="font-medium text-foreground mb-1 sm:mb-2">
                            1. Select Program
                        </p>
                        <p>
                            Choose your department and semester from the
                            dropdown menus.
                        </p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                        <p className="font-medium text-foreground mb-1 sm:mb-2">
                            2. Enter Grades
                        </p>
                        <p>
                            Select grades for each subject. Non-GPA subjects are
                            excluded automatically.
                        </p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                        <p className="font-medium text-foreground mb-1 sm:mb-2">
                            3. View Results
                        </p>
                        <p>
                            Your GPA is calculated instantly as you enter
                            grades.
                        </p>
                    </div>
                </div>
            </motion.div>

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
