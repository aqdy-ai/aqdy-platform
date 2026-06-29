import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const smtpHost = env.SMTP_HOST;
    const smtpPort = env.SMTP_PORT;
    const smtpUser = env.SMTP_USER;
    const smtpPass = env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      logger.info("✓ SMTP mail transporter initialized successfully.");
    } else {
      logger.info(
        "ℹ No SMTP credentials found. Email service running in console/logging mode.",
      );
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${env.FRONTEND_URL}/verify?token=${token}`;
    const fromAddress = env.SMTP_FROM;

    const subject = "Aqdy Account Verification | تأكيد حساب عقدي";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Aqdy</title>
  <style>
    body {font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;background-color:#0d0f14;color:#e2e8f0;margin:0;padding:0;-webkit-font-smoothing:antialiased;}
    .container {max-width:600px;margin:40px auto;background-color:#151922;border:1px solid #272d3d;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4);}
    .header {padding:40px 40px 20px;text-align:center;border-bottom:1px solid #272d3d;}
    .logo {font-size:28px;font-weight:800;color:#2563eb;letter-spacing:1px;}
    .content {padding:40px;}
    .section {margin-bottom:35px;padding-bottom:35px;border-bottom:1px dashed #272d3d;}
    .section.last {margin-bottom:0;padding-bottom:0;border-bottom:none;}
    .arabic {direction:rtl;text-align:right;}
    .english {direction:ltr;text-align:left;}
    h2 {font-size:20px;color:#f8fafc;margin-top:0;margin-bottom:15px;}
    p {font-size:15px;line-height:1.6;color:#94a3b8;margin:0 0 20px;}
    .btn-container {text-align:center;margin-top:25px;margin-bottom:10px;}
    .btn {display:inline-block;padding:14px 30px;background-color:#2563eb;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);transition:all 0.2s ease;}
    .btn:hover {background-color:#1d4ed8;box-shadow:0 6px 16px rgba(37,99,235,0.4);}
    .footer {padding:25px 40px;background-color:#0f1219;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #272d3d;}
    .footer p {font-size:12px;margin:0;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">عقدي | AQDY</div></div>
    <div class="content">
      <!-- Arabic Section -->
      <div class="section arabic">
        <h2>تأكيد بريدك الإلكتروني</h2>
        <p>مرحباً ${name}،</p>
        <p>شكرًا لتسجيلك في منصة عقدي. يرجى الضغط على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك بالكامل. <strong>هذا الرابط صالح لمدة 1 ساعة.</strong></p>
        <div class="btn-container"><a href="${verificationUrl}" class="btn" target="_blank">تأكيد الحساب</a></div>
      </div>
      <!-- English Section -->
      <div class="section english last">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering on Aqdy. Please click the button below to verify your email address and activate your account. <strong>This link will expire in 1 hour.</strong></p>
        <div class="btn-container"><a href="${verificationUrl}" class="btn" target="_blank">Verify Email</a></div>
      </div>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Aqdy. All rights reserved.</p><p>عقدي - المساعد القانوني الذكي للقرارات الآمنة</p></div>
  </div>
</body>
</html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Aqdy Platform" <${fromAddress}>`,
          to,
          subject,
          html: htmlContent,
        });
        logger.info(`✓ Verification email successfully sent to ${to}`);
      } catch (error) {
        logger.error(`✗ Failed to send verification email to ${to}:`, error);
        throw error;
      }
    } else {
      logger.info(
        `\n=========================================\n[DEV MAILBOX] verification email sent to ${to}\nSubject: ${subject}\nName: ${name}\nVerification URL: ${verificationUrl}\n=========================================`,
      );
    }
  }

  /**
   * Send password reset email with bilingual content and 1‑hour expiration warning.
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const fromAddress = env.SMTP_FROM;
    const subject = "Aqdy Password Reset | إعادة تعيين كلمة المرور";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Aqdy</title>
  <style>
    body {font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;background-color:#0d0f14;color:#e2e8f0;margin:0;padding:0;-webkit-font-smoothing:antialiased;}
    .container {max-width:600px;margin:40px auto;background-color:#151922;border:1px solid #272d3d;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4);}
    .header {padding:40px 40px 20px;text-align:center;border-bottom:1px solid #272d3d;}
    .logo {font-size:28px;font-weight:800;color:#2563eb;letter-spacing:1px;}
    .content {padding:40px;}
    .section {margin-bottom:35px;padding-bottom:35px;border-bottom:1px dashed #272d3d;}
    .section.last {margin-bottom:0;padding-bottom:0;border-bottom:none;}
    .arabic {direction:rtl;text-align:right;}
    .english {direction:ltr;text-align:left;}
    h2 {font-size:20px;color:#f8fafc;margin-top:0;margin-bottom:15px;}
    p {font-size:15px;line-height:1.6;color:#94a3b8;margin:0 0 20px;}
    .btn-container {text-align:center;margin-top:25px;margin-bottom:10px;}
    .btn {display:inline-block;padding:14px 30px;background-color:#2563eb;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);transition:all 0.2s ease;}
    .btn:hover {background-color:#1d4ed8;box-shadow:0 6px 16px rgba(37,99,235,0.4);}
    .footer {padding:25px 40px;background-color:#0f1219;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #272d3d;}
    .footer p {font-size:12px;margin:0;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">عقدي | AQDY</div></div>
    <div class="content">
      <!-- Arabic Section -->
      <div class="section arabic">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>مرحباً ${name}،</p>
        <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك. يرجى الضغط على الزر أدناه لتعيين كلمة مرور جديدة. <strong>هذا الرابط صالح لمدة 1 ساعة.</strong></p>
        <div class="btn-container"><a href="${resetUrl}" class="btn" target="_blank">إعادة تعيين كلمة المرور</a></div>
      </div>
      <!-- English Section -->
      <div class="section english last">
        <h2>Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset for your account. Click the button below to set a new password. <strong>This link will expire in 1 hour.</strong></p>
        <div class="btn-container"><a href="${resetUrl}" class="btn" target="_blank">Reset Password</a></div>
      </div>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Aqdy. All rights reserved.</p><p>عقدي - المساعد القانوني الذكي للقرارات الآمنة</p></div>
  </div>
</body>
</html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Aqdy Platform" <${fromAddress}>`,
          to,
          subject,
          html: htmlContent,
        });
        logger.info(`✓ Password reset email sent to ${to}`);
      } catch (error) {
        logger.error(`✗ Failed to send password reset email to ${to}:`, error);
        throw error;
      }
    } else {
      logger.info(
        `\n=========================================\n[DEV MAILBOX] password reset email sent to ${to}\nSubject: ${subject}\nName: ${name}\nReset URL: ${resetUrl}\n=========================================`,
      );
    }
  }
}

export const emailService = new EmailService();
