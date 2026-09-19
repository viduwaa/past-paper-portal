/**
 * Google Apps Script: Extract Faculty of Technology paper links from Google Drive.
 *
 * Scans the "Faculty of Technology" folder recursively, extracts shareable
 * links for each PDF, and writes a mapping to a Google Sheet for database import.
 *
 * Folder ID: 1dT7RaOxcaAoUir5yzk8VD5cATPtuleNP
 *
 * Usage:
 *   1. Open a Google Sheet → Extensions → Apps Script
 *   2. Paste this code
 *   3. Run main() and authorize
 *   4. Check "GDrive Links" sheet for results
 *   5. Check Logs (View → Logs) for debug output
 */

const FACULTY_ROOT_FOLDER_ID = '1dT7RaOxcaAoUir5yzk8VD5cATPtuleNP';

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

function main() {
  const folder = DriveApp.getFolderById(FACULTY_ROOT_FOLDER_ID);
  const results = [];
  const folderPaths = [];

  console.log('=== FoT Paper Link Extractor ===');
  console.log('Root folder: ' + folder.getName() + ' (' + FACULTY_ROOT_FOLDER_ID + ')');

  // Recursively scan all subfolders for PDFs
  scanFolderRecursive(folder, [], folderPaths, results);

  console.log('Total subfolders traversed: ' + folderPaths.length);
  console.log('Total PDFs found: ' + results.length);

  // List all subfolders (for debugging)
  if (folderPaths.length > 0) {
    console.log('--- Folder structure ---');
    // Show first 50 paths
    const toShow = folderPaths.slice(0, 50);
    toShow.forEach(p => console.log('  ' + p.join(' / ')));
    if (folderPaths.length > 50) {
      console.log('  ... and ' + (folderPaths.length - 50) + ' more');
    }
  }

  writeResultsToSheet(results);
  console.log('Done! Sheet URL: ' + SpreadsheetApp.getActive().getUrl());
}

/**
 * Recursively scan folders for PDF files.
 * Tracks the full path from root for metadata inference.
 */
function scanFolderRecursive(folder, pathComponents, folderPaths, results) {
  const currentName = folder.getName();
  const currentPath = [...pathComponents, currentName];
  folderPaths.push(currentPath);

  console.log('Scanning: ' + currentPath.join(' / '));

  // Process files
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.PDF) {
      const fileId = file.getId();
      const fileName = file.getName();
      const fileSize = file.getSize();

      // Make shareable
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
      const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;

      // Parse metadata from path and filename
      const meta = parseMetadata(currentPath, fileName);

      results.push({
        file_name: fileName,
        file_id: fileId,
        view_url: viewUrl,
        preview_url: viewUrl,
        direct_download_link: downloadUrl,
        department_code: meta.deptCode || '',
        department: meta.department || '',
        academic_year: meta.academicYear || '',
        semester: meta.semester || '',
        exam_year: meta.examYear || '',
        course_code: meta.courseCode || '',
        course_name: meta.courseName || '',
        faculty: 'Faculty of Technology',
        file_size: fileSize,
        folder_path: currentPath.join(' / '),
      });

      console.log('  ✓ PDF: ' + fileName + ' → ' + viewUrl.substring(0, 60) + '...');
    }
  }

  // Recurse into subfolders
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    const sub = subFolders.next();
    scanFolderRecursive(sub, currentPath, folderPaths, results);
  }
}

/**
 * Parse metadata from the folder path and filename.
 * Expected path: [Faculty of Technology, Department, Academic Year, Semester, Exam Year, Course Folder]
 */
function parseMetadata(pathComponents, fileName) {
  let department = '';
  let deptCode = '';
  let academicYear = '';
  let semester = '';
  let examYear = '';
  let courseCode = '';
  let courseName = '';

  // Try to identify components by name pattern
  for (let i = 0; i < pathComponents.length; i++) {
    const name = pathComponents[i];

    // Skip the root "Faculty of Technology"
    if (name === 'Faculty of Technology') continue;

    // Check if this is a known department
    if (DEPT_MAP[name]) {
      department = name;
      deptCode = DEPT_MAP[name];
      continue;
    }

    // Check for academic year: "First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year"
    if (name.match(/Year$/i)) {
      academicYear = name;
      continue;
    }

    // Check for semester
    if (name.match(/Semester/i)) {
      semester = name;
      continue;
    }

    // Check for exam year (4-digit number)
    if (name.match(/^\d{4}$/)) {
      examYear = name;
      continue;
    }
  }

  // Parse course code and name from filename
  const baseName = fileName.replace(/\.pdf$/i, '');
  // Match: "ICT- 2303 Name" or "BPT 2201 Name" or "ICT 3310 Name"
  const codeMatch = baseName.match(/^([A-Z]{2,4}[-\s]*\d+(?:\s*\/\s*[A-Z]{2,4}\s*\d+)*)[\s-]*(.*)/);
  if (codeMatch) {
    courseCode = codeMatch[1].replace(/\s+/g, ' ').trim();
    courseName = codeMatch[2].trim();
  } else {
    courseName = baseName;
  }

  // If deptCode not found from path, try filename prefix
  if (!deptCode && courseCode) {
    const prefixMatch = courseCode.match(/^([A-Z]{2,4})/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      for (const [name, code] of Object.entries(DEPT_MAP)) {
        if (code === prefix) {
          deptCode = code;
          if (!department) department = name;
          break;
        }
      }
    }
  }

  return { department, deptCode, academicYear, semester, examYear, courseCode, courseName };
}

function writeResultsToSheet(results) {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('No active spreadsheet');
  } catch (e) {
    ss = SpreadsheetApp.create('FoT Past Papers - GDrive Links');
  }

  const sheetName = 'GDrive Links';
  try {
    const existing = ss.getSheetByName(sheetName);
    if (existing) ss.deleteSheet(existing);
  } catch (e) {}

  const sheet = ss.insertSheet(sheetName);

  const headers = [
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
    'faculty',
    'file_size',
    'folder_path',
  ];

  sheet.appendRow(headers);

  for (const r of results) {
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
      r.faculty || '',
      r.file_size || '',
      r.folder_path || '',
    ]);
  }

  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= headers.length; c++) sheet.autoResizeColumn(c);

  console.log('Results written to "' + sheetName + '": ' + results.length + ' rows');
}
