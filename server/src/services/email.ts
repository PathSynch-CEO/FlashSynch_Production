import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flashsynch.com';
const FROM_NAME = process.env.FROM_NAME || 'FlashSynch';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://flashsynch.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid initialized');
} else {
  console.warn('SENDGRID_API_KEY not set - email sending disabled');
}

export interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteToken: string;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('Email disabled - would send invite to:', params.to);
    return false;
  }

  const inviteUrl = `${FRONTEND_URL}/invite/${params.inviteToken}`;

  const msg = {
    to: params.to,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `You're invited to join ${params.orgName} on FlashSynch`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">FlashSynch</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <h2 style="color: #111827; margin: 0 0 16px; font-size: 20px;">You're Invited!</h2>

            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.orgName}</strong> as a <strong>${params.role}</strong> on FlashSynch.
            </p>

            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
              FlashSynch is a digital business card platform that helps teams share contact information and capture leads effortlessly.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Or copy this link: <br>
              <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              This invitation expires in 7 days.<br>
              If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} FlashSynch. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
You're invited to join ${params.orgName} on FlashSynch!

${params.inviterName} has invited you to join ${params.orgName} as a ${params.role}.

Accept your invitation: ${inviteUrl}

This invitation expires in 7 days.

- The FlashSynch Team
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log('Invite email sent to:', params.to);
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}

export interface SendLeadNotificationParams {
  to: string;
  cardOwnerName: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadCompany?: string;
  cardName: string;
}

export async function sendLeadNotificationEmail(params: SendLeadNotificationParams): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('Email disabled - would send lead notification to:', params.to);
    return false;
  }

  const msg = {
    to: params.to,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `New lead captured: ${params.leadName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">New Lead Captured!</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
              Someone just shared their contact info via your <strong>${params.cardName}</strong> card.
            </p>

            <!-- Lead Details -->
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">Contact Details</h3>
              <p style="color: #374151; margin: 0 0 8px;"><strong>Name:</strong> ${params.leadName}</p>
              <p style="color: #374151; margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${params.leadEmail}" style="color: #2563eb;">${params.leadEmail}</a></p>
              ${params.leadPhone ? `<p style="color: #374151; margin: 0 0 8px;"><strong>Phone:</strong> <a href="tel:${params.leadPhone}" style="color: #2563eb;">${params.leadPhone}</a></p>` : ''}
              ${params.leadCompany ? `<p style="color: #374151; margin: 0;"><strong>Company:</strong> ${params.leadCompany}</p>` : ''}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}/dashboard/contacts" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View in Dashboard
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} FlashSynch. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
New Lead Captured!

Someone just shared their contact info via your ${params.cardName} card.

Name: ${params.leadName}
Email: ${params.leadEmail}
${params.leadPhone ? `Phone: ${params.leadPhone}` : ''}
${params.leadCompany ? `Company: ${params.leadCompany}` : ''}

View in your dashboard: ${FRONTEND_URL}/dashboard/contacts

- The FlashSynch Team
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log('Lead notification sent to:', params.to);
    return true;
  } catch (error) {
    console.error('Failed to send lead notification:', error);
    return false;
  }
}
