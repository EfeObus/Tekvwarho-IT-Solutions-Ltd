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

const SCOPES = ['https://www.googleapis.com/auth/admin.directory.user'];
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

function isWorkspaceConfigured() {
    return !!(
        process.env.GOOGLE_WORKSPACE_SA_KEY &&
        process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL &&
        process.env.GOOGLE_WORKSPACE_DOMAIN
    );
}

function getAdminClient() {
    const key = JSON.parse(process.env.GOOGLE_WORKSPACE_SA_KEY);
    const auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES,
        subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
    });
    return google.admin({ version: 'directory_v1', auth });
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
    return {
        given: cleaned[0] || 'user',
        family: cleaned.slice(1).join(' ') || 'staff'
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
    const { given, family } = slugifyName(fullName);

    let email = `${given}.${family}@${domain}`;
    let attempt = 2;
    while (await userExists(admin, email)) {
        email = `${given}.${family}${attempt}@${domain}`;
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

module.exports = { isWorkspaceConfigured, provisionWorkspaceUser };
