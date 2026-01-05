/**
 * Email Service
 * Handles sending email notifications using Nodemailer
 */

const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.outlook.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"Tekvwarho IT Solutions" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text
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
            <p>Best regards,<br>The Tekvwarho Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwarho IT Solutions Ltd<br>
                Canada: +1 (905) 781 9825<br>
                Nigeria: +234 906 577 9323<br>
                Email: efe.obukohwo@outlook.com
            </p>
        </div>
    `;

    return sendEmail({
        to: message.email,
        subject: 'Thank You for Contacting Tekvwarho IT Solutions',
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
            <p>Best regards,<br>The Tekvwarho Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwarho IT Solutions Ltd<br>
                Canada: +1 (905) 781 9825 | Nigeria: +234 906 577 9323
            </p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'Re: Your Inquiry - Tekvwarho IT Solutions',
        html
    });
};

/**
 * Send booking confirmation to visitor
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
            <h2 style="color: #0066CC;">Consultation Booking Confirmed</h2>
            <p>Hi ${consultation.name},</p>
            <p>Your consultation has been successfully booked. Here are the details:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${consultation.booking_time}</p>
                ${consultation.service ? `<p><strong>Service:</strong> ${consultation.service}</p>` : ''}
                ${consultation.notes ? `<p><strong>Notes:</strong> ${consultation.notes}</p>` : ''}
            </div>
            <p>We'll send you a reminder 24 hours before your consultation.</p>
            <p>If you need to reschedule, please contact us at efe.obukohwo@outlook.com</p>
            <p>Best regards,<br>The Tekvwarho Team</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                Tekvwarho IT Solutions Ltd<br>
                Canada: +1 (905) 781 9825 | Nigeria: +234 906 577 9323
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
const sendMissedChatResponse = async (visitorEmail, visitorName, messages, sessionId) => {
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
            <h2 style="color: #0066CC;">Response to Your Chat with Tekvwarho IT Solutions</h2>
            
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
            
            <p>Best regards,<br>Tekvwarho IT Solutions Team</p>
        </div>
    `;

    return sendEmail({
        to: visitorEmail,
        subject: 'Response to Your Chat - Tekvwarho IT Solutions',
        html
    });
};

module.exports = {
    sendEmail,
    sendContactNotification,
    sendContactConfirmation,
    sendReplyEmail,
    sendBookingConfirmation,
    sendBookingNotification,
    sendMissedChatResponse
};
