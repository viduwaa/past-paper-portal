"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
    Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MAX_FILE_MB = 10;

interface FilterOptions {
    departments: string[];
    years: string[];
    semesters: string[];
    examYears: string[];
    courseCodes: { code: string; name: string }[];
}

const EMPTY_OPTIONS: FilterOptions = {
    departments: [],
    years: [],
    semesters: [],
    examYears: [],
    courseCodes: [],
};

export function ContributeForm() {
    const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
    const [optionsLoaded, setOptionsLoaded] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [departmentCode, setDepartmentCode] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [semester, setSemester] = useState("");
    const [examYear, setExamYear] = useState("");
    const [courseCode, setCourseCode] = useState("");
    const [courseName, setCourseName] = useState("");
    const [contributorName, setContributorName] = useState("");
    const [contributorGithub, setContributorGithub] = useState("");
    const [notes, setNotes] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const response = await fetch("/api/contribute/options");
                if (!response.ok) return;
                const data = (await response.json()) as FilterOptions;
                if (!cancelled) {
                    setOptions(data);
                    // Preselect the most likely values so the common case
                    // needs fewer clicks.
                    if (data.departments.includes("ICT")) {
                        setDepartmentCode("ICT");
                    }
                    if (data.years.includes("2nd Year")) {
                        setAcademicYear("2nd Year");
                    }
                    if (data.semesters.includes("1st Semester")) {
                        setSemester("1st Semester");
                    }
                    if (data.examYears.length > 0) {
                        setExamYear(data.examYears[0]);
                    }
                }
            } catch {
                // The form still works without the suggestions; the
                // server validates the values regardless.
            } finally {
                if (!cancelled) setOptionsLoaded(true);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Suggest a subject name as the contributor types a known code.
    const matchedCourse = useMemo(() => {
        const code = courseCode.trim().toUpperCase().replace(/\s*-\s*/, " ");
        if (!code) return undefined;
        return options.courseCodes.find((c) => c.code === code);
    }, [courseCode, options.courseCodes]);

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0] ?? null;
        setError(null);
        setSuccess(null);

        if (selected && selected.size > MAX_FILE_MB * 1024 * 1024) {
            setError(`File is too large. The maximum size is ${MAX_FILE_MB} MB.`);
            event.target.value = "";
            setFile(null);
            return;
        }

        setFile(selected);
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!file) {
            setError("Choose a PDF file to upload.");
            return;
        }

        setSubmitting(true);
        try {
            const body = new FormData();
            body.append("file", file);
            body.append("departmentCode", departmentCode);
            body.append("academicYear", academicYear);
            body.append("semester", semester);
            body.append("examYear", examYear);
            body.append("courseCode", courseCode);
            body.append("courseName", courseName);
            body.append("contributorName", contributorName);
            body.append("contributorGithub", contributorGithub);
            body.append("notes", notes);

            const response = await fetch("/api/contribute", {
                method: "POST",
                body,
            });

            const result = (await response.json().catch(() => ({}))) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                throw new Error(result.error ?? "Upload failed.");
            }

            setSuccess(
                result.message ??
                    "Your paper has been submitted and is awaiting review.",
            );
            setFile(null);
            setCourseCode("");
            setCourseName("");
            setNotes("");
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Upload failed.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* File picker */}
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 transition-colors focus-within:border-primary/50">
                <label
                    htmlFor="paper-file"
                    className="flex cursor-pointer flex-col items-center gap-2 text-center"
                >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                    </span>
                    {file ? (
                        <>
                            <span className="font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
                                click to choose a different file
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="font-medium">
                                Choose a PDF file
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Maximum {MAX_FILE_MB} MB
                            </span>
                        </>
                    )}
                </label>
                <input
                    id="paper-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                />
            </div>

            {/* Paper details */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select
                        value={departmentCode}
                        onValueChange={setDepartmentCode}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.departments.map((department) => (
                                <SelectItem
                                    key={department}
                                    value={department}
                                >
                                    {department}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Study Year</label>
                    <Select
                        value={academicYear}
                        onValueChange={setAcademicYear}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a study year" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.years.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Semester</label>
                    <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a semester" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.semesters.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {value}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Past Paper Year
                    </label>
                    <Select value={examYear} onValueChange={setExamYear}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.examYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Subject Code</label>
                    <Input
                        list="course-codes"
                        value={courseCode}
                        onChange={(event) => setCourseCode(event.target.value)}
                        placeholder="ICT 1209"
                        required
                    />
                    <datalist id="course-codes">
                        {options.courseCodes.map((course) => (
                            <option
                                key={course.code}
                                value={course.code}
                            >
                                {course.name}
                            </option>
                        ))}
                    </datalist>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Subject Name</label>
                    <Input
                        value={courseName}
                        onChange={(event) => setCourseName(event.target.value)}
                        placeholder="Web Technologies"
                        required
                    />
                    {matchedCourse?.name && (
                        <p className="text-xs text-muted-foreground">
                            Existing subject: {matchedCourse.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Attribution */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Both fields are optional. Leave them empty to stay
                        anonymous — the paper still gets published, but without
                        a name on the contributors wall.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Your name
                        </label>
                        <Input
                            value={contributorName}
                            onChange={(event) =>
                                setContributorName(event.target.value)
                            }
                            placeholder="Optional"
                            maxLength={100}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            GitHub username
                        </label>
                        <Input
                            value={contributorGithub}
                            onChange={(event) =>
                                setContributorGithub(event.target.value)
                            }
                            placeholder="Optional"
                            maxLength={39}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Notes for the reviewer
                    </label>
                    <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Optional — anything we should know about this paper."
                        maxLength={1000}
                    />
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </motion.div>
            )}

            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
                >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{success}</span>
                </motion.div>
            )}

            <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto"
                disabled={submitting || !optionsLoaded}
            >
                {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
                {submitting ? "Uploading…" : "Submit for review"}
            </Button>

            <p className="text-xs text-muted-foreground">
                Submissions are reviewed before they appear on the site. You
                can make up to 5 submissions a day.
            </p>
        </form>
    );
}
