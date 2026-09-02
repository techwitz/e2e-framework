import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateSheets() {
  // 1. enrollment-rules.xlsx
  const enrollmentWb = new ExcelJS.Workbook();
  const enrollmentSheet = enrollmentWb.addWorksheet('EnrollmentMatrix');
  enrollmentSheet.columns = [
    { header: 'courseCode', key: 'courseCode', width: 15 },
    { header: 'title', key: 'title', width: 35 },
    { header: 'targetRole', key: 'targetRole', width: 20 },
    { header: 'requiresApproval', key: 'requiresApproval', width: 18 },
    { header: 'expectedStatus', key: 'expectedStatus', width: 18 },
  ];
  // Real ENROLLMENT_STATUS enum (frontend/packages/api-client/src/index.ts) has no
  // 'AUTO_ENROLLED' value — the non-approval branch resolves to 'ENROLLED'.
  enrollmentSheet.addRow({
    courseCode: 'CRS-JAVA-001',
    title: 'Spring Boot 4 Architecture & Design',
    targetRole: 'LEARNER',
    requiresApproval: 'false',
    expectedStatus: 'ENROLLED',
  });
  enrollmentSheet.addRow({
    courseCode: 'CRS-REACT-002',
    title: 'Advanced React 19 Patterns',
    targetRole: 'LEARNER',
    requiresApproval: 'false',
    expectedStatus: 'ENROLLED',
  });
  enrollmentSheet.addRow({
    courseCode: 'CRS-EXEC-003',
    title: 'Executive Leadership Strategy',
    targetRole: 'LEARNER',
    requiresApproval: 'true',
    expectedStatus: 'PENDING_APPROVAL',
  });

  const enrollmentPath = path.resolve(__dirname, 'courses/enrollment-rules.xlsx');
  await enrollmentWb.xlsx.writeFile(enrollmentPath);
  console.log(`Generated: ${enrollmentPath}`);

  // 2. skill-gap-matrix.xlsx
  const skillWb = new ExcelJS.Workbook();
  const skillSheet = skillWb.addWorksheet('SkillGapData');
  skillSheet.columns = [
    { header: 'userCode', key: 'userCode', width: 15 },
    { header: 'targetRole', key: 'targetRole', width: 25 },
    { header: 'skillCode', key: 'skillCode', width: 15 },
    { header: 'skillName', key: 'skillName', width: 30 },
    { header: 'currentLevel', key: 'currentLevel', width: 15 },
    { header: 'requiredLevel', key: 'requiredLevel', width: 15 },
  ];
  skillSheet.addRow({
    userCode: 'USR-E2E-LEARNER',
    targetRole: 'Senior Principal Architect',
    skillCode: 'SKL-ARCH-01',
    skillName: 'Reactive Distributed Systems',
    currentLevel: 3,
    requiredLevel: 5,
  });
  skillSheet.addRow({
    userCode: 'USR-E2E-LEARNER',
    targetRole: 'Senior Principal Architect',
    skillCode: 'SKL-SEC-02',
    skillName: 'Zero Trust & Envelope Encryption',
    currentLevel: 2,
    requiredLevel: 4,
  });

  const skillPath = path.resolve(__dirname, 'skills/skill-gap-matrix.xlsx');
  await skillWb.xlsx.writeFile(skillPath);
  console.log(`Generated: ${skillPath}`);
}

generateSheets().catch(console.error);
