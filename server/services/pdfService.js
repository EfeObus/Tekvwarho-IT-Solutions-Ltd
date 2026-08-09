/**
 * PDF Generation Service
 * Uses pdfkit (pure JS, no headless browser) to keep the container light.
 * Shared branded letterhead (logo + blue header/footer) used by paystubs,
 * contracts, and the standalone letterhead generator.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BRAND_BLUE = '#0066CC';
const BRAND_BLUE_DARK = '#004C99';
const DARK = '#1A2233';
const GRAY = '#636E72';
const LIGHT = '#F5F6FA';

const LOGO_PATH = path.join(__dirname, '../../img/tekvwa-logo.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function formatNaira(amount) {
    const n = Number(amount) || 0;
    return 'NGN ' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Branded letterhead header: a blue gradient band with the real logo and
 * company address block, plus the document title. Shared across every
 * generated document so they all look like they came from the same place.
 */
function drawHeader(doc, title) {
    const bandHeight = 108;
    const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
    gradient.stop(0, BRAND_BLUE).stop(1, BRAND_BLUE_DARK);
    doc.rect(0, 0, doc.page.width, bandHeight).fill(gradient);

    if (HAS_LOGO) {
        doc.image(LOGO_PATH, 50, 24, { height: 42 });
    }

    const textX = HAS_LOGO ? 50 : 50;
    const textY = HAS_LOGO ? 74 : 30;
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica')
        .text('Ughelli, Delta State, Nigeria  •  RC 9748441  •  info@tekvwa.org', textX, textY, { width: doc.page.width - 100 });

    doc.fontSize(15).font('Helvetica-Bold')
        .text(title, 50, 32, { width: doc.page.width - 100, align: 'right' });

    doc.fillColor(DARK).font('Helvetica');
    doc.y = bandHeight + 24;
}

/**
 * Branded footer: a thin blue accent bar plus confidentiality note.
 */
function drawFooter(doc, confidentialNote) {
    const barHeight = 6;
    doc.rect(0, doc.page.height - barHeight, doc.page.width, barHeight).fill(BRAND_BLUE);

    // Positioned inside the page's bottom margin with room for the text's
    // own line height, so it doesn't trigger an automatic page break.
    const bottom = doc.page.height - 26;
    doc.fontSize(8).fillColor(GRAY)
        .text(confidentialNote, 50, bottom, { width: doc.page.width - 100, align: 'center', lineBreak: false });
}

// NOTE: pdfkit's .text() always advances doc.y to just below the text it
// draws, *even when called with explicit x/y coordinates*. Every helper
// below takes an explicit `y` and never reads doc.y for layout - callers
// track their own cursor and only ever use doc.y for the y they pass in,
// otherwise spacing silently compounds (each auto-advance stacks on top of
// the caller's own manual increment).
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
            drawHeader(doc, `Payslip — ${periodLabel}`);
            let y = doc.y;

            // Employee info block
            const colWidth = (doc.page.width - 100) / 2;
            labelValueRow(doc, 50, y, 'Employee', staff.name, colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Department', staff.department || '—', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Role', (staff.role || '').charAt(0).toUpperCase() + (staff.role || '').slice(1), colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Pay Period', periodLabel, colWidth);
            y += 40;

            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E3E7ED').stroke();
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

            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E3E7ED').stroke();
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

            drawFooter(doc, `Generated ${new Date(paystub.generated_at || Date.now()).toLocaleDateString('en-GB')}. This document is confidential and intended solely for ${staff.name}.`);

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

            drawHeader(doc, 'Employment Contract');
            let y = doc.y;

            doc.fontSize(10).fillColor(GRAY)
                .text(`Issued: ${new Date(contract.generated_at || Date.now()).toLocaleDateString('en-GB')}`, 50, y);
            y += 30;

            const colWidth = (doc.page.width - 100) / 2;
            labelValueRow(doc, 50, y, 'Employee', staff.name, colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Department', contract.department || '—', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Job Title', contract.job_title, colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Start Date', contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : '—', colWidth);
            y += 40;
            labelValueRow(doc, 50, y, 'Monthly Basic Salary', formatNaira(contract.basic_salary), colWidth);
            labelValueRow(doc, 50 + colWidth, y, 'Monthly Gross Salary', formatNaira(contract.gross_salary), colWidth);
            y += 45;

            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E3E7ED').stroke();
            y += 20;

            doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK).text('Job Description & Responsibilities', 50, y);
            y += 20;
            const jobDescription = contract.job_description || 'To be discussed with your manager.';
            doc.fontSize(10).font('Helvetica').fillColor(DARK)
                .text(jobDescription, 50, y, { width: doc.page.width - 100, align: 'left' });
            y += doc.heightOfString(jobDescription, { width: doc.page.width - 100 }) + 25;

            doc.fontSize(12).font('Helvetica-Bold').text('Allowances', 50, y);
            y += 20;
            const allowances = [
                ['Housing Allowance', contract.housing_allowance],
                ['Transport Allowance', contract.transport_allowance],
                ['Utility Allowance', contract.utility_allowance],
                ['Meal / Entertainment Allowance', contract.meal_allowance]
            ];
            allowances.forEach(([label, value]) => {
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, y, { width: 300 });
                doc.text(formatNaira(value), 350, y, { width: doc.page.width - 400, align: 'right' });
                y += 18;
            });
            y += 15;

            doc.fontSize(12).font('Helvetica-Bold').text('Terms', 50, y);
            y += 20;
            const termsText = 'This role is subject to Tekvwa IT Solutions Ltd\'s Employee Handbook and Code of Conduct, ' +
                'available in the staff dashboard. Employment terms (working hours, leave, termination) follow ' +
                'the Nigerian Labour Act. This letter confirms the role, compensation, and start date agreed ' +
                'between Tekvwa IT Solutions Ltd and the employee named above.';
            doc.fontSize(10).font('Helvetica').fillColor(DARK).text(termsText, 50, y, { width: doc.page.width - 100 });
            y += doc.heightOfString(termsText, { width: doc.page.width - 100 }) + 50;

            doc.fontSize(10).fillColor(DARK).text('_______________________', 50, y);
            doc.text('_______________________', 50 + colWidth, y);
            y += 15;
            doc.fontSize(9).fillColor(GRAY).text('For Tekvwa IT Solutions Ltd', 50, y);
            doc.text('Employee Signature', 50 + colWidth, y);

            drawFooter(doc, `This document is confidential and intended solely for ${staff.name}.`);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePaystubPDF, generateContractPDF, formatNaira };
