"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
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

const departments = [
    { value: "ITT", label: "ITT" },
    { value: "EET", label: "EET" },
    { value: "MTT", label: "MTT" },
    { value: "BPT", label: "BPT" },
    { value: "FDT", label: "FDT" },
];

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

export function Filters({ onFilterChange }: FiltersProps) {
    const [department, setDepartment] = React.useState("ITT");
    const [studyYear, setStudyYear] = React.useState("2");
    const [selectedPastPaperYears, setSelectedPastPaperYears] = React.useState<
        string[]
    >([]);
    const [selectedSemesters, setSelectedSemesters] = React.useState<string[]>([
        "2",
    ]);
    const [search, setSearch] = React.useState("");
    const [pastPaperYearOpen, setPastPaperYearOpen] = React.useState(false);
    const [semesterOpen, setSemesterOpen] = React.useState(false);

    React.useEffect(() => {
        onFilterChange({
            department,
            studyYear,
            pastPaperYears: selectedPastPaperYears,
            semesters: selectedSemesters,
            search,
        });
    }, [
        department,
        studyYear,
        selectedPastPaperYears,
        selectedSemesters,
        search,
        onFilterChange,
    ]);

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
                    onChange={(e) => {
                        const newSearch = e.target.value;
                        setSearch(newSearch);
                        // If search has text, reset all other filters
                        if (newSearch.trim()) {
                            setDepartment("");
                            setStudyYear("");
                            setSelectedPastPaperYears([]);
                            setSelectedSemesters([]);
                        }
                    }}
                    className="bg-background border-2 hover:border-primary/50 transition-colors"
                />
            </div>

            <div className="flex gap-9 w-[300px] justify-evenly align-baseline">
                <div className="flex-1">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Department
                    </label>
                    <Select
                        value={department}
                        onValueChange={(value) => {
                            setDepartment(value);
                            // Reset search when using filters
                            setSearch("");
                        }}
                    >
                        <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                            {departments.map((dept) => (
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

                <div className="flex-1">
                    <label className="text-sm font-semibold mb-3 block text-foreground">
                        Study Year
                    </label>
                    <Select
                        value={studyYear}
                        onValueChange={(value) => {
                            setStudyYear(value);
                            // Reset search when using filters
                            setSearch("");
                        }}
                    >
                        <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                            <SelectValue placeholder="Select study year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0" className="cursor-pointer">
                                All
                            </SelectItem>
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
        </motion.div>
    );
}
