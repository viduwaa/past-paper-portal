/**
 * Google Apps Script: Extract Faculty of Technology paper links from Google Drive.
 *
 * Scans the "Faculty of Technology" folder recursively, extracts shareable
 * links for each PDF, and writes results to a Google Sheet.
 *
 * Folder ID for new papers: 1dT7RaOxcaAoUir5yzk8VD5cATPtuleNP
 * Folder ID for older papers: 1R0BMmzAX6b8LqTHoVu1JoOXfW9qhLfLl
 */

// ========================================
// CONFIGURATION
// ========================================
const ROOT_FOLDER_ID = '1dT7RaOxcaAoUir5yzk8VD5cATPtuleNP'; // New papers folder

// Also scan older papers folder if needed
const OLD_ROOT_FOLDER_ID = '1R0BMmzAX6b8LqTHoVu1JoOXfW9qhLfLl';

// ========================================
// Department code mapping
// ========================================
const DEPT_MAP = {
  'Bioprocess Technology': 'BPT',
  'Food Technology': 'FDT',
  'Information Communication Technology': 'ICT',
  'Information Communication Technology - ICT': 'ICT',
  'Department of Information Communication Technology': 'ICT',
  'Material Technology': 'MTT',
  'Material Technology - MTT': 'MTT',
  'Department of Material Technology': 'MTT',
  'Electrical and Electronic Technology': 'EET',
  'Complementary': 'CML',
  'Complementary - CML': 'CML',
  'Common': 'CMT',
  'Common - CMT': 'CMT',
  'Engineering Technology': 'ENT',
  'Biosystems Technology': 'BST',
};

/**
 * Main entry point — scans the folder and creates a sheet with all links.
 */
function extractPaperLinks() {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const output = [];

  console.log('Scanning folder: ' + rootFolder.getName() + ' (' + ROOT_FOLDER_ID + ')');
  console.log('Files in root: ' + rootFolder.getFiles().hasNext());

  traverseFolder(rootFolder, rootFolder.getName(), [], output);

  console.log('Total items found: ' + output.length);
  console.log('Total PDFs: ' + output.filter(r => r.file_name && r.file_name.toLowerCase().endsWith('.pdf')).length);

  // Debug: show first 10 entries
  output.slice(0, 10).forEach(r => {
    console.log('  Path: ' + r.path);
    console.log('  File: ' + r.file_name);
    console.log('---');
  });

  // Write to a Google Sheet
  const ss = SpreadsheetApp.create('FoT Past Papers - GDrive Links');
  const sheet = ss.getActiveSheet();
  sheet.setName('GDrive Links');

  // Headers
  sheet.appendRow([
    'file_name',
    'view_url',
    'preview_url',
    'direct_download_link',
    'file_id',
    'department_code',
    'department',
    'academic_year',
    'semester',
    'exam_year',
    'course_code',
    'course_name',
    'folder_path',
    'file_size',
  ]);

  for (const r of output) {
    sheet.appendRow([
      r.file_name || '',
      r.view_url || '',
      r.preview_url || '',
      r.direct_download_link || '',
      r.file_id || '',
      r.department_code || '',
      r.department || '',
      r.academic_year || '',
      r.semester || '',
      r.exam_year || '',
      r.course_code || '',
      r.course_name || '',
      r.folder_path || '',
      r.file_size || '',
    ]);
  }

  // Format
  sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= 14; c++) sheet.autoResizeColumn(c);

  console.log('Sheet created: ' + ss.getUrl());
}

/**
 * Recursively traverse a folder, extracting file metadata.
 *
 * @param {Folder} folder - current folder
 * @param {string} currentPath - path string from root
 * @param {string[]} pathComponents - ordered path components (for metadata inference)
 * @param {Object[]} output - accumulator for results
 */
function traverseFolder(folder, currentPath, pathComponents, output) {
  // List files in this folder
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    if (file.getMimeType() === MimeType.PDF) {
      // Make file shareable and extract links
      const fileId = file.getId();
      const viewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      // Infer metadata from path and filename
      const meta = parseMetadata(pathComponents, fileName);

      output.push({
        file_name: fileName,
        file_id: fileId,
        view_url: viewUrl,
        preview_url: viewUrl,
        direct_download_link: downloadUrl,
        department_code: meta.deptCode,
        department: meta.department,
        academic_year: meta.academicYear,
        semester: meta.semester,
        exam_year: meta.examYear,
        course_code: meta.courseCode,
        course_name: meta.courseName,
        folder_path: currentPath,
        file_size: file.getSize(),
      });

      console.log('Found PDF: ' + fileName);
    }
  }

  // Recurse into subfolders
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const sub = subfolders.next();
    const subPath = currentPath + '/' + sub.getName();
    const subPathComponents = [...pathComponents, sub.getName()];
    traverseFolder(sub, subPath, subPathComponents, output);
  }
}

/**
 * Parse metadata from folder path components and filename.
 *
 * Expected path: [Faculty of Technology, Department, Academic Year, Semester, Exam Year, Course Folder]
 * For shallower paths, we infer what we can from the filename.
 */
function parseMetadata(pathComponents, fileName) {
  let department = '';
  let deptCode = '';
  let academicYear = '';
  let semester = '';
  let examYear = '';
  let courseCode = '';
  let courseName = '';

  // Try to extract from path components
  // pathComponents[0] = "Faculty of Technology" (root)
  // pathComponents[1] = Department
  // pathComponents[2] = Academic Year
  // pathComponents[3] = Semester
  // pathComponents[4] = Exam Year

  if (pathComponents.length >= 2) {
    department = pathComponents[1];
    if (DEPT_MAP[department]) deptCode = DEPT_MAP[department];
  }
  if (pathComponents.length >= 3) {
    academicYear = pathComponents[2];
  }
  if (pathComponents.length >= 4) {
    semester = pathComponents[3];
  }
  if (pathComponents.length >= 5) {
    examYear = pathComponents[4];
  }

  // Parse course code and name from filename
  const baseName = fileName.replace(/\.pdf$/i, '');
  // Match patterns like "ICT- 2303", "BPT 2203", "ICT 3310", "MTT 2207 - ..."
  const codeMatch = baseName.match(/^([A-Z]{2,4}[-\s]*\d+(?:\s*\/\s*[A-Z]{2,4}\s*\d+)*)[\s-]*(.*)/);
  if (codeMatch) {
    courseCode = codeMatch[1].replace(/\s+/g, ' ').trim();
    courseName = codeMatch[2].trim();
  } else {
    courseName = baseName;
  }

  // If deptCode not found from department name, try filename prefix
  if (!deptCode && courseCode) {
    const prefixMatch = courseCode.match(/^([A-Z]{2,4})/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      // Search DEPT_MAP values
      for (const [name, code] of Object.entries(DEPT_MAP)) {
        if (code === prefix) {
          deptCode = code;
          if (!department) department = name;
          break;
        }
      }
    }
  }

  // If academic year is still missing, try to infer from "Year" keyword
  if (!academicYear && department) {
    // Check if any path component looks like "First Year", "Second Year", etc.
    for (let i = 1; i < pathComponents.length; i++) {
      if (pathComponents[i].match(/Year/i)) {
        academicYear = pathComponents[i];
        break;
      }
    }
  }

  return { department, deptCode, academicYear, semester, examYear, courseCode, courseName };
}

/**
 * Also scan the older papers folder and append results.
 */
function extractAllPaperLinks() {
  const output = [];

  // Scan new papers folder
  const newFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  traverseFolder(newFolder, newFolder.getName(), [], output);

  // Scan older papers folder
  try {
    const oldFolder = DriveApp.getFolderById(OLD_ROOT_FOLDER_ID);
    traverseFolder(oldFolder, oldFolder.getName(), [], output);
  } catch (e) {
    console.log('Old folder not accessible: ' + e.toString());
  }

  console.log('Total items across all folders: ' + output.length);

  // Build the sheet
  const ss = SpreadsheetApp.create('FoT Past Papers - All GDrive Links');
  const sheet = ss.getActiveSheet();
  sheet.setName('GDrive Links');

  sheet.appendRow([
    'file_name', 'view_url', 'preview_url', 'direct_download_link', 'file_id',
    'department_code', 'department', 'academic_year', 'semester', 'exam_year',
    'course_code', 'course_name', 'folder_path', 'file_size',
  ]);

  for (const r of output) {
    sheet.appendRow([
      r.file_name || '',
      r.view_url || '',
      r.preview_url || '',
      r.direct_download_link || '',
      r.file_id || '',
      r.department_code || '',
      r.department || '',
      r.academic_year || '',
      r.semester || '',
      r.exam_year || '',
      r.course_code || '',
      r.course_name || '',
      r.folder_path || '',
      r.file_size || '',
    ]);
  }

  sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= 14; c++) sheet.autoResizeColumn(c);

  console.log('Sheet created: ' + ss.getUrl());
  console.log('Total rows: ' + output.length);
}
