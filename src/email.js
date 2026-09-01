import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";

const VERIFY_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 20_000;

const BLOCKED_FROM_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "aol.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
];

function stripQuotes(s) {
  return (s || "").replace(/^["']|["']$/g, "").trim();
}

function isCloudHost() {
  return Boolean(
    process.env.RENDER_EXTERNAL_URL ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RAILWAY_ENVIRONMENT
  );
}

function useResend() {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key.startsWith("re_"));
}

function useSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  return Boolean(key && key.startsWith("SG."));
}

function useCloudEmailApi() {
  return useResend() || useSendGrid();
}

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, "") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function baseUrl() {
  const isProd = process.env.NODE_ENV === "production" || isCloudHost();

  const candidates = [
    process.env.APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null,
    process.env.RENDER_EXTERNAL_URL,
    process.env.PUBLIC_BASE_URL,
  ]
    .filter(Boolean)
    .map((u) => u.replace(/\/$/, ""));

  for (const url of candidates) {
    if (isProd && url.includes("localhost")) continue;
    return url;
  }

  return `http://localhost:${process.env.PORT || process.env.HTTP_PORT || 3000}`;
}

function parseFromAddress() {
  const raw = stripQuotes(
    process.env.RESEND_FROM ||
      process.env.SENDGRID_FROM ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER
  );
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: raw, name: "Review Capture" };
}

function fromAddress() {
  const { name, email } = parseFromAddress();
  return name ? `${name} <${email}>` : email;
}

function pmEmail() {
  return process.env.PM_EMAIL || process.env.SMTP_USER;
}

function isBlockedCloudFrom(email) {
  const domain = stripQuotes(email).split("@")[1]?.toLowerCase();
  return BLOCKED_FROM_DOMAINS.includes(domain);
}

function blockedFromMessage(fromEmail) {
  return (
    `Cannot send FROM ${fromEmail} via a cloud email service — Gmail/Yahoo block it (DMARC). ` +
    `Use a domain you own: e.g. RESEND_FROM=reviews@yourdomain.com. ` +
    `Replies go to PM_EMAIL (${pmEmail()}). See RAILWAY_SETUP.md`
  );
}

function cloudEmailRequiredMessage() {
  return (
    "Gmail SMTP does not work on cloud hosts (Render, Railway, etc.). " +
    "Add RESEND_API_KEY + RESEND_FROM with a domain you own. See RAILWAY_SETUP.md"
  );
}

function formatSendGridError(err) {
  const errors = err?.response?.body?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => e.message).join("; ");
  }
  return err.message || "SendGrid error";
}

function assertCanSend() {
  if (useCloudEmailApi()) return;
  if (isCloudHost()) {
    throw new Error(cloudEmailRequiredMessage());
  }
  if (!getTransporter()) {
    throw new Error("Email not configured — set RESEND_API_KEY (cloud) or SMTP_* (local)");
  }
}

function reviewAndSignEmailHtml(client, reviewText, sessionId) {
  const signUrl = `${baseUrl()}/r/${sessionId}/sign`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <p>Hi ${client.contactName},</p>
  <p>We loved working with <strong>${client.name}</strong> and would be grateful if you'd share a short testimonial. Based on our project together, we drafted this for you:</p>
  <blockquote style="border-left: 4px solid #611f69; padding-left: 16px; margin: 24px 0; font-style: italic;">
    "${reviewText}"
  </blockquote>
  <p>Happy with it? Click below to approve and sign. Want changes? Just reply to this email.</p>
  <p style="margin: 32px 0;">
    <a href="${signUrl}" style="background: #611f69; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">✍️ Sign &amp; approve</a>
  </p>
  <p style="color: #616061; font-size: 14px;">Or copy this link: ${signUrl}</p>
</body>
</html>`;
}

async function sendViaResend({ to, subject, html, text, bccSender = false }) {
  const from = parseFromAddress();
  if (isBlockedCloudFrom(from.email)) {
    throw new Error(blockedFromMessage(from.email));
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const bcc = bccSender ? stripQuotes(pmEmail()) : undefined;
  const payload = {
    from: fromAddress(),
    to,
    replyTo: pmEmail(),
    subject,
    html,
    text,
  };
  if (bcc && bcc.toLowerCase() !== stripQuotes(to).toLowerCase()) {
    payload.bcc = bcc;
  }

  const { data, error } = await withTimeout(
    resend.emails.send(payload),
    SEND_TIMEOUT_MS,
    "Email send"
  );

  if (error) throw new Error(error.message);
  console.log(
    `Email sent (Resend) → to: ${to}${payload.bcc ? `, bcc: ${payload.bcc}` : ""}, from: ${from.email}, id: ${data.id}`
  );
  return { messageId: data.id };
}

async function sendViaSendGrid({ to, subject, html, text, bccSender = false }) {
  const from = parseFromAddress();
  if (isBlockedCloudFrom(from.email)) {
    throw new Error(blockedFromMessage(from.email));
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = { from, to, replyTo: pmEmail(), subject, html, text };

  const bcc = bccSender ? stripQuotes(pmEmail()) : null;
  if (bcc && bcc.toLowerCase() !== stripQuotes(to).toLowerCase()) {
    msg.bcc = bcc;
  }

  try {
    const [response] = await withTimeout(sgMail.send(msg), SEND_TIMEOUT_MS, "Email send");
    const messageId = response?.headers?.["x-message-id"] || "sendgrid";
    console.log(
      `Email sent (SendGrid) → to: ${to}${msg.bcc ? `, bcc: ${msg.bcc}` : ""}, from: ${from.email}, id: ${messageId}`
    );
    return { messageId };
  } catch (err) {
    throw new Error(formatSendGridError(err));
  }
}

async function sendViaSmtp({ to, subject, html, text, bccSender = false }) {
  const transporter = getTransporter();
  if (!transporter) throw new Error("Email not configured");

  const mail = { from: fromAddress(), to, replyTo: pmEmail(), subject, html, text };
  if (bccSender) {
    const bcc = stripQuotes(pmEmail());
    if (bcc.toLowerCase() !== stripQuotes(to).toLowerCase()) {
      mail.bcc = bcc;
    }
  }

  const info = await withTimeout(transporter.sendMail(mail), SEND_TIMEOUT_MS, "Email send");
  console.log(
    `Email sent (Gmail SMTP) → to: ${to}${mail.bcc ? `, bcc: ${mail.bcc}` : ""}, id: ${info.messageId}`
  );
  return info;
}

async function sendMail(opts) {
  assertCanSend();
  if (useResend()) return sendViaResend(opts);
  if (useSendGrid()) return sendViaSendGrid(opts);
  return sendViaSmtp(opts);
}

export async function sendReviewAndSignEmail(client, sessionId, reviewText) {
  if (!client.email) throw new Error(`No email for ${client.name}`);
  const signUrl = `${baseUrl()}/r/${sessionId}/sign`;
  return sendMail({
    to: client.email,
    bccSender: true,
    subject: `Your testimonial for ${client.name} — please review & sign`,
    html: reviewAndSignEmailHtml(client, reviewText, sessionId),
    text: `Hi ${client.contactName},\n\n"${reviewText}"\n\nSign here: ${signUrl}`,
  });
}

export async function sendPmSigned(client, reviewText) {
  return sendMail({
    to: pmEmail(),
    bccSender: false,
    subject: `✅ Review signed — ${client.name}`,
    html: `<p><strong>${client.contactName}</strong> at <strong>${client.name}</strong> signed their testimonial:</p>
<blockquote>${reviewText}</blockquote>`,
    text: `Signed by ${client.contactName} (${client.name}):\n"${reviewText}"`,
  });
}

export async function sendTestEmail() {
  return sendMail({
    to: pmEmail(),
    bccSender: false,
    subject: "Review Capture — test email",
    html: `<p>Test email from Review Capture.</p><p>Time: ${new Date().toISOString()}</p>`,
    text: `Review Capture test — ${new Date().toISOString()}`,
  });
}

export async function verifyEmailConfig() {
  const from = parseFromAddress();

  if (useResend() || useSendGrid()) {
    if (isBlockedCloudFrom(from.email)) {
      return {
        ok: false,
        provider: useResend() ? "resend" : "sendgrid",
        from: fromAddress(),
        fromEmail: from.email,
        error: blockedFromMessage(from.email),
      };
    }
    return {
      ok: true,
      provider: useResend() ? "resend" : "sendgrid",
      from: fromAddress(),
      fromEmail: from.email,
    };
  }

  if (isCloudHost()) {
    return { ok: false, provider: "none", error: cloudEmailRequiredMessage() };
  }

  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "Email not configured", provider: "none" };
  try {
    await withTimeout(transporter.verify(), VERIFY_TIMEOUT_MS, "SMTP verify");
    return { ok: true, provider: "gmail smtp", user: process.env.SMTP_USER };
  } catch (err) {
    return { ok: false, error: err.message, provider: "gmail smtp" };
  }
}

export function isEmailConfigured() {
  return useCloudEmailApi() || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailProvider() {
  if (useResend()) return "resend";
  if (useSendGrid()) return "sendgrid";
  if (isCloudHost() && !useCloudEmailApi()) return "none (cloud needs Resend/SendGrid)";
  if (isEmailConfigured()) return "gmail smtp (local only)";
  return "none";
}

export { baseUrl, pmEmail };
