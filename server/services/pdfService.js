/**
 * PDF Generation Service
 * Uses pdfkit (pure JS, no headless browser) to keep the container light.
 * Shared branded letterhead (logo + brand block + contact info + doc-ref
 * metadata + footer) used by paystubs, contracts, and the standalone
 * letterhead generator, so every generated document looks consistent.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BRAND_BLUE = '#0066CC';
const BRAND_BLUE_DARK = '#004C99';
const BADGE_BG = '#EAF2FF';
const BADGE_BORDER = '#BFDBFE';
const DARK = '#1A2233';
const GRAY = '#636E72';
const MUTED = '#94A3B8';
const LIGHT = '#F5F6FA';
const BORDER = '#E3E7ED';

const LOGO_PATH = path.join(__dirname, '../../img/tekvwa-icon.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const MARGIN = 50;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function formatNaira(amount) {
    const n = Number(amount) || 0;
    return 'NGN ' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// NOTE: pdfkit's .text() always advances doc.y to just below the text it
// draws, *even when called with explicit x/y coordinates*. Every helper
// below takes an explicit `y` and never reads doc.y for layout - callers
// track their own cursor and only ever assign doc.y once, right before
// handing off, otherwise spacing silently compounds (each auto-advance
// stacks on top of the caller's own manual increment).

/**
 * Branded letterhead header: logo + brand name/RC badge (left), contact
 * block (right), a double accent rule, then a Date / Document Ref
 * metadata row. Returns the y position where document-specific content
 * should start.
 */
function drawHeader(doc, docRef, date) {
    const contentWidth = doc.page.width - MARGIN * 2;
    let y = 40;

    if (HAS_LOGO) {
        doc.image(LOGO_PATH, MARGIN, y - 6, { height: 46 });
    }
    const brandX = HAS_LOGO ? MARGIN + 96 : MARGIN;

    doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(19).text('TEKVWA', brandX, y);
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(8.5).text('IT SOLUTIONS LTD', brandX, y + 22, { characterSpacing: 1 });

    const badgeY = y + 36;
    doc.roundedRect(brandX, badgeY, 76, 16, 3).fillColor(BADGE_BG).fill();
    doc.roundedRect(brandX, badgeY, 76, 16, 3).lineWidth(1).strokeColor(BADGE_BORDER).stroke();
    doc.fillColor(BRAND_BLUE_DARK).font('Helvetica-Bold').fontSize(7.5).text('RC 9748441', brandX + 10, badgeY + 4.5);

    // Right-aligned contact block
    const contactLines = [
        'Ughelli, Delta State, Nigeria',
        'e: info@tekvwa.org',
        'w: www.tekvwa.org',
        'p: +234 906 577 9323'
    ];
    let cy = y - 2;
    contactLines.forEach(line => {
        doc.fillColor(GRAY).font('Helvetica').fontSize(8.5)
            .text(line, MARGIN, cy, { width: contentWidth, align: 'right' });
        cy += 13;
    });

    // Double accent rule
    const lineY = y + 62;
    doc.moveTo(MARGIN, lineY).lineTo(MARGIN + contentWidth, lineY).lineWidth(2.5).strokeColor(BRAND_BLUE).stroke();
    doc.moveTo(MARGIN, lineY + 4).lineTo(MARGIN + contentWidth, lineY + 4).lineWidth(1).strokeColor(BADGE_BORDER).stroke();

    y = lineY + 26;

    // Metadata row: Date (left) / Document Ref (right)
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('DATE', MARGIN, y);
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('DOCUMENT REF', MARGIN, y, { width: contentWidth, align: 'right' });
    y += 13;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
        .text(new Date(date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), MARGIN, y);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
        .text(docRef.toUpperCase(), MARGIN, y, { width: contentWidth, align: 'right' });
    y += 26;

    doc.fillColor(DARK).font('Helvetica');
    return y;
}

/**
 * Branded footer: a top divider and a three-column grid (Head Office /
 * Online & Inquiries / Corporate Entity), with an optional confidentiality
 * line above it for documents carrying personal data.
 */
function drawFooter(doc, confidentialNote) {
    const contentWidth = doc.page.width - MARGIN * 2;
    const colWidth = contentWidth / 3;
    let footerY = doc.page.height - 70;

    if (confidentialNote) {
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(MUTED)
            .text(confidentialNote, MARGIN, footerY - 14, { width: contentWidth, align: 'center', lineBreak: false });
    }

    doc.moveTo(MARGIN, footerY).lineTo(MARGIN + contentWidth, footerY).lineWidth(1).strokeColor(BORDER).stroke();

    const columns = [
        ['HEAD OFFICE', 'Ughelli, Delta State, Nigeria'],
        ['ONLINE & INQUIRIES', 'info@tekvwa.org  |  www.tekvwa.org'],
        ['CORPORATE ENTITY', 'Tekvwa IT Solutions Ltd (RC 9748441)']
    ];
    columns.forEach(([label, value], i) => {
        const cx = MARGIN + i * colWidth;
        doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(7).text(label, cx, footerY + 12, { width: colWidth - 10 });
        doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(value, cx, footerY + 24, { width: colWidth - 10, lineBreak: false });
    });
}

function labelValueRow(doc, x, y, label, value, width) {
    doc.fontSize(9).fillColor(GRAY).text(label, x, y, { width });
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(value, x, y + 13, { width });
    doc.font('Helvetica');
}

/**
 * Generate a monthly paystub PDF. Returns a Buffer.
 */
function generatePaystubPDF(paystub, staff) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 15, left: 50, right: 50 } });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const periodLabel = `${MONTH_NAMES[paystub.pay_period_month - 1]} ${paystub.pay_period_year}`;
            let y = drawHeader(doc, 'Payslip', paystub.generated_at);

            // Employee info block
            const colWidth = (doc.page.width - 100) / 2;
            labelValueRow(doc, 50, y, 'Employee', staff.name, colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Department', staff.department || '—', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Role', (staff.role || '').charAt(0).toUpperCase() + (staff.role || '').slice(1), colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Pay Period', periodLabel, colWidth);
            y += 40;

            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(BORDER).stroke();
            y += 20;

            // Earnings table
            doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text('Earnings', 50, y);
            y += 20;

            const earnings = [
                ['Basic Salary', paystub.basic_salary],
                ['Housing Allowance', paystub.housing_allowance],
                ['Transport Allowance', paystub.transport_allowance],
                ['Utility Allowance', paystub.utility_allowance],
                ['Meal / Entertainment Allowance', paystub.meal_allowance]
            ];

            earnings.forEach(([label, value]) => {
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, y, { width: 300 });
                doc.text(formatNaira(value), 350, y, { width: doc.page.width - 400, align: 'right' });
                y += 20;
            });

            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(BORDER).stroke();
            y += 10;
            doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text('Gross Pay', 50, y, { width: 300 });
            doc.text(formatNaira(paystub.gross_pay), 350, y, { width: doc.page.width - 400, align: 'right' });
            y += 30;

            // Deductions
            doc.fontSize(12).font('Helvetica-Bold').text('Deductions', 50, y);
            y += 20;

            const deductionRows = [
                [`PAYE Tax (after CRA of ${formatNaira(paystub.cra_amount)})`, paystub.paye_tax],
                ['Development Levy (DBIR)', paystub.development_levy]
            ];
            if (parseFloat(paystub.deductions) > 0) {
                deductionRows.push([paystub.deductions_note || 'Other Deductions', paystub.deductions]);
            }

            deductionRows.forEach(([label, value]) => {
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, y, { width: 320 });
                doc.text('-' + formatNaira(value), 370, y, { width: doc.page.width - 420, align: 'right' });
                y += 20;
            });
            y += 10;

            // Net pay - highlighted
            doc.rect(50, y, doc.page.width - 100, 44).fill(LIGHT);
            doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND_BLUE)
                .text('Net Pay', 66, y + 14);
            doc.fontSize(15).text(formatNaira(paystub.net_pay), 50, y + 12, { width: doc.page.width - 116, align: 'right' });

            drawFooter(doc, `This document is confidential and intended solely for ${staff.name}.`);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate an employment contract PDF. Returns a Buffer.
 */
function generateContractPDF(contract, staff) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 15, left: 50, right: 50 } });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const contentWidth = doc.page.width - 100;
            const colWidth = contentWidth / 2;

            // A full offer letter runs longer than a page - unlike the other
            // generators in this file, this one needs real pagination.
            // ensureSpace() breaks to a fresh page (no re-drawn header/footer
            // - those are page-1/last-page only, standard for a continued
            // formal letter) whenever the next block would run into the
            // footer zone.
            const ensureSpace = (yPos, needed) => {
                if (yPos + needed > doc.page.height - 90) {
                    doc.addPage();
                    return 50;
                }
                return yPos;
            };

            const heading = (yPos, text) => {
                yPos = ensureSpace(yPos, 40);
                doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE).text(text, 50, yPos);
                doc.moveTo(50, yPos + 20).lineTo(50 + contentWidth, yPos + 20).lineWidth(0.75).strokeColor(BORDER).stroke();
                return yPos + 32;
            };

            const paragraph = (yPos, text, opts = {}) => {
                const h = doc.heightOfString(text, { width: contentWidth, ...opts });
                yPos = ensureSpace(yPos, h + 10);
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(text, 50, yPos, { width: contentWidth, ...opts });
                return yPos + h + 14;
            };

            let y = drawHeader(doc, 'Employment Offer Letter', contract.generated_at);

            // Recipient + subject
            y = ensureSpace(y, 90);
            doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('TO', 50, y);
            y += 13;
            doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(staff.name, 50, y);
            y += 15;
            doc.fillColor(GRAY).font('Helvetica').fontSize(9.5).text(staff.email, 50, y);
            y += 26;

            const subject = `Re: Offer of Employment - ${contract.job_title}`;
            doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(subject, 50, y, { width: contentWidth });
            y += doc.heightOfString(subject, { width: contentWidth, fontSize: 11 }) + 20;

            const firstName = (staff.name || '').trim().split(/\s+/)[0] || 'there';
            y = paragraph(y, `Dear ${firstName},`);
            y = paragraph(y, `On behalf of Tekvwa IT Solutions Ltd (the "Company"), I am pleased to offer you the ` +
                `position of ${contract.job_title}. We were impressed with your background and believe your ` +
                `skills will be a valuable addition to our team. The terms and conditions of your employment ` +
                `are outlined below.`);

            // 1. Position & Scope of Work
            y = heading(y, '1. Position & Scope of Work');
            y = ensureSpace(y, 120);
            labelValueRow(doc, 50, y, 'Job Title', contract.job_title, colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Department', contract.department || '—', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Reporting To', contract.reporting_to || 'To be advised', colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Employment Status', contract.employment_status || 'Full-Time', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Start Date', contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : 'To be confirmed', colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Offer Expires', contract.offer_expiration_date ? new Date(contract.offer_expiration_date).toLocaleDateString('en-GB') : '—', colWidth);
            y += 46;

            y = paragraph(y, 'Key Responsibilities:', { continued: false });
            y = paragraph(y, contract.job_description || 'To be discussed with your manager.');

            // 2. Compensation & Benefits
            y = heading(y, '2. Compensation & Benefits');
            y = ensureSpace(y, 30);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Monthly Basic Salary', 50, y, { width: 300 });
            doc.text(formatNaira(contract.basic_salary), 350, y, { width: contentWidth - 300, align: 'right' });
            y += 22;

            const allowances = [
                ['Housing Allowance', contract.housing_allowance],
                ['Transport Allowance', contract.transport_allowance],
                ['Utility Allowance', contract.utility_allowance],
                ['Meal / Entertainment Allowance', contract.meal_allowance]
            ];
            allowances.forEach(([label, value]) => {
                y = ensureSpace(y, 18);
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, y, { width: 300 });
                doc.text(formatNaira(value), 350, y, { width: contentWidth - 300, align: 'right' });
                y += 18;
            });
            y = ensureSpace(y, 34);
            doc.moveTo(50, y).lineTo(50 + contentWidth, y).strokeColor(BORDER).stroke();
            y += 10;
            doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND_BLUE).text('Monthly Gross Salary', 50, y, { width: 300 });
            doc.text(formatNaira(contract.gross_salary), 350, y, { width: contentWidth - 300, align: 'right' });
            y += 28;

            y = paragraph(y, 'Salary is payable in accordance with the Company\'s regular payroll schedule. ' +
                'You will be assigned a corporate email account and granted role-specific system permissions ' +
                'upon onboarding.');

            // 3. Leave & Vacation Policy
            y = heading(y, '3. Leave & Vacation Policy');
            y = paragraph(y, `Paid Time Off (PTO): You will be entitled to ${contract.pto_days || 15} days of ` +
                `paid vacation per calendar year, accrued on a pro-rata basis.`);
            y = paragraph(y, 'Statutory & Sick Leave: You are entitled to paid sick leave and official public ' +
                'holidays in accordance with standard company policy and the Nigerian Labour Act.');

            // 4. Termination & Resignation Terms
            y = heading(y, '4. Termination & Resignation Terms');
            y = paragraph(y, `Probationary Period: Your employment is subject to an initial probationary period ` +
                `of ${contract.probation_period || '3 months'} from your start date.`);
            y = paragraph(y, `Resignation Notice: Should you wish to resign, you are required to provide the ` +
                `Company with a minimum of ${contract.resignation_notice || '2 weeks'} written notice.`);
            y = paragraph(y, `Termination Notice: The Company reserves the right to terminate employment at any ` +
                `time with or without cause by providing ${contract.termination_notice || '2 weeks'} notice or ` +
                `pay in lieu of notice, or immediately in cases of gross misconduct.`);

            // 5. Confidentiality & Intellectual Property
            y = heading(y, '5. Confidentiality & Intellectual Property');
            y = paragraph(y, 'During and after your employment, you agree to maintain strict confidentiality ' +
                'regarding all proprietary information, software code, customer data, and trade secrets of ' +
                'Tekvwa IT Solutions Ltd. All work products created during your employment remain the exclusive ' +
                'property of the Company.');

            // 6. Acceptance
            y = heading(y, '6. Acceptance');
            if (contract.accepted_at) {
                y = ensureSpace(y, 70);
                doc.roundedRect(50, y, contentWidth, 56, 4).fillColor(BADGE_BG).fill();
                doc.fillColor(BRAND_BLUE_DARK).font('Helvetica-Bold').fontSize(10).text('ELECTRONICALLY ACCEPTED', 64, y + 10);
                doc.fillColor(DARK).font('Helvetica').fontSize(9)
                    .text(`Accepted by ${contract.accepted_signature_name} on ${new Date(contract.accepted_at).toLocaleString('en-GB')}`, 64, y + 26, { width: contentWidth - 28 });
                doc.fillColor(GRAY).fontSize(8).text(`IP address: ${contract.accepted_ip || '—'}`, 64, y + 40);
                y += 70;
            } else {
                y = paragraph(y, `This offer is contingent upon successful completion of onboarding ` +
                    `verification. To accept, please use the secure link emailed to you at ${staff.email}` +
                    `${contract.offer_expiration_date ? ` before ${new Date(contract.offer_expiration_date).toLocaleDateString('en-GB')}` : ''}.`);
            }

            y = ensureSpace(y, 75) + 20;
            doc.fontSize(10).fillColor(DARK).text('_______________________', 50, y);
            y += 15;
            doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5).text(contract.sender_name || 'Authorized Signatory', 50, y);
            y += 13;
            if (contract.sender_title) {
                doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(9).text(contract.sender_title, 50, y);
                y += 12;
            }
            doc.fillColor(GRAY).font('Helvetica').fontSize(9).text('For Tekvwa IT Solutions Ltd', 50, y);

            drawFooter(doc, `This document is confidential and intended solely for ${staff.name}.`);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate a general company letterhead PDF: recipient, subject box,
 * salutation, free-text body, and a signed-off closing. Returns a Buffer.
 */
function generateLetterheadPDF({ subject, recipient, date, body, signatureName, signatureTitle }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 15, left: 50, right: 50 } });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('error', reject);
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const contentWidth = doc.page.width - 100;
            let y = drawHeader(doc, 'Official Correspondence', date);
            y += 10;

            if (recipient) {
                doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('TO', 50, y);
                y += 13;
                doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(recipient, 50, y, { width: contentWidth });
                y += doc.heightOfString(recipient, { width: contentWidth, fontSize: 11 }) + 20;
            }

            if (subject) {
                doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(`Re: ${subject}`, 50, y, { width: contentWidth });
                y += doc.heightOfString(`Re: ${subject}`, { width: contentWidth, fontSize: 11 }) + 22;
            }

            const salutation = recipient ? `Dear ${recipient.split(/[,\n]/)[0].trim()},` : 'To Whom It May Concern,';
            doc.fillColor(DARK).font('Helvetica').fontSize(10.5).text(salutation, 50, y, { width: contentWidth });
            y += doc.heightOfString(salutation, { width: contentWidth, fontSize: 10.5 }) + 18;

            doc.fontSize(10.5).font('Helvetica').fillColor(DARK).text(body || '', 50, y, { width: contentWidth, lineGap: 3 });
            y += doc.heightOfString(body || '', { width: contentWidth, fontSize: 10.5, lineGap: 3 }) + 30;

            if (signatureName) {
                doc.fillColor(DARK).font('Helvetica').fontSize(10.5).text('Sincerely,', 50, y);
                y += 60;
                doc.moveTo(50, y).lineTo(50 + 220, y).lineWidth(1).strokeColor(BORDER).stroke();
                y += 12;
                doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(signatureName, 50, y);
                y += 15;
                if (signatureTitle) {
                    doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(9.5).text(signatureTitle, 50, y);
                    y += 13;
                }
                doc.fillColor(GRAY).font('Helvetica').fontSize(9).text('Tekvwa IT Solutions Ltd', 50, y);
            }

            drawFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePaystubPDF, generateContractPDF, generateLetterheadPDF, formatNaira };
