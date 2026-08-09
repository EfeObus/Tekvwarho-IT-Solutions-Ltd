/**
 * Email Service
 * Handles sending email notifications using Nodemailer
 *
 * SUPPORTED SMTP PROVIDERS:
 * - Gmail: Set SMTP_HOST=smtp.gmail.com, use App Password
 * - Outlook: Requires OAuth2 (basic auth disabled)
 * - SendGrid: Set SMTP_HOST=smtp.sendgrid.net
 */

const nodemailer = require('nodemailer');

// Create transporter based on provider
const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail');

    const config = {
        host,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    // Gmail requires special settings
    if (isGmail) {
        config.service = 'gmail';
    }

    return nodemailer.createTransport(config);
};

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text, attachments }) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Tekvwa IT Solutions" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text,
            attachments
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

/**
 * Send contact form notification to admin
 */
const sendContactNotification = async (message) => {
    const subject = `New Contact Form Submission - ${message.service || 'General Inquiry'}`;

    const html = `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message.name}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message.email}</td>
            </tr>
            ${message.company ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message.company}</td>
            </tr>
            ` : ''}
            ${message.service ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Service</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message.service}</td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Message</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message.message}</td>
            </tr>
        </table>
        <p style="margin-top: 20px;">
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin/messages.html"
               style="background-color: #0066CC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View in Dashboard
            </a>
        </p>
    `;

    return sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject,
        html
    });
};

/**
 * Send contact form confirmation to visitor
 */
const sendContactConfirmation = async (message) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Thank You for Contacting Us!</h2>
            <p>Hi ${message.name},</p>
            <p>We have received your message and will get back to you within 24-48 hours.</p>
            <p>Here's a summary of your inquiry:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                ${message.service ? `<p><strong>Service:</strong> ${message.service}</p>` : ''}
                <p><strong>Message:</strong> ${message.message}</p>
            </div>
            <p>In the meantime, feel free to explore our services:</p>
            <ul>
                <li><a href="${process.env.SITE_URL || 'http://localhost:3000'}/it-consulting.html">IT Consulting</a></li>
                <li><a href="${process.env.SITE_URL || 'http://localhost:3000'}/software-development.html">Software Development</a></li>
                <li><a href="${process.env.SITE_URL || 'http://localhost:3000'}/website-development.html">Website Development</a></li>
                <li><a href="${process.env.SITE_URL || 'http://localhost:3000'}/data-analytics.html">Data Analytics</a></li>
            </ul>
            <p>Best regards,<br>The Tekvwa Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd<br>
                Nigeria: +234 906 577 9323<br>
                Email: info@tekvwa.org
            </p>
        </div>
    `;

    return sendEmail({
        to: message.email,
        subject: 'Thank You for Contacting Tekvwa IT Solutions',
        html
    });
};

/**
 * Send reply to contact message
 */
const sendReplyEmail = async (to, content, name) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${name},</p>
            <div style="margin: 20px 0;">${content.replace(/\n/g, '<br>')}</div>
            <p>Best regards,<br>The Tekvwa Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd<br>
                Nigeria: +234 906 577 9323
            </p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'Re: Your Inquiry - Tekvwa IT Solutions',
        html
    });
};

/**
 * Send booking-received acknowledgment to visitor (not yet staff-reviewed)
 */
const sendBookingConfirmation = async (consultation) => {
    const dateStr = new Date(consultation.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">We've Received Your Booking Request</h2>
            <p>Hi ${consultation.name},</p>
            <p>Thanks for booking a consultation. Here's what you requested — our team will review it and confirm shortly:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${consultation.booking_time}</p>
                ${consultation.service ? `<p><strong>Service:</strong> ${consultation.service}</p>` : ''}
                ${consultation.notes ? `<p><strong>Notes:</strong> ${consultation.notes}</p>` : ''}
            </div>
            <p>You'll get a separate email as soon as we confirm the time.</p>
            <p>If you need to reschedule, please contact us at info@tekvwa.org</p>
            <p>Best regards,<br>The Tekvwa Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd<br>
                Nigeria: +234 906 577 9323
            </p>
        </div>
    `;

    return sendEmail({
        to: consultation.email,
        subject: `Booking Request Received - ${dateStr}`,
        html
    });
};

/**
 * Send confirmation to visitor once staff confirms the consultation
 */
const sendBookingStatusConfirmed = async (consultation) => {
    const dateStr = new Date(consultation.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Your Consultation Is Confirmed</h2>
            <p>Hi ${consultation.name},</p>
            <p>Good news — your consultation is now confirmed:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${consultation.booking_time}</p>
                ${consultation.service ? `<p><strong>Service:</strong> ${consultation.service}</p>` : ''}
            </div>
            <p>We'll send you a reminder 24 hours before your consultation.</p>
            <p>If you need to reschedule, please contact us at info@tekvwa.org</p>
            <p>Best regards,<br>The Tekvwa Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd<br>
                Nigeria: +234 906 577 9323
            </p>
        </div>
    `;

    return sendEmail({
        to: consultation.email,
        subject: `Consultation Confirmed - ${dateStr}`,
        html
    });
};

/**
 * Send cancellation notice to visitor
 */
const sendBookingStatusCancelled = async (consultation) => {
    const dateStr = new Date(consultation.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Your Consultation Was Cancelled</h2>
            <p>Hi ${consultation.name},</p>
            <p>Your consultation scheduled for <strong>${dateStr} at ${consultation.booking_time}</strong> has been cancelled.</p>
            <p>If this wasn't expected or you'd like to rebook, just reply to this email or reach us at info@tekvwa.org.</p>
            <p>Best regards,<br>The Tekvwa Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd<br>
                Nigeria: +234 906 577 9323
            </p>
        </div>
    `;

    return sendEmail({
        to: consultation.email,
        subject: `Consultation Cancelled - ${dateStr}`,
        html
    });
};

/**
 * Send booking notification to admin
 */
const sendBookingNotification = async (consultation) => {
    const dateStr = new Date(consultation.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <h2>New Consultation Booking</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.name}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.email}</td>
            </tr>
            ${consultation.phone ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.phone}</td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Date</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${dateStr}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Time</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.booking_time}</td>
            </tr>
            ${consultation.service ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Service</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.service}</td>
            </tr>
            ` : ''}
            ${consultation.notes ? `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Notes</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${consultation.notes}</td>
            </tr>
            ` : ''}
        </table>
        <p style="margin-top: 20px;">
            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin/consultations.html"
               style="background-color: #0066CC; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View in Dashboard
            </a>
        </p>
    `;

    return sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Consultation Booking - ${dateStr} at ${consultation.booking_time}`,
        html
    });
};

/**
 * Send missed chat response to visitor's email
 */
const sendMissedChatResponse = async (visitorEmail, visitorName, messages, _sessionId) => {
    // Format the conversation
    const conversationHtml = messages.map(msg => {
        const sender = msg.sender_type === 'agent' ? 'Our Team' : visitorName;
        const time = new Date(msg.created_at).toLocaleString();
        const bgColor = msg.sender_type === 'agent' ? '#e3f2fd' : '#f5f5f5';

        return `
            <div style="background: ${bgColor}; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${sender}</div>
                <div style="color: #555;">${msg.content}</div>
                <div style="font-size: 11px; color: #888; margin-top: 4px;">${time}</div>
            </div>
        `;
    }).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Response to Your Chat with Tekvwa IT Solutions</h2>

            <p>Hi ${visitorName},</p>

            <p>We're sorry we missed you! Here's a summary of your chat conversation with our team:</p>

            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Chat Conversation</h4>
                ${conversationHtml}
            </div>

            <p>If you need further assistance, please feel free to:</p>
            <ul>
                <li>Reply to this email</li>
                <li>Start a new live chat on our website</li>
                <li>Book a consultation at <a href="${process.env.SITE_URL || 'http://localhost:3000'}/book-consultation.html">our booking page</a></li>
            </ul>

            <p>Best regards,<br>Tekvwa IT Solutions Team</p>
        </div>
    `;

    return sendEmail({
        to: visitorEmail,
        subject: 'Response to Your Chat - Tekvwa IT Solutions',
        html
    });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5500'}/admin/reset-password.html?token=${resetToken}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your Tekvwa admin account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #0066CC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                    Reset Password
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #0066CC;">${resetUrl}</a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                Tekvwa IT Solutions Ltd<br>
                This is an automated email, please do not reply.
            </p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: 'Password Reset - Tekvwa IT Solutions',
        html
    });
};

/**
 * Send an employment contract PDF to a new hire
 */
const sendContractEmail = async (staff, jobTitle, pdfBuffer) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Welcome to Tekvwa IT Solutions Ltd</h2>
            <p>Hi ${staff.name},</p>
            <p>Congratulations on joining us as <strong>${jobTitle}</strong>. Your employment contract is attached to this email as a PDF.</p>
            <p>Please review it, and reach out to HR if you have any questions.</p>
            <p>You can also find our Employee Handbook and Code of Conduct in your staff dashboard once you log in.</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd &bull; Ughelli, Delta State, Nigeria &bull; RC 9748441
            </p>
        </div>
    `;

    return sendEmail({
        to: staff.email,
        subject: 'Your Employment Contract - Tekvwa IT Solutions',
        html,
        attachments: [
            {
                filename: 'employment-contract.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });
};

/**
 * Send Workspace account welcome email to a new hire's personal address,
 * once their @tekvwa.org mailbox has been provisioned.
 */
const sendWelcomeEmail = async ({ staff, workspaceEmail, tempPassword }) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066CC;">Welcome to Tekvwa IT Solutions Ltd</h2>
            <p>Hi ${staff.name},</p>
            <p>We've set up your official company account ahead of your start date. Here are your credentials:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; background: #F5F6FA; font-weight: bold; width: 160px;">Company Email</td>
                    <td style="padding: 8px; background: #F5F6FA;">${workspaceEmail}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Temporary Password</td>
                    <td style="padding: 8px;">${tempPassword}</td>
                </tr>
            </table>
            <p><strong>Next steps:</strong></p>
            <ul>
                <li>Sign in at <a href="https://mail.google.com">mail.google.com</a> using the credentials above - you'll be prompted to set a new password immediately.</li>
                <li>Complete 2-Step Verification (MFA) setup when prompted.</li>
                <li>Your manager will be in touch shortly with your first-week schedule.</li>
            </ul>
            <p>If you run into any issues signing in, reply to this email and IT will help you out.</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwa IT Solutions Ltd &bull; Ughelli, Delta State, Nigeria &bull; RC 9748441
            </p>
        </div>
    `;

    return sendEmail({
        to: staff.email,
        subject: 'Welcome to Tekvwa IT Solutions! Your Account Credentials',
        html
    });
};

module.exports = {
    sendEmail,
    sendContactNotification,
    sendContactConfirmation,
    sendReplyEmail,
    sendBookingConfirmation,
    sendBookingStatusConfirmed,
    sendBookingStatusCancelled,
    sendBookingNotification,
    sendMissedChatResponse,
    sendPasswordResetEmail,
    sendContractEmail,
    sendWelcomeEmail
};
