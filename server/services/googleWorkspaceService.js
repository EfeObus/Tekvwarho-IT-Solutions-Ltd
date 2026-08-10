/**
 * Google Workspace Provisioning Service
 * Creates a new hire's @tekvwa.org mailbox via the Admin SDK Directory API,
 * using a service account with domain-wide delegation impersonating a
 * Workspace super admin (subject claim - domain-wide delegation only works
 * when a real admin identity is impersonated, a service account alone
 * cannot call the Directory API).
 *
 * Requires three env vars, none of which this app can generate itself -
 * they come from a one-time setup in Google Cloud Console + the Workspace
 * Admin Console (see README's Onboarding section):
 *   GOOGLE_WORKSPACE_SA_KEY     - the service account's JSON key, as a string
 *   GOOGLE_WORKSPACE_ADMIN_EMAIL - a real super admin mailbox to impersonate
 *   GOOGLE_WORKSPACE_DOMAIN     - e.g. tekvwa.org
 * Optional:
 *   GOOGLE_WORKSPACE_OU_MAP     - JSON object mapping department -> OU path
 *   GOOGLE_WORKSPACE_DEFAULT_GROUP - group email new hires are added to
 *
 * Until those are set, isWorkspaceConfigured() returns false and callers
 * fall back to the manual "mark done" checklist toggle instead of erroring.
 */

const { google } = require('googleapis');
const crypto = require('crypto');

// admin.reports.audit.readonly is used only for hasLoggedIn() - detecting a
// hire's first Google sign-in so they can be promoted to real Active staff
// (see checkActivation in routes/onboarding.js). Both scopes must be added
// to this service account's domain-wide delegation authorization in the
// Workspace Admin Console, not just requested here - see README.
const SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.reports.audit.readonly'
];
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

function isWorkspaceConfigured() {
    return !!(
        process.env.GOOGLE_WORKSPACE_SA_KEY &&
        process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL &&
        process.env.GOOGLE_WORKSPACE_DOMAIN
    );
}

function getAuthClient() {
    const key = JSON.parse(process.env.GOOGLE_WORKSPACE_SA_KEY);
    return new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES,
        subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
    });
}

function getAdminClient() {
    return google.admin({ version: 'directory_v1', auth: getAuthClient() });
}

function getReportsClient() {
    return google.admin({ version: 'reports_v1', auth: getAuthClient() });
}

function generateTempPassword() {
    const bytes = crypto.randomBytes(16);
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
    }
    return password;
}

function slugifyName(fullName) {
    const cleaned = fullName
        .toLowerCase()
        .normalize('NFD') // decompose accents (e.g. "é" -> "e" + combining mark)
        .replace(/[^a-z\s]/g, '') // drop the combining marks and anything else non-alphabetic
        .trim()
        .split(/\s+/);
    const rest = cleaned.slice(1);
    return {
        given: cleaned[0] || 'user',
        // familyName (a display field) can contain spaces for multi-word
        // surnames - familySlug is the same value with spaces stripped,
        // since it goes straight into an email local-part where a space
        // would make the address invalid.
        family: rest.join(' ') || 'staff',
        familySlug: rest.join('') || 'staff'
    };
}

function resolveOrgUnit(department) {
    if (!process.env.GOOGLE_WORKSPACE_OU_MAP || !department) return '/';
    try {
        const map = JSON.parse(process.env.GOOGLE_WORKSPACE_OU_MAP);
        return map[department] || '/';
    } catch {
        return '/';
    }
}

async function userExists(admin, email) {
    try {
        await admin.users.get({ userKey: email });
        return true;
    } catch (error) {
        if (error.code === 404) return false;
        throw error;
    }
}

/**
 * Provision a new @<domain> mailbox for a hire. Returns { email, tempPassword }.
 */
async function provisionWorkspaceUser({ fullName, department }) {
    if (!isWorkspaceConfigured()) {
        throw new Error('Google Workspace is not configured');
    }

    const admin = getAdminClient();
    const domain = process.env.GOOGLE_WORKSPACE_DOMAIN;
    const { given, family, familySlug } = slugifyName(fullName);

    let email = `${given}.${familySlug}@${domain}`;
    let attempt = 2;
    while (await userExists(admin, email)) {
        email = `${given}.${familySlug}${attempt}@${domain}`;
        attempt++;
        if (attempt > 20) throw new Error('Could not find an available email address after 20 attempts');
    }

    const tempPassword = generateTempPassword();

    await admin.users.insert({
        requestBody: {
            primaryEmail: email,
            name: {
                givenName: given.charAt(0).toUpperCase() + given.slice(1),
                familyName: family.charAt(0).toUpperCase() + family.slice(1)
            },
            password: tempPassword,
            changePasswordAtNextLogin: true,
            orgUnitPath: resolveOrgUnit(department)
        }
    });

    if (process.env.GOOGLE_WORKSPACE_DEFAULT_GROUP) {
        try {
            await admin.members.insert({
                groupKey: process.env.GOOGLE_WORKSPACE_DEFAULT_GROUP,
                requestBody: { email }
            });
        } catch (error) {
            // Account creation already succeeded - a group-assignment failure
            // shouldn't block onboarding, just needs manual follow-up.
            console.error(`Failed to add ${email} to ${process.env.GOOGLE_WORKSPACE_DEFAULT_GROUP}:`, error.message);
        }
    }

    return { email, tempPassword };
}

/**
 * Set a fresh temporary password on an already-provisioned account, right
 * before emailing it - keeps "Send Welcome Email" as its own explicit step
 * without a stale/unused password sitting in memory or the DB between
 * provisioning and whenever IT actually sends it.
 */
async function resetWorkspacePassword(workspaceEmail) {
    if (!isWorkspaceConfigured()) {
        throw new Error('Google Workspace is not configured');
    }
    const admin = getAdminClient();
    const tempPassword = generateTempPassword();
    await admin.users.update({
        userKey: workspaceEmail,
        requestBody: { password: tempPassword, changePasswordAtNextLogin: true }
    });
    return tempPassword;
}

/**
 * Has this user signed in successfully at least once since `sinceDate`
 * (their Workspace provisioning time)? Backed by the Reports API's login
 * audit log, which is pull-only - Google doesn't push login events, so
 * callers (checkActivation route) poll this on demand rather than being
 * notified. Any error (including "no activity yet," which the API can
 * surface as an error for a brand-new account) is treated as "not signed
 * in yet" rather than failing the caller - this is a convenience check,
 * not a security gate.
 */
async function hasLoggedIn(workspaceEmail, sinceDate) {
    if (!isWorkspaceConfigured()) return false;
    try {
        const reports = getReportsClient();
        const res = await reports.activities.list({
            userKey: workspaceEmail,
            applicationName: 'login',
            eventName: 'login_success',
            startTime: new Date(sinceDate).toISOString(),
            maxResults: 1
        });
        return !!(res.data.items && res.data.items.length > 0);
    } catch (error) {
        console.error(`Workspace login check failed for ${workspaceEmail}:`, error.message);
        return false;
    }
}

module.exports = { isWorkspaceConfigured, provisionWorkspaceUser, resetWorkspacePassword, hasLoggedIn };
