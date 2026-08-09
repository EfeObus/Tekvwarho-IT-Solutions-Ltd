/**
 * DOCX Generation Service
 * Word-document counterpart to pdfService.js's branded letterhead, using
 * the `docx` package. Word headers/footers don't support a full-bleed
 * colored band the way PDF does, so the blue band is built as a single-row,
 * single-cell shaded table instead - visually equivalent, Word-native.
 */

const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    ImageRun, Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign
} = require('docx');

const BRAND_BLUE = '0066CC';
const GRAY = '636E72';
const DARK = '1A2233';

const LOGO_PATH = path.join(__dirname, '../../img/tekvwa-logo.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

function buildHeader() {
    const cellChildren = [];

    if (HAS_LOGO) {
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        cellChildren.push(new Paragraph({
            children: [
                new ImageRun({
                    data: logoBuffer,
                    transformation: { width: 130, height: 72 },
                    type: 'png'
                })
            ]
        }));
    }

    cellChildren.push(new Paragraph({
        children: [
            new TextRun({
                text: 'Ughelli, Delta State, Nigeria  •  RC 9748441  •  info@tekvwa.org',
                color: 'FFFFFF',
                size: 16
            })
        ]
    }));

    return new Header({
        children: [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                shading: { type: ShadingType.SOLID, color: BRAND_BLUE, fill: BRAND_BLUE },
                                verticalAlign: VerticalAlign.CENTER,
                                margins: { top: 200, bottom: 200, left: 200, right: 200 },
                                children: cellChildren
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function buildFooter() {
    return new Footer({
        children: [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 24, color: BRAND_BLUE },
                    bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: {
                                    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                                    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
                                },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 100 },
                                        children: [
                                            new TextRun({
                                                text: 'Tekvwa IT Solutions Ltd  •  Ughelli, Delta State, Nigeria  •  RC 9748441',
                                                color: GRAY,
                                                size: 16
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
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
    const bodyParagraphs = (body || '').split(/\n{2,}/).map(para =>
        new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: para.replace(/\n/g, ' '), color: DARK, size: 22 })]
        })
    );

    const children = [
        new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: new Date(date || Date.now()).toLocaleDateString('en-GB'), color: GRAY, size: 20 })]
        })
    ];

    if (recipient) {
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: recipient, color: DARK, size: 22 })]
        }));
    }

    if (subject) {
        children.push(new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: `Re: ${subject}`, bold: true, color: DARK, size: 24 })]
        }));
    }

    children.push(...bodyParagraphs);

    if (signatureName) {
        children.push(new Paragraph({ spacing: { before: 600, after: 100 }, children: [new TextRun({ text: '_______________________', color: DARK, size: 22 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: signatureName, bold: true, color: DARK, size: 22 })] }));
        if (signatureTitle) {
            children.push(new Paragraph({ children: [new TextRun({ text: signatureTitle, color: GRAY, size: 18 })] }));
        }
    }

    const doc = new Document({
        sections: [
            {
                headers: { default: buildHeader() },
                footers: { default: buildFooter() },
                properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
                children: [
                    new Paragraph({ text: 'Official Correspondence', heading: 'Heading1', spacing: { after: 300 } }),
                    ...children
                ]
            }
        ]
    });

    return Packer.toBuffer(doc);
}

module.exports = { generateLetterheadDOCX };
