"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Department options based on study year
const departmentsByYear: Record<string, { value: string; label: string }[]> = {
    "1": [
        { value: "ITT", label: "ITT" },
        { value: "BST", label: "BST" },
        { value: "ENT", label: "ENT" },
    ],
    "2": [
        { value: "ITT", label: "ITT" },
        { value: "EET", label: "EET" },
        { value: "MTT", label: "MTT" },
        { value: "BPT", label: "BPT" },
        { value: "FDT", label: "FDT" },
    ],
    "3": [
        { value: "ITT", label: "ITT" },
        { value: "EET", label: "EET" },
        { value: "MTT", label: "MTT" },
        { value: "BPT", label: "BPT" },
        { value: "FDT", label: "FDT" },
    ],
    "4": [
        { value: "ITT", label: "ITT" },
        { value: "EET", label: "EET" },
        { value: "MTT", label: "MTT" },
        { value: "BPT", label: "BPT" },
        { value: "FDT", label: "FDT" },
    ],
};

const pastPaperYears = ["2024", "2023", "2022", "2021", "2020", "2019"];
const semesters = ["1", "2"];

interface FiltersProps {
    onFilterChange: (filters: {
        department: string;
        studyYear: string;
        pastPaperYears: string[];
        semesters: string[];
        search: string;
    }) => void;
}

const STORAGE_KEY = "fot_paper_filters";

// Default filters
const DEFAULT_FILTERS = {
    department: "ITT",
    studyYear: "2",
    pastPaperYears: [] as string[],
    semesters: ["2"] as string[],
    search: "",
};

export function Filters({ onFilterChange }: FiltersProps) {
    const [mounted, setMounted] = React.useState(false);
    const [department, setDepartment] = React.useState(
        DEFAULT_FILTERS.department
    );
    const [studyYear, setStudyYear] = React.useState(DEFAULT_FILTERS.studyYear);
    const [selectedPastPaperYears, setSelectedPastPaperYears] = React.useState<
        string[]
    >(DEFAULT_FILTERS.pastPaperYears);
    const [selectedSemesters, setSelectedSemesters] = React.useState<string[]>(
        DEFAULT_FILTERS.semesters
    );
    const [search, setSearch] = React.useState(DEFAULT_FILTERS.search);
    const [pastPaperYearOpen, setPastPaperYearOpen] = React.useState(false);
    const [semesterOpen, setSemesterOpen] = React.useState(false);

    // Load from localStorage on mount
    React.useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setDepartment(parsed.department || DEFAULT_FILTERS.department);
                setStudyYear(parsed.studyYear || DEFAULT_FILTERS.studyYear);
                setSelectedPastPaperYears(
                    parsed.pastPaperYears || DEFAULT_FILTERS.pastPaperYears
                );
                setSelectedSemesters(
                    parsed.semesters || DEFAULT_FILTERS.semesters
                );
                setSearch(parsed.search || DEFAULT_FILTERS.search);
            } catch (error) {
                console.error("Failed to parse saved filters:", error);
            }
        }
    }, []);

    // Get available departments based on selected study year
    const availableDepartments =
        departmentsByYear[studyYear] || departmentsByYear["2"];

    // Save to localStorage and notify parent whenever filters change
    React.useEffect(() => {
        if (!mounted) return; // Don't save on initial mount

        const filters = {
            department,
            studyYear,
            pastPaperYears: selectedPastPaperYears,
            semesters: selectedSemesters,
            search,
        };

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));

        // Notify parent component
        onFilterChange(filters);
    }, [
        department,
        studyYear,
        selectedPastPaperYears,
        selectedSemesters,
        search,
        onFilterChange,
        mounted,
    ]);

    // When study year changes, reset department if it's not valid for the new year
    React.useEffect(() => {
        if (!mounted) return;

        const validDepartments =
            departmentsByYear[studyYear]?.map((d) => d.value) || [];
        if (!validDepartments.includes(department)) {
            // Reset to first available department for that year
            setDepartment(validDepartments[0] || "ITT");
        }
    }, [studyYear, department, mounted]);

    const togglePastPaperYear = (year: string) => {
        setSelectedPastPaperYears((prev) =>
            prev.includes(year)
                ? prev.filter((y) => y !== year)
                : [...prev, year]
        );
        // Reset search when using filters
        setSearch("");
    };

    const toggleSemester = (semester: string) => {
        setSelectedSemesters((prev) =>
            prev.includes(semester)
                ? prev.filter((s) => s !== semester)
                : [...prev, semester]
        );
        // Reset search when using filters
        setSearch("");
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        // Clear filters when searching
        if (value.trim()) {
            setDepartment("");
            setStudyYear("");
            setSelectedPastPaperYears([]);
            setSelectedSemesters([]);
        } else {
            // Restore defaults when search is cleared
            setDepartment(DEFAULT_FILTERS.department);
            setStudyYear(DEFAULT_FILTERS.studyYear);
            setSelectedPastPaperYears(DEFAULT_FILTERS.pastPaperYears);
            setSelectedSemesters(DEFAULT_FILTERS.semesters);
        }
    };

    const handleDepartmentChange = (value: string) => {
        setDepartment(value);
        // Reset search when using filters
        setSearch("");
    };

    const handleStudyYearChange = (value: string) => {
        setStudyYear(value);
        // Reset search when using filters
        setSearch("");
    };

    return (
        <motion.div
            className="flex flex-wrap gap-6 mb-8 p-6 bg-card rounded-lg border shadow-sm justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <div className="flex-1 min-w-50 max-w-[300px]">
                <label className="text-sm font-semibold mb-3 block text-foreground">
                    Search Papers
                </label>
                <Input
                    type="text"
                    placeholder="Search by title or subject code"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="bg-background border-2 hover:border-primary/50 transition-colors"
                />
            </div>

            <div className="flex gap-9 w-[300px] justify-evenly align-baseline">
                <div className="flex-1">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Study Year
                    </label>
                    <Select
                        value={studyYear}
                        onValueChange={handleStudyYearChange}
                    >
                        <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                            <SelectValue placeholder="Select study year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1" className="cursor-pointer">
                                Year 1
                            </SelectItem>
                            <SelectItem value="2" className="cursor-pointer">
                                Year 2
                            </SelectItem>
                            <SelectItem value="3" className="cursor-pointer">
                                Year 3
                            </SelectItem>
                            <SelectItem value="4" className="cursor-pointer">
                                Year 4
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Department
                    </label>
                    <Select
                        value={department}
                        onValueChange={handleDepartmentChange}
                    >
                        <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                            {availableDepartments.map((dept) => (
                                <SelectItem
                                    key={dept.value}
                                    value={dept.value}
                                    className="cursor-pointer"
                                >
                                    {dept.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex gap-4">
                {/* Past Paper Year */}
                <div className="w-48">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Past Paper Year
                    </label>
                    <Popover
                        open={pastPaperYearOpen}
                        onOpenChange={setPastPaperYearOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={pastPaperYearOpen}
                                className="w-full justify-between bg-background border-2 hover:border-primary/50 transition-colors"
                            >
                                {selectedPastPaperYears.length > 0
                                    ? selectedPastPaperYears.join(", ")
                                    : "Select past paper years"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-2">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {pastPaperYears.map((year) => (
                                            <CommandItem
                                                key={year}
                                                onSelect={() =>
                                                    togglePastPaperYear(year)
                                                }
                                                className="flex items-center cursor-pointer hover:bg-muted p-2"
                                                onClick={() =>
                                                    togglePastPaperYear(year)
                                                }
                                            >
                                                <Checkbox
                                                    checked={selectedPastPaperYears.includes(
                                                        year
                                                    )}
                                                    className="mr-3"
                                                />
                                                <span>{year}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Semester */}
                <div className="md:w-48">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Semester
                    </label>
                    <Popover open={semesterOpen} onOpenChange={setSemesterOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={semesterOpen}
                                className="w-full justify-between bg-background border-2 hover:border-primary/50 transition-colors"
                            >
                                {selectedSemesters.length > 0
                                    ? selectedSemesters
                                          .map((sem) => `Semester ${sem}`)
                                          .join(", ")
                                    : "Select semesters"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-2">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {semesters.map((semester) => (
                                            <CommandItem
                                                key={semester}
                                                onSelect={() =>
                                                    toggleSemester(semester)
                                                }
                                                className="flex items-center cursor-pointer hover:bg-muted p-2"
                                                onClick={() =>
                                                    toggleSemester(semester)
                                                }
                                            >
                                                <Checkbox
                                                    checked={selectedSemesters.includes(
                                                        semester
                                                    )}
                                                    className="mr-3"
                                                />
                                                <span>Semester {semester}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Info text about saved preferences */}
            <div className="w-full text-center">
                <p className="text-xs text-muted-foreground">
                    💾 Your filter preferences are automatically saved
                </p>
            </div>
        </motion.div>
    );
}
