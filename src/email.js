import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const VERIFY_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 20_000;

function isRender() {
  return Boolean(process.env.RENDER_EXTERNAL_URL);
}

function useSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  return Boolean(key && key.startsWith("SG."));
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
  const isProd = process.env.NODE_ENV === "production" || isRender();

  const candidates = [
    process.env.APP_URL,
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

function stripQuotes(s) {
  return (s || "").replace(/^["']|["']$/g, "").trim();
}

function parseFromAddress() {
  const raw = stripQuotes(
    process.env.SENDGRID_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER
  );
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: raw, name: "Review Capture" };
}

function formatSendGridError(err) {
  const errors = err?.response?.body?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => e.message).join("; ");
  }
  return err.message || "SendGrid error";
}

function fromAddress() {
  const { name, email } = parseFromAddress();
  return name ? `${name} <${email}>` : email;
}

function pmEmail() {
  return process.env.PM_EMAIL || process.env.SMTP_USER;
}

function assertCanSend() {
  if (useSendGrid()) return;
  if (isRender()) {
    throw new Error(
      "Gmail SMTP is blocked on Render. Add SENDGRID_API_KEY — see RENDER_EMAIL_SETUP.md"
    );
  }
  if (!getTransporter()) {
    throw new Error("Email not configured — set SENDGRID_API_KEY or SMTP_* in .env");
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

async function sendViaSendGrid({ to, subject, html, text, bccSender = false }) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const from = parseFromAddress();
  const msg = { from, to, replyTo: pmEmail(), subject, html, text };

  // SendGrid rejects duplicate addresses across to/cc/bcc
  const bcc = bccSender ? stripQuotes(pmEmail()) : null;
  if (bcc && bcc.toLowerCase() !== stripQuotes(to).toLowerCase()) {
    msg.bcc = bcc;
  }

  try {
    await withTimeout(sgMail.send(msg), SEND_TIMEOUT_MS, "Email send");
  } catch (err) {
    throw new Error(formatSendGridError(err));
  }

  console.log(
    `Email sent (SendGrid) → to: ${to}${msg.bcc ? `, bcc: ${msg.bcc}` : ""}, from: ${from.email}`
  );
  return { messageId: "sendgrid" };
}

async function sendViaSmtp({ to, subject, html, text, bccSender = false }) {
  const transporter = getTransporter();
  if (!transporter) throw new Error("Email not configured — set SENDGRID_API_KEY or SMTP_* in .env");

  const mail = { from: fromAddress(), to, replyTo: pmEmail(), subject, html, text };
  if (bccSender) mail.bcc = pmEmail();

  const info = await withTimeout(transporter.sendMail(mail), SEND_TIMEOUT_MS, "Email send");
  console.log(
    `Email sent (SMTP) → to: ${to}${bccSender ? `, bcc: ${pmEmail()}` : ""}, messageId: ${info.messageId}`
  );
  return info;
}

async function sendMail(opts) {
  assertCanSend();
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

export async function verifyEmailConfig() {
  if (useSendGrid()) {
    const from = parseFromAddress();
    return { ok: true, provider: "sendgrid", from: fromAddress(), fromEmail: from.email };
  }

  if (isRender()) {
    return {
      ok: false,
      provider: "smtp",
      error: "Gmail SMTP blocked on Render — add SENDGRID_API_KEY (see RENDER_EMAIL_SETUP.md)",
    };
  }

  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "SMTP not configured", provider: "none" };
  try {
    await withTimeout(transporter.verify(), VERIFY_TIMEOUT_MS, "SMTP verify");
    return { ok: true, provider: "smtp", user: process.env.SMTP_USER };
  } catch (err) {
    return { ok: false, error: err.message, provider: "smtp" };
  }
}

export function isEmailConfigured() {
  return useSendGrid() || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailProvider() {
  if (useSendGrid()) return "sendgrid";
  if (isRender()) return "gmail smtp (blocked on Render)";
  if (isEmailConfigured()) return "gmail smtp";
  return "none";
}

export { baseUrl, pmEmail };
