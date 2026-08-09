/**
 * Nigerian PAYE Tax Calculation Service
 *
 * Implements the standard federal graduated tax table under the Personal
 * Income Tax Act (as amended). This is federal law - Delta State's DBIR is
 * the *collector* for residents (PAYE is remitted to the state where the
 * employee resides), not a different rate table.
 *
 * IMPORTANT: Nigeria's tax rules have been under active reform. Have an
 * accountant verify these bands are still current before relying on this
 * for real payroll - this implementation reflects the long-standing
 * published table as of this writing, not a live/verified feed.
 *
 * Deliberately excludes pension (PRA 2014) and NHF deductions - not
 * something this company is enrolling in yet.
 */

const ANNUAL_TAX_BANDS = [
    { amount: 300000, rate: 0.07 },
    { amount: 300000, rate: 0.11 },
    { amount: 500000, rate: 0.15 },
    { amount: 500000, rate: 0.19 },
    { amount: 1600000, rate: 0.21 },
    { amount: Infinity, rate: 0.24 }
];

const DEVELOPMENT_LEVY_ANNUAL = 100; // NGN, flat per employee per year (DBIR)

/**
 * Consolidated Relief Allowance = higher of NGN 200,000 or 1% of gross
 * annual income, plus 20% of gross annual income.
 */
function calculateCRA(grossAnnual) {
    return Math.max(200000, 0.01 * grossAnnual) + 0.2 * grossAnnual;
}

/**
 * Calculate monthly PAYE tax from a monthly gross salary.
 * Returns the annual and monthly breakdown for transparency/reporting.
 */
function calculateMonthlyPAYE(grossMonthly) {
    const grossAnnual = grossMonthly * 12;
    const cra = calculateCRA(grossAnnual);
    const taxableAnnual = Math.max(0, grossAnnual - cra);

    let remaining = taxableAnnual;
    let bandTax = 0;
    for (const band of ANNUAL_TAX_BANDS) {
        if (remaining <= 0) break;
        const amountInBand = Math.min(remaining, band.amount);
        bandTax += amountInBand * band.rate;
        remaining -= amountInBand;
    }

    // Minimum tax rule: if the graduated-band calculation comes out below
    // 1% of gross income (common for very low earners after CRA), 1% of
    // gross applies instead.
    const minimumTax = 0.01 * grossAnnual;
    const annualTax = Math.max(bandTax, minimumTax);
    const minimumTaxApplied = minimumTax > bandTax;

    return {
        grossAnnual,
        cra,
        taxableAnnual,
        annualTax,
        monthlyTax: annualTax / 12,
        monthlyCRA: cra / 12,
        minimumTaxApplied
    };
}

function monthlyDevelopmentLevy() {
    return DEVELOPMENT_LEVY_ANNUAL / 12;
}

module.exports = { calculateMonthlyPAYE, calculateCRA, monthlyDevelopmentLevy, ANNUAL_TAX_BANDS };
