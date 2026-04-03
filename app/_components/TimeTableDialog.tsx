"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import {
    CALENDAR_DAYS,
    TIMETABLE,
    ExamEntry,
} from "@/lib/timetable";

const MONTH_NAMES = ["April", "May"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEPT_COLORS: Record<string, string> = {
    ALL: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    ICT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    BPT: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    FDT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    EET: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    MTT: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

interface TimeTableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CalendarCell = ({ day, index, monthIndex, monthName, hoveredCell, setHoveredCell, hoveredMonth, setHoveredMonth, tappedCell, handleCellTap }: {
    day: { day: number; dateStr: string; exams: ExamEntry[]; isPast: boolean };
    index: number;
    monthIndex: number;
    monthName: string;
    hoveredCell: number | null;
    setHoveredCell: (v: number | null) => void;
    hoveredMonth: number | null;
    setHoveredMonth: (v: number | null) => void;
    tappedCell: string | null;
    handleCellTap: (key: string, hasExams: boolean, dateStr: string) => void;
}) => {
    const cellKey = `${monthIndex}-${index}`;
    const isTapped = tappedCell === cellKey;
    const isHovered = hoveredCell === index && hoveredMonth === monthIndex;
    const showTooltip = !day.isPast && (isTapped || isHovered) && day.exams.length > 0;
    const tooltipSide: 'left' | 'right' = monthIndex === 1 ? 'left' : 'right';

    return (
        <div
            key={index}
            onMouseEnter={() => {
                if (day.exams.length > 0 && !day.isPast) {
                    setHoveredCell(index);
                    setHoveredMonth(monthIndex);
                }
            }}
            onMouseLeave={() => {
                setHoveredCell(null);
                setHoveredMonth(null);
            }}
            onClick={() => {
                if (!day.isPast) handleCellTap(cellKey, day.exams.length > 0, day.dateStr);
            }}
            className={`
                relative rounded-md p-0.5 sm:p-1 text-[10px] sm:text-xs
                ${day.day === 0 ? "invisible" : ""}
                ${day.exams.length > 0 && !day.isPast
                    ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 cursor-pointer active:scale-95 sm:hover:bg-blue-100 dark:sm:hover:bg-blue-950/50 transition-transform"
                    : day.exams.length > 0 && day.isPast
                        ? "bg-muted/40 dark:bg-muted/10 border border-muted/30 dark:border-muted-10 opacity-60 overflow-hidden"
                        : "bg-muted/20"
                }
            `}
        >
            {day.exams.length > 0 && day.isPast && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="3" className="text-red-400/40 dark:text-red-500/30" />
                    </svg>
                </div>
            )}
            <span className={`font-semibold relative z-[1] ${day.exams.length > 0 && !day.isPast ? "text-blue-700 dark:text-blue-400" : day.exams.length > 0 && day.isPast ? "text-muted-foreground line-through decoration-red-400 dark:decoration-red-500" : "text-muted-foreground"}`}>
                {day.day}
            </span>
            {day.exams.length > 0 && (
                <div className="mt-0.5 space-y-0.5 relative z-[1]">
                    {day.exams.map((exam, i) => (
                        <div
                            key={i}
                            className={`px-0.5 sm:px-1 py-0.5 rounded text-[8px] sm:text-[10px] font-medium leading-tight truncate ${
                                day.isPast
                                    ? "bg-muted/30 text-muted-foreground line-through decoration-red-400 dark:decoration-red-500"
                                    : DEPT_COLORS[exam.dept] || DEPT_COLORS.ALL
                            }`}
                        >
                            {exam.subject}
                        </div>
                    ))}
                </div>
            )}
            {!day.isPast && day.exams.length > 0 && (
                <div className="hidden sm:flex items-center justify-center mt-0.5 relative z-[1]">
                    {isTapped || isHovered ? (
                        <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                </div>
            )}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-[60] top-1/2 -translate-y-1/2 w-56 sm:w-60 ${
                            tooltipSide === 'right'
                                ? 'left-full ml-1 sm:ml-2'
                                : 'right-full mr-1 sm:mr-2'
                        }`}
                    >
                        <div className="bg-popover text-popover-foreground rounded-lg shadow-xl border p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                            <div className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 border-b pb-1 sm:pb-1.5">
                                {monthName} {day.day}, 2026
                            </div>
                            {day.exams.map((exam, i) => (
                                <div key={i} className="space-y-0.5 sm:space-y-1">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold ${DEPT_COLORS[exam.dept] || DEPT_COLORS.ALL}`}>
                                            {exam.dept}
                                        </span>
                                        <span className="font-semibold text-xs sm:text-sm">{exam.subject}</span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">{exam.title}</p>
                                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        {exam.time}
                                    </div>
                                    {i < day.exams.length - 1 && (
                                        <div className="border-t pt-0.5 sm:pt-1 mt-0.5 sm:mt-1" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-popover border ${
                            tooltipSide === 'right'
                                ? 'left-0 -ml-[3px] border-l-0 border-t-0 rotate-45'
                                : 'right-0 -mr-[3px] border-r-0 border-b-0 rotate-45'
                        }`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export function TimeTableDialog({ open, onOpenChange }: TimeTableDialogProps) {
    const [selectedYear, setSelectedYear] = useState(1);
    const [hoveredCell, setHoveredCell] = useState<number | null>(null);
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
    const [tappedCell, setTappedCell] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const yearExams = TIMETABLE[selectedYear] || [];
    const aprilDays = CALENDAR_DAYS[selectedYear]?.[0] || [];
    const mayDays = CALENDAR_DAYS[selectedYear]?.[1] || [];

    const displayExams = useMemo(() => {
        if (selectedDate) {
            return yearExams.filter((e) => e.date === selectedDate);
        }
        return yearExams;
    }, [yearExams, selectedDate]);

    const handleCellTap = (cellKey: string, hasExams: boolean, dateStr: string) => {
        if (!hasExams) return;
        setSelectedDate(tappedCell === cellKey ? null : dateStr);
        setTappedCell(tappedCell === cellKey ? null : cellKey);
    };

    const renderCalendar = (monthName: string, days: typeof aprilDays, monthIndex: number) => (
        <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-center mb-2 sm:mb-3 text-blue-700 dark:text-blue-400">
                {monthName} 2026
            </h3>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {DAY_NAMES.map((day) => (
                    <div
                        key={day}
                        className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 sm:py-1.5"
                    >
                        {day}
                    </div>
                ))}
                {days.map((day, index) => (
                    <CalendarCell
                        key={index}
                        day={day}
                        index={index}
                        monthIndex={monthIndex}
                        monthName={monthName}
                        hoveredCell={hoveredCell}
                        setHoveredCell={setHoveredCell}
                        hoveredMonth={hoveredMonth}
                        setHoveredMonth={setHoveredMonth}
                        tappedCell={tappedCell}
                        handleCellTap={handleCellTap}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[98vw] sm:w-[95vw] max-w-[95vw] sm:max-w-[92vw] h-[95vh] sm:h-auto sm:max-h-[92vh] overflow-y-auto p-3 sm:p-6">
                <DialogHeader className="pb-2 sm:pb-4">
                    <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                        Exam Time Table 2026
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[1, 2, 3, 4].map((year) => (
                            <button
                                key={year}
                                onClick={() => {
                                    setSelectedYear(year);
                                    setTappedCell(null);
                                }}
                                className={`py-2.5 sm:py-4 rounded-lg text-sm sm:text-lg font-semibold transition-all active:scale-95 ${
                                    selectedYear === year
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "bg-muted hover:bg-muted/80 border"
                                }`}
                            >
                                {year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"}
                            </button>
                        ))}
                    </div>

                    <motion.div
                        key={selectedYear}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col md:flex-row gap-4 sm:gap-6"
                    >
                        {renderCalendar("April", aprilDays, 0)}
                        {renderCalendar("May", mayDays, 1)}
                    </motion.div>

                    <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-center pt-2 border-t">
                        <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">Departments:</span>
                        {Object.entries(DEPT_COLORS).filter(([k]) => k !== "ALL").map(([dept, color]) => (
                            <span key={dept} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${color}`}>
                                {dept}
                            </span>
                        ))}
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${DEPT_COLORS.ALL}`}>
                            ALL
                        </span>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                        <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            {selectedDate
                                ? `Exams on ${selectedDate}`
                                : `All Exams - ${selectedYear}${selectedYear === 1 ? "st" : selectedYear === 2 ? "nd" : selectedYear === 3 ? "rd" : "th"} Year`
                            }
                            {selectedDate && (
                                <button
                                    onClick={() => { setSelectedDate(null); setTappedCell(null); }}
                                    className="text-xs text-muted-foreground hover:text-foreground ml-2 underline"
                                >
                                    Show all
                                </button>
                            )}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 sm:max-h-64 overflow-y-auto pr-1 sm:pr-2">
                            {displayExams.map((exam, index) => {
                                const parts = exam.date.split(".");
                                const day = parts[0];
                                const month = parseInt(parts[1], 10) - 1;
                                const examDate = new Date(2026, month, parseInt(day, 10));
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isPast = examDate < today;
                                return (
                                    <div
                                        key={index}
                                        className={`border rounded-lg p-2 sm:p-3 transition-shadow relative overflow-hidden ${
                                            isPast
                                                ? "bg-muted/30 border-muted/20 opacity-50"
                                                : "bg-card hover:shadow-md"
                                        }`}
                                    >
                                        {isPast && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                    <line x1="5" y1="5" x2="95" y2="95" stroke="currentColor" strokeWidth="2" className="text-red-400/30 dark:text-red-500/20" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className={`flex items-start gap-2 relative z-[1] ${isPast ? "opacity-60" : ""}`}>
                                            <div className={`text-center min-w-[40px] sm:min-w-[45px] rounded-md p-1 sm:p-1.5 ${isPast ? "bg-muted/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                                                <div className={`text-base sm:text-lg font-bold ${isPast ? "text-muted-foreground line-through decoration-red-400 dark:decoration-red-500" : "text-blue-600 dark:text-blue-400"}`}>
                                                    {day}
                                                </div>
                                                <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                    {MONTH_NAMES[month]?.slice(0, 3)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                                    <span className={`font-semibold text-xs sm:text-sm truncate ${isPast ? "line-through decoration-red-400 dark:decoration-red-500" : ""}`}>
                                                        {exam.subject}
                                                    </span>
                                                    <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-semibold ${DEPT_COLORS[exam.dept] || DEPT_COLORS.ALL}`}>
                                                        {exam.dept}
                                                    </span>
                                                </div>
                                                <p className={`text-[10px] sm:text-xs truncate ${isPast ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                                                    {exam.title}
                                                </p>
                                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${isPast ? "text-muted-foreground/50" : "text-blue-600 dark:text-blue-400"}`}>
                                                    {exam.time}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
