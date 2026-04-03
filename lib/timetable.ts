export interface ExamEntry {
    date: string;
    time: string;
    dept: string;
    subject: string;
    title: string;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const CSV_DATA = `Date,Time,Dept.,Subject,Title
23.04.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 1303,Fundamentals of Mathematics for Technology
27.04.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 1301,Fundamentals of Physics for Technology
04.05.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 1302,Fundamentals of Chemistry for Technology
04.05.2026,9.00 a.m. - 12.00 p.m.,ICT,ICT 1305,Program Designing and Programming (Theory)
08.05.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 1304,Fundamentals of Computer for Technology
08.05.2026,9.00 a.m. onwards,ICT,ICT 1305,Program Designing and Programming (Practical)
12.05.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 1306,Fundamentals of Biology for Technology
12.05.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 1202,Electronic Circuits
14.05.2026,11.00 a.m. onwards,ALL,CML 1202,Presentation Skills - Group Presentations
15.05.2026,9.00 a.m. onwards,ALL,CML 1202,Presentation Skills - Individual Speech (Group 01)
15.05.2026,9.00 a.m. onwards,ICT,ICT 1111,Productivity & Collaborative Tools (Th & Pr)
18.05.2026,9.00 a.m. onwards,ALL,CML 1202,Presentation Skills - Individual Speech (Group 02)
21.05.2026,2.30 p.m. - 4.00 p.m.,ALL,CML 1201,Personality Development
23.05.2026,1.30 p.m. - 4.30 p.m.,ALL,CMT 1205,Communication Skills I - English (Theory)
25.05.2026,9.00 a.m. - 10.00 a.m.,ALL,CML 1202,Presentation Skills (Theory)
26.05.2026,9.00 a.m. onwards,ALL,CMT 1205,Communication Skills 1 - English (Practical)
,,,,
,,,,
Date,Time,Dept.,Subject,Title
21.04.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 2306,Mathematics For Technology II
24.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 2204,Food Preservation
24.04.2026,2.00 p.m. - 4.00 p.m.,ALL,CML 2202,Engineering Economics
28.04.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 2204,Plant Tissue Culture (Theory)
28.04.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 2203,Introduction to Food Industry
28.04.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 2203,Introduction to Ceramic Technology
28.04.2026,9.00 a.m. - 12.00 p.m.,EET,EET 2301,Digital & Analog Electronics
30.04.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 2205,Molecular Biology (Theory)
30.04.2026,9.00 a.m. - 12.00 p.m.,ICT,ICT 2304,Object Oriented Programming
05.05.2026,1.00 p.m. - 4.00 p.m.,ALL,CMT 2301,Fundamental of Statistics for Technology
07.05.2026,9.00 a.m. - 12.00 p.m.,ALL,CMT 2202,Communication Skills III (English) (Theory)
11.05.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 2202,Basic Biochemistry
11.05.2026,9.00 a.m. - 12.00 p.m.,ICT,ICT 2303,Data Structures and Algorithms
11.05.2026,9.00 a.m. onwards,MTT,MTT 2206,Graphical Programming (Practical)
14.05.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 2207,Software System Design
14.05.2026,2.00 p.m. - 4.00 p.m.,EET,EET 2208,Introduction to Electrical Power
14.05.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 2203,Genetics and Evolution
14.05.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 2201,Physical Chemistry
18.05.2026,1.00 p.m. - 3.00 p.m.,ICT,ICT 2202,Operating Systems
18.05.2026,1.00 p.m. - 3.00 p.m.,MTT,MTT 2202,Chemistry for Materials Technology
18.05.2026,1.00 p.m. - 3.00 p.m.,BPT,BPT 2202,Introduction to Bioprocess Technology (Theory)
21.05.2026,9.00 a.m. onwards,BPT,BPT 2202,Introduction to Bioprocess Technology (Practical)
21.05.2026,9.00 a.m. onwards,MTT,MTT 2204,Computer Aided Design (CAD) (Practical)
22.05.2026,9.00 a.m. onwards,BPT,BPT 2204,Plant Tissue Culture (Practical)
25.05.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 2201,Quality Management
25.05.2026,2.00 p.m. - 4.00 p.m.,MTT,MTT 2201,Fundamentals of Solid State Physics
25.05.2026,2.00 p.m. - 4.00 p.m.,EET,EET 2202,Electricity Networks
26.05.2026,9.00 a.m. onwards,BPT,BPT 2205,Molecular Biology (Practical)
29.05.2026,9.00 a.m. onwards,ALL,CMT 2202,Communication Skills III - English (Practical)
,,,,
Date,Time,Dept.,Subject,Title
23.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 3204,Meat and Fish Processing Technology
23.04.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 3208,Industrial Microbiology - Theory
23.04.2026,2.00 p.m. - 5.00 p.m.,EET,EET 3301,Electrical Power Systems
23.04.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 3307,Metallurgy I
23.04.2026,2.00 p.m. - 5.00 p.m.,ICT,ICT 3312,Software Verification and Validation
27.04.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3203,Scientific Computer Applications (Th & Pr)
27.04.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 3203,Bioprocess Instrumentation and Control
27.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 3203,Food Analysis
27.04.2026,2.00 p.m. - 5.00 p.m.,EET,EET 3304,Digital Signal Processing
27.04.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 3308,Polymer Technology I
30.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 3209,Cereals and Pulses Processing Technology
30.04.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 3304,Molecular Modelling (Theory)
30.04.2026,2.00 p.m. - 4.00 p.m.,EET,EET 3203,Computer Systems
30.04.2026,2.00 p.m. - 4.00 p.m.,MTT,MTT 3204,Workshop Technology II
30.04.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3307,Computational Statistics (Theory)
05.05.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 3205,Bioprocess Optimization and Simulation
05.05.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 3205,Functional Food and Food Toxicology
05.05.2026,9.00 a.m. - 11.00 a.m.,EET,EET 3206,Automation Technology I
05.05.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 3212,Non Destructive Testing of Materials
05.05.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 3208,Design and Analysis of Algorithm
07.05.2026,2.00 p.m. - 5.00 p.m.,ICT,ICT 3315,Internet of Things
07.05.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 3207,Enzyme Technology
07.05.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 3207,Confectionary and Beverage Technology
07.05.2026,2.00 p.m. - 3.30 p.m.,MTT,MTT 3111,Thermodynamics for Materials Technology
11.05.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 3206,Dairy Product Technology
11.05.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 3206,Molecular Immunology and Current Application
11.05.2026,2.00 p.m. - 4.00 p.m.,EET,EET 3202,Communication Systems
11.05.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 3306,Ceramic Technology II
11.05.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3218,Basics of Virtual Reality
14.05.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 3201,Fruits & Vegetables Processing Technology
14.05.2026,9.00 a.m. - 12.00 a.m.,EET,EET 3305,Control Systems
14.05.2026,9.00 a.m. onwards,ICT,ICT 3307,Computational Statistics (Practical)
14.05.2026,9.00 a.m. onwards,BPT,BPT 3208,Industrial Microbiology (Practical)
15.05.2026,9.00 a.m. - 11.00 a.m.,EET,EET 3210,Electrical Installations
18.05.2026,9.00 a.m. onwards,BPT,BPT 3304,Molecular Modelling (Practical)
18.05.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 3202,Food Engineering
18.05.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 3202,Degradation of Materials
19.05.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 3209,Scientific Writing (20-21 Batch)
21.05.2026,1.00 p.m. - 4.00 p.m.,BPT,BPT 3302,Bioinformatics (Theory)
21.05.2026,1.00 p.m. - 3.00 p.m.,ICT,ICT 3217,Advance Computer Networks
25.05.2026,11.00 a.m. - 12.00 p.m.,ALL,CML 3101,Legal and Patent Aspects
29.05.2026,1.00 p.m. - 3.00 p.m.,BPT,BPT 3201,Molecular Microbiology
29.05.2026,1.00 p.m. - 3.00 p.m.,ICT,ICT 3201,Software Project Management
29.05.2026,9.00 a.m. onwards,BPT,BPT 3302,Bioinformatics (Practical)
,,,,
,,,,
,,,,
Date,Time,Dept.,Subject,Title
21.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 4203,Water Science & Technology
21.04.2026,2.00 p.m. - 5.00 p.m.,BPT,BPT 4301,Drug Designing (Theory)
21.04.2026,2.00 p.m. - 5.00 p.m.,EET,EET 4304,Power Electronics
21.04.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 4303,Ceramic Technology III
24.04.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 4205,Plant Cell Culture
24.04.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 4209,Sensory Evaluation
24.04.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 4201,Fluid Mechanics
25.04.2026,9.00 a.m. - 11.00 a.m.,ALL,CML 4201,Entrepreneurship
28.04.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 4206,Pharmaceutical Biotechnology
28.04.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 4206,Supply Chain Analysis
28.04.2026,2.00 p.m. - 4.00 p.m.,EET,EET 4208,Fiber Optic Techniques
28.04.2026,2.00 p.m. - 4.00 p.m.,MTT,MTT 4206,Mineral Processing
04.05.2026,1.00 p.m. onwards,EET,EET 4301,Electronic Circuit Design and Simulations (Prac)
04.05.2026,2.00 p.m. - 5.00 p.m.,BPT,BPT 4302,Downstream Process Technology
04.05.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 4305,Polymer Technology II
04.05.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 4302,Food Product Development (Theory)
08.05.2026,2.00 p.m. - 5.00 p.m.,BPT,BPT 4303,Bioremediation and Waste Management
08.05.2026,2.00 p.m. - 5.00 p.m.,EET,EET 4303,Electrical Energy Utilizations
08.05.2026,2.00 p.m. - 5.00 p.m.,MTT,MTT 4307,Metallurgy II
12.05.2026,9.00 a.m. onwards,BPT,BPT 4301,Drug Designing (Practical)
12.05.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 4208,Cleaner Production
12.05.2026,2.00 p.m. - 4.00 p.m.,EET,EET 4216,Energy and Environment
12.05.2026,2.00 p.m. - 3.30 p.m.,MTT,MTT 4121,Research Methodology and Scientific Writing
15.05.2026,9.00 a.m. onwards,EET,EET 4206,Automation Technology II - Practical exam
15.05.2026,1.00 p.m. - 2.00 p.m.,FDT,FDT 4107,Scientific Writing
15.05.2026,1.00 p.m. - 3.00 p.m.,BPT,BPT 4204,Molecular Virology (Theory)
15.05.2026,1.00 p.m. - 3.00 p.m.,MTT,MTT 4219,Applied Mechanics
19.05.2026,9.00 a.m. - 11.00 a.m.,EET,EET 4202,Embedded Systems
21.05.2026,9.00 a.m. onwards,FDT,FDT 4302,Food Product Development (Viva)
23.05.2026,9.00 a.m. - 11.00 a.m.,ALL,CML 4202,Human Resource Management
29.05.2026,9.00 a.m. onwards,BPT,BPT 4204,Molecular Virology (Viva)`;

export const TIMETABLE: Record<number, ExamEntry[]> = (() => {
    const result: Record<number, ExamEntry[]> = { 1: [], 2: [], 3: [], 4: [] };
    const sections = CSV_DATA.split(/Date,Time,Dept\.,Subject,Title/).filter(Boolean);
    sections.forEach((section, index) => {
        const year = index + 1;
        section.trim().split("\n")
            .filter((line) => line.trim() && !line.startsWith(",,"))
            .forEach((line) => {
                const row = parseCSVLine(line);
                if (row[0] && row[0].trim()) {
                    result[year].push({
                        date: row[0].trim(),
                        time: row[1]?.trim() || "",
                        dept: row[2]?.trim() || "",
                        subject: row[3]?.trim() || "",
                        title: row[4]?.trim() || "",
                    });
                }
            });
    });
    return result;
})();

export const CALENDAR_DATA: Record<number, Record<number, Record<string, ExamEntry[]>>> = (() => {
    const data: Record<number, Record<number, Record<string, ExamEntry[]>>> = {};
    for (let year = 1; year <= 4; year++) {
        data[year] = { 4: {}, 5: {} };
        TIMETABLE[year].forEach((exam) => {
            const parts = exam.date.split(".");
            if (parts.length === 3) {
                const month = parseInt(parts[1], 10);
                if (month === 4 || month === 5) {
                    const dateStr = exam.date;
                    if (!data[year][month][dateStr]) data[year][month][dateStr] = [];
                    data[year][month][dateStr].push(exam);
                }
            }
        });
    }
    return data;
})();

export const CALENDAR_DAYS: Record<number, Record<number, { day: number; dateStr: string; exams: ExamEntry[]; isPast: boolean }[]>> = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: Record<number, Record<number, { day: number; dateStr: string; exams: ExamEntry[]; isPast: boolean }[]>> = {};

    for (let year = 1; year <= 4; year++) {
        result[year] = {};
        for (let monthIndex = 0; monthIndex < 2; monthIndex++) {
            const jsMonth = monthIndex + 3;
            const csvMonth = jsMonth + 1;
            const firstDay = new Date(2026, jsMonth, 1).getDay();
            const daysInMonth = new Date(2026, jsMonth + 1, 0).getDate();
            const days: { day: number; dateStr: string; exams: ExamEntry[]; isPast: boolean }[] = [];

            for (let i = 0; i < firstDay; i++) {
                days.push({ day: 0, dateStr: "", exams: [], isPast: false });
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${day.toString().padStart(2, "0")}.${csvMonth.toString().padStart(2, "0")}.2026`;
                const exams = CALENDAR_DATA[year][csvMonth]?.[dateStr] || [];
                const examDate = new Date(2026, jsMonth, day);
                days.push({ day, dateStr, exams, isPast: examDate < today });
            }

            result[year][monthIndex] = days;
        }
    }

    return result;
})();
