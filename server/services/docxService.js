/**
 * DOCX Generation Service
 * Word-document counterpart to pdfService.js's branded letterhead, using
 * the `docx` package. Word doesn't support vector path drawing, so the
 * PDF's decorative signature flourish has no docx equivalent here - a
 * plain signature line is used instead, which is the normal convention
 * for an editable/hand-signable Word document anyway.
 */

const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    ImageRun, Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign
} = require('docx');

const BRAND_BLUE = '0066CC';
const BRAND_BLUE_DARK = '004C99';
const BADGE_BG = 'EAF2FF';
const BADGE_BORDER = 'BFDBFE';
const DARK = '1A2233';
const GRAY = '636E72';
const MUTED = '94A3B8';
const BORDER = 'E3E7ED';

const LOGO_PATH = path.join(__dirname, '../../img/tekvwa-icon.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const NO_BORDERS = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

function cell(children, opts = {}) {
    return new TableCell({
        borders: opts.borders || {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
        },
        verticalAlign: opts.verticalAlign || VerticalAlign.TOP,
        width: opts.width,
        margins: opts.margins || { top: 0, bottom: 0, left: 0, right: 0 },
        children
    });
}

/**
 * Brand block: icon + "TEKVWA" / "IT SOLUTIONS LTD" + RC badge (left),
 * right-aligned contact block (right).
 */
function buildBrandRow() {
    const brandChildren = [];

    const brandLine = [];
    if (HAS_LOGO) {
        brandLine.push(new ImageRun({ data: fs.readFileSync(LOGO_PATH), transformation: { width: 30, height: 30 * 768 / 1408 }, type: 'png' }));
        brandLine.push(new TextRun({ text: '  ' }));
    }
    brandLine.push(new TextRun({ text: 'TEKVWA', bold: true, color: BRAND_BLUE, size: 32 }));
    brandChildren.push(new Paragraph({ spacing: { after: 20 }, children: brandLine }));

    brandChildren.push(new Paragraph({
        spacing: { after: 120 },
        indent: { left: HAS_LOGO ? 440 : 0 },
        children: [new TextRun({ text: 'IT SOLUTIONS LTD', color: GRAY, bold: true, size: 15 })]
    }));

    // RC badge - a small shaded, bordered mini-table standing in for the
    // PDF's rounded pill badge (docx tables can't do rounded corners).
    const badge = new Table({
        width: { size: 1500, type: WidthType.DXA },
        indent: { size: HAS_LOGO ? 440 : 0, type: WidthType.DXA },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: BADGE_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: BADGE_BORDER },
            left: { style: BorderStyle.SINGLE, size: 4, color: BADGE_BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: BADGE_BORDER }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { type: ShadingType.SOLID, color: BADGE_BG, fill: BADGE_BG },
                        margins: { top: 60, bottom: 60, left: 140, right: 140 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'RC 9748441', bold: true, color: BRAND_BLUE_DARK, size: 15 })] })]
                    })
                ]
            })
        ]
    });

    const contactLines = [
        'Ughelli, Delta State, Nigeria',
        'e: info@tekvwa.org',
        'w: www.tekvwa.org',
        'p: +234 906 577 9323'
    ];
    const contactChildren = contactLines.map(line => new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [new TextRun({ text: line, color: GRAY, size: 17 })]
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
            new TableRow({
                children: [
                    cell([...brandChildren, badge], { width: { size: 60, type: WidthType.PERCENTAGE } }),
                    cell(contactChildren, { width: { size: 40, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.TOP })
                ]
            })
        ]
    });
}

/** Double accent rule under the brand row (thick blue + thin light-blue). */
function buildAccentRule() {
    return [
        new Paragraph({
            spacing: { before: 160, after: 40 },
            border: { bottom: { color: BRAND_BLUE, space: 4, style: BorderStyle.SINGLE, size: 20 } },
            children: []
        }),
        new Paragraph({
            spacing: { after: 240 },
            border: { bottom: { color: BADGE_BORDER, space: 1, style: BorderStyle.SINGLE, size: 8 } },
            children: []
        })
    ];
}

/** Date (left) / Document Ref (right) metadata row. */
function buildMetadataRow(date, docRef) {
    const dateStr = new Date(date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
            new TableRow({
                children: [
                    cell([
                        new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'DATE', bold: true, color: MUTED, size: 15 })] }),
                        new Paragraph({ children: [new TextRun({ text: dateStr, bold: true, color: DARK, size: 21 })] })
                    ], { width: { size: 50, type: WidthType.PERCENTAGE } }),
                    cell([
                        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 20 }, children: [new TextRun({ text: 'DOCUMENT REF', bold: true, color: MUTED, size: 15 })] }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: docRef.toUpperCase(), bold: true, color: DARK, size: 21 })] })
                    ], { width: { size: 50, type: WidthType.PERCENTAGE } })
                ]
            })
        ]
    });
}

function buildHeader(docRef, date) {
    return new Header({
        children: [
            buildBrandRow(),
            ...buildAccentRule(),
            buildMetadataRow(date, docRef),
            new Paragraph({ spacing: { after: 100 }, children: [] })
        ]
    });
}

function buildFooter() {
    const columns = [
        ['HEAD OFFICE', 'Ughelli, Delta State, Nigeria'],
        ['ONLINE & INQUIRIES', 'info@tekvwa.org  |  www.tekvwa.org'],
        ['CORPORATE ENTITY', 'Tekvwa IT Solutions Ltd (RC 9748441)']
    ];

    return new Footer({
        children: [
            new Paragraph({
                spacing: { after: 160 },
                border: { top: { color: BORDER, space: 4, style: BorderStyle.SINGLE, size: 6 } },
                children: []
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: NO_BORDERS,
                rows: [
                    new TableRow({
                        children: columns.map(([label, value]) => cell([
                            new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: label, bold: true, color: BRAND_BLUE, size: 14 })] }),
                            new Paragraph({ children: [new TextRun({ text: value, color: GRAY, size: 16 })] })
                        ], { width: { size: 33, type: WidthType.PERCENTAGE } }))
                    })
                ]
            })
        ]
    });
}

/**
 * Generate a general company letterhead DOCX. Returns a Buffer.
 */
async function generateLetterheadDOCX({ subject, recipient, date, body, signatureName, signatureTitle }) {
    const children = [];

    if (recipient) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'TO', bold: true, color: MUTED, size: 15 })] }));
        recipient.split('\n').forEach((line, i, arr) => {
            children.push(new Paragraph({
                spacing: { after: i === arr.length - 1 ? 300 : 20 },
                children: [new TextRun({ text: line, bold: true, color: DARK, size: 22 })]
            }));
        });
    }

    if (subject) {
        children.push(new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: `Re: ${subject}`, bold: true, color: DARK, size: 22 })]
        }));
    }

    const salutation = recipient ? `Dear ${recipient.split(/[,\n]/)[0].trim()},` : 'To Whom It May Concern,';
    children.push(new Paragraph({ spacing: { after: 260 }, children: [new TextRun({ text: salutation, color: DARK, size: 21 })] }));

    const bodyParagraphs = (body || '').split(/\n{2,}/).map(para =>
        new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: para.replace(/\n/g, ' '), color: DARK, size: 21 })]
        })
    );
    children.push(...bodyParagraphs);

    if (signatureName) {
        children.push(new Paragraph({ spacing: { before: 300, after: 500 }, children: [new TextRun({ text: 'Sincerely,', color: DARK, size: 21 })] }));
        children.push(new Paragraph({
            spacing: { after: 120 },
            border: { bottom: { color: BORDER, space: 1, style: BorderStyle.SINGLE, size: 6 } },
            children: []
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: signatureName, bold: true, color: DARK, size: 22 })] }));
        if (signatureTitle) {
            children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: signatureTitle, bold: true, color: BRAND_BLUE, size: 19 })] }));
        }
        children.push(new Paragraph({ children: [new TextRun({ text: 'Tekvwa IT Solutions Ltd', color: GRAY, size: 18 })] }));
    }

    const doc = new Document({
        sections: [
            {
                headers: { default: buildHeader('Official Correspondence', date) },
                footers: { default: buildFooter() },
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 720, bottom: 900, left: 720, right: 720 }
                    }
                },
                children
            }
        ]
    });

    return Packer.toBuffer(doc);
}

module.exports = { generateLetterheadDOCX };
