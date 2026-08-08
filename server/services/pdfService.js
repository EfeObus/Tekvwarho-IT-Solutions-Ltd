/**
 * PDF Generation Service
 * Uses pdfkit (pure JS, no headless browser) to keep the container light.
 */

const PDFDocument = require('pdfkit');

const BRAND_BLUE = '#0066CC';
const DARK = '#1A2233';
const GRAY = '#636E72';
const LIGHT = '#F5F6FA';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function formatNaira(amount) {
    const n = Number(amount) || 0;
    return 'NGN ' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function drawHeader(doc, title) {
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND_BLUE);
    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
        .text('Tekvwa IT Solutions Ltd', 50, 28);
    doc.fontSize(9).font('Helvetica')
        .text('Ughelli, Delta State, Nigeria  •  RC 9748441  •  info@tekvwa.org', 50, 52);
    doc.fontSize(14).font('Helvetica-Bold')
        .text(title, 50, 62, { width: doc.page.width - 100, align: 'right' });
    doc.fillColor(DARK);
    doc.y = 110;
}

function drawFooter(doc, confidentialNote) {
    // Positioned inside the page's bottom margin with room for the text's
    // own line height, so it doesn't trigger an automatic page break.
    const bottom = doc.page.height - 70;
    doc.fontSize(8).fillColor(GRAY)
        .text(confidentialNote, 50, bottom, { width: doc.page.width - 100, align: 'center', lineBreak: false });
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
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const periodLabel = `${MONTH_NAMES[paystub.pay_period_month - 1]} ${paystub.pay_period_year}`;
            drawHeader(doc, `Payslip — ${periodLabel}`);

            // Employee info block
            const colWidth = (doc.page.width - 100) / 2;
            labelValueRow(doc, 50, doc.y, 'Employee', staff.name, colWidth);
            labelValueRow(doc, 50 + colWidth, doc.y - 0, 'Department', staff.department || '—', colWidth);
            doc.y += 40;
            labelValueRow(doc, 50, doc.y, 'Role', (staff.role || '').charAt(0).toUpperCase() + (staff.role || '').slice(1), colWidth);
            labelValueRow(doc, 50 + colWidth, doc.y, 'Pay Period', periodLabel, colWidth);
            doc.y += 40;

            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#E3E7ED').stroke();
            doc.y += 20;

            // Earnings table
            doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text('Earnings', 50, doc.y);
            doc.y += 20;

            const earnings = [
                ['Basic Salary', paystub.basic_salary],
                ['Housing Allowance', paystub.housing_allowance],
                ['Transport Allowance', paystub.transport_allowance],
                ['Utility Allowance', paystub.utility_allowance],
                ['Meal / Entertainment Allowance', paystub.meal_allowance]
            ];

            earnings.forEach(([label, value]) => {
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, doc.y, { width: 300 });
                doc.text(formatNaira(value), 350, doc.y, { width: doc.page.width - 400, align: 'right' });
                doc.y += 20;
            });

            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#E3E7ED').stroke();
            doc.y += 10;
            doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text('Gross Pay', 50, doc.y, { width: 300 });
            doc.text(formatNaira(paystub.gross_pay), 350, doc.y, { width: doc.page.width - 400, align: 'right' });
            doc.y += 30;

            // Deductions
            doc.fontSize(12).font('Helvetica-Bold').text('Deductions', 50, doc.y);
            doc.y += 20;
            doc.fontSize(10).font('Helvetica').fillColor(DARK)
                .text(paystub.deductions_note || 'No deductions recorded', 50, doc.y, { width: 300 });
            doc.text('-' + formatNaira(paystub.deductions), 350, doc.y, { width: doc.page.width - 400, align: 'right' });
            doc.y += 30;

            // Net pay - highlighted
            doc.rect(50, doc.y, doc.page.width - 100, 44).fill(LIGHT);
            doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND_BLUE)
                .text('Net Pay', 66, doc.y + 14);
            doc.fontSize(15).text(formatNaira(paystub.net_pay), 50, doc.y + 12, { width: doc.page.width - 116, align: 'right' });
            doc.y += 70;

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
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            drawHeader(doc, 'Employment Contract');
            doc.y = 110;

            doc.fontSize(10).fillColor(GRAY)
                .text(`Issued: ${new Date(contract.generated_at || Date.now()).toLocaleDateString('en-GB')}`, 50, doc.y);
            doc.y += 30;

            const colWidth = (doc.page.width - 100) / 2;
            labelValueRow(doc, 50, doc.y, 'Employee', staff.name, colWidth);
            labelValueRow(doc, 50 + colWidth, doc.y, 'Department', contract.department || '—', colWidth);
            doc.y += 40;
            labelValueRow(doc, 50, doc.y, 'Job Title', contract.job_title, colWidth);
            labelValueRow(doc, 50 + colWidth, doc.y, 'Start Date', contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : '—', colWidth);
            doc.y += 40;
            labelValueRow(doc, 50, doc.y, 'Monthly Basic Salary', formatNaira(contract.basic_salary), colWidth);
            labelValueRow(doc, 50 + colWidth, doc.y, 'Monthly Gross Salary', formatNaira(contract.gross_salary), colWidth);
            doc.y += 45;

            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#E3E7ED').stroke();
            doc.y += 20;

            doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK).text('Job Description & Responsibilities', 50, doc.y);
            doc.y += 20;
            doc.fontSize(10).font('Helvetica').fillColor(DARK)
                .text(contract.job_description || 'To be discussed with your manager.', 50, doc.y, { width: doc.page.width - 100, align: 'left' });
            doc.y += doc.heightOfString(contract.job_description || '', { width: doc.page.width - 100 }) + 25;

            doc.fontSize(12).font('Helvetica-Bold').text('Allowances', 50, doc.y);
            doc.y += 20;
            const allowances = [
                ['Housing Allowance', contract.housing_allowance],
                ['Transport Allowance', contract.transport_allowance],
                ['Utility Allowance', contract.utility_allowance],
                ['Meal / Entertainment Allowance', contract.meal_allowance]
            ];
            allowances.forEach(([label, value]) => {
                doc.fontSize(10).font('Helvetica').fillColor(DARK).text(label, 50, doc.y, { width: 300 });
                doc.text(formatNaira(value), 350, doc.y, { width: doc.page.width - 400, align: 'right' });
                doc.y += 18;
            });
            doc.y += 15;

            doc.fontSize(12).font('Helvetica-Bold').text('Terms', 50, doc.y);
            doc.y += 20;
            doc.fontSize(10).font('Helvetica').fillColor(DARK).text(
                'This role is subject to Tekvwa IT Solutions Ltd\'s Employee Handbook and Code of Conduct, ' +
                'available in the staff dashboard. Employment terms (working hours, leave, termination) follow ' +
                'the Nigerian Labour Act. This letter confirms the role, compensation, and start date agreed ' +
                'between Tekvwa IT Solutions Ltd and the employee named above.',
                50, doc.y, { width: doc.page.width - 100 }
            );
            doc.y += 90;

            doc.fontSize(10).fillColor(DARK).text('_______________________', 50, doc.y);
            doc.text('_______________________', 50 + colWidth, doc.y);
            doc.y += 15;
            doc.fontSize(9).fillColor(GRAY).text('For Tekvwa IT Solutions Ltd', 50, doc.y);
            doc.text('Employee Signature', 50 + colWidth, doc.y);

            drawFooter(doc, `This document is confidential and intended solely for ${staff.name}.`);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePaystubPDF, generateContractPDF, formatNaira };
