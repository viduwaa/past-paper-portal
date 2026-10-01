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


/*
|--------------------------------------------------------------------------
| OCTOBER / NOVEMBER 2026 EXAMINATION TIMETABLE
|--------------------------------------------------------------------------
|
| 1 = First Year
| 2 = Second Year
| 3 = Third Year
| 4 = Fourth Year
|
| Departments:
| EET = Electrical & Electronic Technology
| MTT = Materials Technology
| ICT = Information & Communication Technology
| BPT = Bioprocess Technology
| FDT = Food Technology
|
*/

const CSV_DATA = `Date,Time,Dept.,Subject,Title,Year
19.10.2026,9.00 a.m. - 11.00 a.m.,BST,FDT 1201,Organic Chemistry,1
19.10.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 1207,Human Computer Interaction,1
19.10.2026,9.00 a.m. - 11.00 a.m.,ENT,ENT 1203,Engineering Drawing,1
19.10.2026,1.00 p.m. - 4.00 p.m.,MTT,MTT 2311,Ceramic Technology I,2
19.10.2026,1.00 p.m. - 4.00 p.m.,ICT,ICT 3314,Embedded Systems,3

20.10.2026,9.00 a.m. - 12.00 p.m.,EET,EET 4312,Power System Analysis,4
20.10.2026,9.00 a.m. - 12.00 p.m.,MTT,MTT 4311,Advanced Materials,4

21.10.2026,9.00 a.m. - 12.00 p.m.,ENT,CMT 1307,Mathematics for Technology I,1
21.10.2026,9.00 a.m. - 12.00 p.m.,BST,CMT 1307,Mathematics for Technology I,1
21.10.2026,9.00 a.m. - 12.00 p.m.,ICT,CMT 1307,Mathematics for Technology I,1

21.10.2026,2.00 p.m. - 3.00 p.m.,BPT,BPT 2108,Quality Assurance and Safety of Bio processed Product,2
21.10.2026,2.00 p.m. - 3.30 p.m.,MTT,MTT 2112,Introduction to Thermodynamics,2
21.10.2026,2.00 p.m. - 3.30 p.m.,FDT,FDT 2206,Food Physics,2
21.10.2026,2.00 p.m. - 4.00 p.m.,EET,EET 2203,Electronic Devises and Circuits,2
21.10.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3216,Research Methodology,3

22.10.2026,9.00 a.m. - 11.00 a.m.,EET,EET 4209,High Voltage Engineering,4
22.10.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 4207,Nanotechnology,4
22.10.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 4213,Manufacturing Systems,4

23.10.2026,9.00 a.m. - 12.00 p.m.,ENT,ENT 1302,Fundamentals of Electricity and Magnetism,1
23.10.2026,9.00 a.m. - 12.00 p.m.,ICT,ENT 1302,Fundamentals of Electricity and Magnetism,1
23.10.2026,9.00 a.m. - 11.00 a.m.,BST,BPT 1202,Cell Biology,1
23.10.2026,1.00 p.m. - 3.00 p.m.,EET,CMT 2203,Computational Mathematics,2
23.10.2026,1.00 p.m. - 3.00 p.m.,MTT,CMT 2203,Computational Mathematics,2
23.10.2026,1.00 p.m. - 3.00 p.m.,ICT,CMT 2203,Computational Mathematics,2
23.10.2026,1.00 p.m. - 3.00 p.m.,BPT,CMT 2203,Computational Mathematics,2
23.10.2026,1.00 p.m. - 3.00 p.m.,FDT,CMT 2203,Computational Mathematics,2
23.10.2026,1.00 p.m. - 4.00 p.m.,ICT,ICT 2305,Computational Mathematics,2

26.10.2026,9.00 a.m. - 11.00 a.m.,EET,EET 4217,Electrical Machines and Drives,4
26.10.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 4205,Food Marketing,4
26.10.2026,9.00 a.m. - 10.30 a.m.,MTT,MTT 4114,Quality Management,4
26.10.2026,1.00 p.m. - 3.00 p.m.,MTT,MTT 2207,Measurements, Error, Analysis and Instrumentations,2
26.10.2026,1.00 p.m. - 3.00 p.m.,EET,EET 2204,Electrical Measurements and Instrumentations,2
26.10.2026,1.00 p.m. - 3.00 p.m.,ICT,CML 3203,Basic of Accountancy,3

27.10.2026,9.00 a.m. - 11.00 a.m.,ENT,ENT 1204,Workshop Technology I,1
27.10.2026,9.00 a.m. - 11.00 a.m.,BST,BPT 1201,General Microbiology (Theory),1

28.10.2026,9.00 a.m. - 11.00 a.m.,EET,EET 4210,Electronic Product Design,4
28.10.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 4204,Quality Assurance, Safety and Standards in Food Industry,4
28.10.2026,9.00 a.m. - 11.00 a.m.,MTT,MTT 4215,Cleaner Production,4
28.10.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3213,Advanced Software System Design,3

29.10.2026,9.00 a.m. onwards,BST,BPT 1201,General Microbiology (Practical),1
29.10.2026,9.00 a.m. - 12.00 p.m.,ENT,ENT 1301,Introduction to Basic Electronics,1
29.10.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 1210,Introduction to Multimedia,1
29.10.2026,2.00 p.m. - 4.00 p.m.,BPT,BPT 2206,Bioreactor Operation and Design,2
29.10.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 2208,Food Microbiology,2
29.10.2026,2.00 p.m. - 4.00 p.m.,EET,EET 2206,Signals and Systems,2
29.10.2026,2.00 p.m. - 5.00 p.m.,ICT,ICT 2308,Database Systems (Theory),2
29.10.2026,2.00 p.m. - 4.00 p.m.,MTT,MTT 2209,Introduction to Polymer Technology,2

30.10.2026,9.00 a.m. - 11.30 a.m.,EET,EET 4220,Graphical Programming and Data Acquisition,4
30.10.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3204,E-Business Systems,3

02.11.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 1209,Web Technologies,1
02.11.2026,9.00 a.m. - 11.00 a.m.,ENT,CMT 1208,Computer Programming for Technology,1
02.11.2026,9.00 a.m. - 11.00 a.m.,BST,CMT 1208,Computer Programming for Technology,1
02.11.2026,1.00 p.m. - 3.00 p.m.,EET,CML 2204,Foreign Language,2
02.11.2026,1.00 p.m. - 3.00 p.m.,MTT,CML 2204,Foreign Language,2
02.11.2026,1.00 p.m. - 3.00 p.m.,ICT,CML 2204,Foreign Language,2
02.11.2026,1.00 p.m. - 3.00 p.m.,BPT,CML 2204,Foreign Language,2
02.11.2026,1.00 p.m. - 3.00 p.m.,FDT,CML 2204,Foreign Language,2

03.11.2026,9.00 a.m. - 12.00 p.m.,ICT,ICT 3311,Robotics,3

04.11.2026,9.00 a.m. - 12.00 p.m.,ENT,CMT 1209,Communication Skills II (Theory),1
04.11.2026,9.00 a.m. - 12.00 p.m.,ICT,CMT 1209,Communication Skills II (Theory),1
04.11.2026,9.00 a.m. - 12.00 p.m.,BST,CMT 1209,Communication Skills II (Theory),1
04.11.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 2211,Fundamentals of Statistics,2
04.11.2026,2.00 p.m. - 4.00 p.m.,FDT,FDT 2210,Food Biotechnology,2
04.11.2026,2.00 p.m. - 4.00 p.m.,EET,CML 2208,Introduction to Marketing,2
04.11.2026,2.00 p.m. - 4.00 p.m.,MTT,CML 2208,Introduction to Marketing,2
04.11.2026,2.00 p.m. - 4.00 p.m.,BPT,CML 2208,Introduction to Marketing,2

05.11.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 3219,Mobile Application Development,3

06.11.2026,9.00 a.m. onwards,ENT,CMT 1209,Communication Skills II (Practical),1
06.11.2026,9.00 a.m. onwards,BST,CMT 1209,Communication Skills II (Practical),1
06.11.2026,9.00 a.m. onwards,ICT,CMT 1209,Communication Skills II (Practical),1

06.11.2026,2.00 p.m. - 4.00 p.m.,ICT,ICT 2214,Introduction to Information Systems,2
06.11.2026,2.00 p.m. - 4.00 p.m.,MTT,MTT 2210,Mechanical Behavior of Materials,2
06.11.2026,2.00 p.m. - 5.00 p.m.,EET,EET 2305,Electrical Machines,2
06.11.2026,2.00 p.m. - 5.00 p.m.,BPT,FDT 2305,Analytical Chemistry,2
06.11.2026,2.00 p.m. - 5.00 p.m.,FDT,FDT 2305,Analytical Chemistry,2

09.11.2026,9.00 a.m. onwards,ICT,ICT 2308,Database Systems (Practical),2
09.11.2026,1.00 p.m. - 3.00 p.m.,MTT,MTT 2205,Introduction to Metallurgy,2
09.11.2026,1.00 p.m. - 3.00 p.m.,BPT,BPT 2207,Basic Immunology,2
09.11.2026,1.00 p.m. - 3.00 p.m.,FDT,FDT 2207,Food Chemistry,2
09.11.2026,1.00 p.m. - 3.00 p.m.,ICT,ICT 3209,Computer Organization and Architecture,3

10.11.2026,9.00 a.m. - 11.00 a.m.,ENT,CML 1203,Principles of Management,1
10.11.2026,9.00 a.m. - 11.00 a.m.,BST,CML 1203,Principles of Management,1
10.11.2026,9.00 a.m. - 11.00 a.m.,ICT,CML 1203,Principles of Management,1


11.11.2026,9.00 a.m. - 11.00 a.m.,BPT,BPT 2209,Molecular Biotechnology (Theory),2
11.11.2026,9.00 a.m. - 11.00 a.m.,FDT,FDT 2209,Introduction to Human Nutrition,2
11.11.2026,9.00 a.m. - 11.00 a.m.,EET,ICT 2213,Data Communication and Networking,2
11.11.2026,9.00 a.m. - 11.00 a.m.,ICT,ICT 2213,Data Communication and Networking,2
11.11.2026,9.00 a.m. - 10.30 a.m.,MTT,MTT 2108,Chemical Engineering Sciences,2
11.11.2026,1.00 p.m. - 3.00 p.m.,ICT,ICT 3220,Basics of Game Development,3

12.11.2026,9.00 a.m. onwards,ENT,CML 1204,Health and Wellbeing (Objective Structured Practical Exam),1
12.11.2026,9.00 a.m. onwards,BST,CML 1204,Health and Wellbeing (Objective Structured Practical Exam),1
12.11.2026,9.00 a.m. onwards,ICT,CML 1204,Health and Wellbeing (Objective Structured Practical Exam),1

13.11.2026,9.00 a.m. onwards,BPT,BPT 2209,Molecular Biotechnology (Practical),2
13.11.2026,9.00 a.m. - 10.00 a.m.,ICT,ICT 2109,Communication and Learning Skills,2
13.11.2026,9.00 a.m. - 11.00 a.m.,MTT,ICT 2206,Multimedia and Web Technologies,2
13.11.2026,2.00 p.m. - 5.00 p.m.,ICT,ICT 3310,Information Security,3

16.11.2026,9.00 a.m. onwards,ICT,ICT 4808,Research Project,4

17.11.2026,9.00 a.m. onwards,ICT,ICT 1108,Skill Development Project I,1

18.11.2026,9.00 a.m. onwards,ICT,ICT 2212,Skill Development Project II,2

19.11.2026,9.00 a.m. onwards,ICT,ICT 3206,Skills Development Project III,3
`;


/*
|--------------------------------------------------------------------------
| TIMETABLE
|--------------------------------------------------------------------------
*/

export const TIMETABLE: Record<number, ExamEntry[]> = (() => {
    const result: Record<number, ExamEntry[]> = {
        1: [],
        2: [],
        3: [],
        4: [],
    };

    CSV_DATA
        .trim()
        .split("\n")
        .forEach((line) => {
            if (!line.trim()) return;

            const row = parseCSVLine(line);

            // Skip CSV header
            if (row[0] === "Date") return;

            const year = parseInt(row[5], 10);

            if (year >= 1 && year <= 4) {
                result[year].push({
                    date: row[0].trim(),
                    time: row[1]?.trim() || "",
                    dept: row[2]?.trim() || "",
                    subject: row[3]?.trim() || "",
                    title: row[4]?.trim() || "",
                });
            }
        });

    return result;
})();


/*
|--------------------------------------------------------------------------
| CALENDAR DATA
|--------------------------------------------------------------------------
|
| October = 10
| November = 11
|
*/

export const CALENDAR_DATA: Record<
    number,
    Record<number, Record<string, ExamEntry[]>>
> = (() => {
    const data: Record<
        number,
        Record<number, Record<string, ExamEntry[]>>
    > = {};

    for (let year = 1; year <= 4; year++) {
        data[year] = {
            10: {},
            11: {},
        };

        TIMETABLE[year].forEach((exam) => {
            const parts = exam.date.split(".");

            if (parts.length !== 3) return;

            const month = parseInt(parts[1], 10);

            if (month !== 10 && month !== 11) return;

            const dateStr = exam.date;

            if (!data[year][month][dateStr]) {
                data[year][month][dateStr] = [];
            }

            data[year][month][dateStr].push(exam);
        });
    }

    return data;
})();


/*
|--------------------------------------------------------------------------
| CALENDAR DAYS
|--------------------------------------------------------------------------
|
| monthIndex:
| 0 = October
| 1 = November
|
*/

export const CALENDAR_DAYS: Record<
    number,
    Record<
        number,
        {
            day: number;
            dateStr: string;
            exams: ExamEntry[];
            isPast: boolean;
        }[]
    >
> = (() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const result: Record<
        number,
        Record<
            number,
            {
                day: number;
                dateStr: string;
                exams: ExamEntry[];
                isPast: boolean;
            }[]
        >
    > = {};

    for (let year = 1; year <= 4; year++) {
        result[year] = {};

        for (let monthIndex = 0; monthIndex < 2; monthIndex++) {

            // October = JavaScript month 9
            // November = JavaScript month 10
            const jsMonth = monthIndex + 9;

            // Actual calendar month number
            const calendarMonth = jsMonth + 1;

            const firstDay = new Date(
                2026,
                jsMonth,
                1
            ).getDay();

            const daysInMonth = new Date(
                2026,
                jsMonth + 1,
                0
            ).getDate();

            const days: {
                day: number;
                dateStr: string;
                exams: ExamEntry[];
                isPast: boolean;
            }[] = [];

            // Empty days before the first day of the month
            for (let i = 0; i < firstDay; i++) {
                days.push({
                    day: 0,
                    dateStr: "",
                    exams: [],
                    isPast: false,
                });
            }

            // Actual days
            for (let day = 1; day <= daysInMonth; day++) {

                const dateStr =
                    `${day.toString().padStart(2, "0")}.` +
                    `${calendarMonth.toString().padStart(2, "0")}.2026`;

                const exams =
                    CALENDAR_DATA[year][calendarMonth]?.[dateStr] || [];

                const examDate = new Date(
                    2026,
                    jsMonth,
                    day
                );

                examDate.setHours(0, 0, 0, 0);

                days.push({
                    day,
                    dateStr,
                    exams,
                    isPast: examDate < today,
                });
            }

            result[year][monthIndex] = days;
        }
    }

    return result;
})();