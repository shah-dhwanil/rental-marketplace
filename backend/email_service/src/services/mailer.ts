import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import type { SendMailOptions, SentMessageInfo, Transporter } from "nodemailer";

/**
 * Lazily-created transporter — constructed on first call to sendEmail()
 * so that missing env vars only throw at call time, not at import time.
 * This makes the module safe to import in tests without real credentials.
 */
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const { GMAIL_SMTP_USER, GMAIL_SMTP_PASS } = process.env;
  if (!GMAIL_SMTP_USER || !GMAIL_SMTP_PASS) {
    throw new Error(
      "Missing required environment variables: GMAIL_SMTP_USER and GMAIL_SMTP_PASS"
    );
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_SMTP_USER, pass: GMAIL_SMTP_PASS },
  });
  return _transporter;
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

/**
 * Send an email via Gmail SMTP.
 * @returns The Nodemailer SentMessageInfo object on success.
 * @throws If env vars are missing or SMTP transport fails.
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SentMessageInfo> {
  const transporter = getTransporter();
  const fromAddress = process.env.GMAIL_SMTP_USER!;
  const fromName = process.env.EMAIL_FROM_NAME ?? "Rental Marketplace";

  // Convert tags → X-Tag-N headers, then merge with custom headers
  const tagHeaders: Record<string, string> = Object.fromEntries(
    (options.tags ?? []).map((tag, i) => [`X-Tag-${i}`, tag])
  );
  const mergedHeaders = { ...(options.headers ?? {}), ...tagHeaders };

  const mailOptions: SendMailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
    headers: Object.keys(mergedHeaders).length ? mergedHeaders : undefined,
  };

  return transporter.sendMail(mailOptions);
}
