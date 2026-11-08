import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface CertificateData {
  certificateNo: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: Date;
}

export const generateCertificatePDF = (data: CertificateData, res: Response) => {
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margin: 40,
  });

  // Stream directly to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=SkillUp_Certificate_${data.certificateNo}.pdf`
  );

  doc.pipe(res);

  // Border & Accents
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .lineWidth(3)
    .strokeColor('#4f46e5')
    .stroke();

  doc.rect(26, 26, doc.page.width - 52, doc.page.height - 52)
    .lineWidth(1)
    .strokeColor('#c4b5fd')
    .stroke();

  // Header
  doc.moveDown(2);
  doc.fontSize(28)
    .font('Helvetica-Bold')
    .fillColor('#1e1b4b')
    .text('SKILLUP PLATFORM', { align: 'center', characterSpacing: 2 });

  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#6366f1')
    .text('ACCREDITED CERTIFICATE OF COMPLETION', { align: 'center', characterSpacing: 1.5 });

  doc.moveDown(2);
  doc.fontSize(14)
    .fillColor('#64748b')
    .text('This is to certify that', { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#1e1b4b')
    .text(data.studentName, { align: 'center', underline: true });

  doc.moveDown(0.8);
  doc.fontSize(14)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('has successfully completed the comprehensive curriculum and capstone assessments for', { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#4338ca')
    .text(data.courseTitle, { align: 'center' });

  doc.moveDown(2.5);

  // Signatures and Metadata footer
  const leftX = 80;
  const rightX = doc.page.width - 260;
  const bottomY = doc.page.height - 120;

  // Instructor
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1e1b4b')
    .text(data.instructorName, leftX, bottomY);
  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Lead Instructor / Domain Specialist', leftX, bottomY + 15);

  // Verification
  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(`Issue Date: ${new Date(data.issuedAt).toLocaleDateString()}`, rightX, bottomY);
  doc.fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#4f46e5')
    .text(`Verification ID: ${data.certificateNo}`, rightX, bottomY + 15);

  doc.end();
};
