import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

const isDev = process.env.NODE_ENV !== 'production';

const transporter = isDev
  ? null
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

async function sendMail(options: SendMailOptions): Promise<void> {
  if (isDev) {
    console.log('\n========== [DEV EMAIL] ==========');
    console.log(`To:      ${String(options.to)}`);
    console.log(`Subject: ${String(options.subject)}`);
    if (options.text) console.log(`Body:\n${String(options.text)}`);
    console.log('=================================\n');
    return;
  }
  await transporter!.sendMail(options);
}

export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const link = `${baseUrl}/api/authentication/verify-email?token=${rawToken}`;

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to,
    subject: 'Verify your PolPaL email address',
    text: `Please verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 24 hours.\n\nIf you did not register for PolPaL, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;max-width:520px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#488ccc;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PolPaL</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">Verify your email address</h1>
              <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">
                Thank you for registering with PolPaL. Please click the button below to verify your email address.
              </p>

              <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">
                After verifying your email, your account will be reviewed for approval by an administrator before you can log in.
              </p>

              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                This link expires in <strong>24 hours</strong>.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background-color:#488ccc;border-radius:10px;">
                    <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;word-break:break-all;">
                <a href="${link}" style="color:#488ccc;text-decoration:none;">${link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f7fb;padding:20px 40px;text-align:center;border-top:1px solid #e8edf3;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                If you did not register for PolPaL, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

function emailLayout(headerColor: string, body: string, footer: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;max-width:520px;width:100%;">
        <tr><td style="background-color:${headerColor};padding:32px 40px;text-align:center;">
          <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PolPaL</span>
        </td></tr>
        <tr><td style="padding:36px 40px;">${body}</td></tr>
        <tr><td style="background-color:#f4f7fb;padding:20px 40px;text-align:center;border-top:1px solid #e8edf3;">
          <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendAdminApprovalRequestEmail(
  adminEmails: string[],
  username: string,
  userEmail: string,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const approvalLink = `${baseUrl}/admin/approveUsers`;

  const html = emailLayout(
    '#488ccc',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">New user awaiting approval</h1>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">A new user has verified their email address and is awaiting admin approval:</p>
     <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;border-collapse:collapse;">
       <tr><td style="font-size:14px;color:#888;padding:4px 0;width:120px;">Username</td><td style="font-size:14px;color:#1a1a2e;font-weight:600;">${username}</td></tr>
       <tr><td style="font-size:14px;color:#888;padding:4px 0;">Email</td><td style="font-size:14px;color:#1a1a2e;">${userEmail}</td></tr>
     </table>
     <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
       <tr><td style="background-color:#488ccc;border-radius:10px;">
         <a href="${approvalLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Review approval request</a>
       </td></tr>
     </table>`,
    'This notification was sent because you are an administrator of PolPaL.',
  );

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to: adminEmails,
    subject: `[PolPaL] New user awaiting approval: ${username}`,
    text: `A new user has verified their email and is awaiting approval.\n\nUsername: ${username}\nEmail: ${userEmail}\n\nReview: ${approvalLink}`,
    html,
  });
}

export async function sendApprovalGrantedEmail(to: string, username: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const loginLink = `${baseUrl}/authentication/login`;

  const html = emailLayout(
    '#488ccc',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">Your account has been approved!</h1>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">Hi ${username},</p>
     <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">Your PolPaL account has been reviewed and approved by an administrator. You can now log in and access the platform.</p>
     <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
       <tr><td style="background-color:#488ccc;border-radius:10px;">
         <a href="${loginLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Log in to PolPaL</a>
       </td></tr>
     </table>`,
    'You are receiving this email because you registered for a PolPaL account.',
  );

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to,
    subject: 'Your PolPaL account has been approved',
    text: `Hi ${username},\n\nYour PolPaL account has been approved. You can now log in at: ${loginLink}`,
    html,
  });
}

export async function sendEmailAlreadyRegisteredEmail(to: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const loginLink = `${baseUrl}/authentication/login`;

  const html = emailLayout(
    '#e67e22',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">Registration attempt with your email</h1>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">Someone attempted to create a new PolPaL account using your email address.</p>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">If this was you and you already have an account, you can log in directly:</p>
     <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
       <tr><td style="background-color:#488ccc;border-radius:10px;">
         <a href="${loginLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Log in to PolPaL</a>
       </td></tr>
     </table>
     <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">If you did not attempt to register, you can safely ignore this email. No changes have been made to your account.</p>`,
    'You are receiving this email because someone used your email address during a registration attempt on PolPaL.',
  );

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to,
    subject: 'Someone tried to register with your PolPaL email address',
    text: `Someone attempted to create a new PolPaL account using your email address.\n\nIf this was you and you already have an account, you can log in at: ${loginLink}\n\nIf you did not attempt to register, you can safely ignore this email.`,
    html,
  });
}

export async function sendApprovalDeclinedEmail(to: string, username: string, note: string): Promise<void> {
  const html = emailLayout(
    '#c0392b',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">Your account request was declined</h1>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">Hi ${username},</p>
     <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">Unfortunately, your PolPaL account request has been declined by an administrator.</p>
     <div style="background-color:#fff8f8;border-left:4px solid #c0392b;border-radius:4px;padding:16px 20px;margin:0 0 16px;">
       <p style="margin:0;font-size:14px;color:#555;line-height:1.6;"><strong>Reason:</strong> ${note}</p>
     </div>
     <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">If you believe this is a mistake, please contact the PolPaL team.</p>`,
    'You are receiving this email because you registered for a PolPaL account.',
  );

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to,
    subject: 'Your PolPaL account request was declined',
    text: `Hi ${username},\n\nUnfortunately your PolPaL account request has been declined.\n\nReason: ${note}\n\nIf you believe this is a mistake, please contact the PolPaL team.`,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const link = `${baseUrl}/authentication/reset-password?token=${rawToken}`;

  const html = emailLayout(
    '#488ccc',
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;font-weight:600;">Reset your password</h1>
     <p style="margin:0 0 12px;font-size:15px;color:#555;line-height:1.6;">We received a request to reset the password for your PolPaL account. Click the button below to set a new password.</p>
     <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
     <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
       <tr><td style="background-color:#488ccc;border-radius:10px;">
         <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Reset password</a>
       </td></tr>
     </table>
     <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
     <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${link}" style="color:#488ccc;text-decoration:none;">${link}</a></p>`,
    'You are receiving this email because a password reset was requested for your PolPaL account.',
  );

  await sendMail({
    from: process.env.EMAIL_FROM ?? 'info@polpal.org',
    to,
    subject: 'Reset your PolPaL password',
    text: `We received a request to reset your PolPaL password.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
    html,
  });
}
