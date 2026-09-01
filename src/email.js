import sgMail from "@sendgrid/mail";

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

function isRender() {
  return Boolean(process.env.RENDER_EXTERNAL_URL);
}

function useSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  return Boolean(key && key.startsWith("SG."));
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
  const url = (process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "").replace(/\/$/, "");
  if (url && !url.includes("localhost")) return url;
  return `http://localhost:${process.env.PORT || process.env.HTTP_PORT || 3000}`;
}

function parseFromAddress() {
  const raw = stripQuotes(process.env.SENDGRID_FROM || process.env.EMAIL_FROM || "");
  if (!raw) throw new Error("Set SENDGRID_FROM on Render — e.g. Yukta <yukta@revops.shop>");
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: raw, name: "Review Capture" };
}

function fromAddress() {
  const { name, email } = parseFromAddress();
  return name ? `${name} <${email}>` : email;
}

function pmEmail() {
  const email = stripQuotes(process.env.PM_EMAIL);
  if (!email) throw new Error("Set PM_EMAIL on Render — where you get BCC and sign alerts");
  return email;
}

function isBlockedFrom(email) {
  const domain = stripQuotes(email).split("@")[1]?.toLowerCase();
  return BLOCKED_FROM_DOMAINS.includes(domain);
}

function formatSendGridError(err) {
  const errors = err?.response?.body?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => e.message).join("; ");
  }
  return err.message || "SendGrid error";
}

function assertSendGrid() {
  if (!useSendGrid()) {
    throw new Error("Set SENDGRID_API_KEY on Render — see RENDER_SETUP.md");
  }
  const from = parseFromAddress();
  if (isBlockedFrom(from.email)) {
    throw new Error(
      `Cannot send FROM ${from.email} — use your verified sender (e.g. yukta@revops.shop). See RENDER_SETUP.md`
    );
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

async function sendMail({ to, subject, html, text, bccSender = false }) {
  assertSendGrid();

  const from = parseFromAddress();
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = { from, to, replyTo: pmEmail(), subject, html, text };
  const bcc = bccSender ? pmEmail() : null;
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
    html: `<p>SendGrid test from Review Capture on Render.</p><p>Time: ${new Date().toISOString()}</p>`,
    text: `Review Capture test — ${new Date().toISOString()}`,
  });
}

export async function verifyEmailConfig() {
  if (!useSendGrid()) {
    return { ok: false, provider: "sendgrid", error: "SENDGRID_API_KEY not set" };
  }
  try {
    const from = parseFromAddress();
    if (isBlockedFrom(from.email)) {
      return { ok: false, provider: "sendgrid", fromEmail: from.email, error: `Use verified sender like yukta@revops.shop, not ${from.email}` };
    }
    return { ok: true, provider: "sendgrid", from: fromAddress(), fromEmail: from.email };
  } catch (err) {
    return { ok: false, provider: "sendgrid", error: err.message };
  }
}

export function isEmailConfigured() {
  return useSendGrid();
}

export function emailProvider() {
  return useSendGrid() ? "sendgrid" : "sendgrid (not configured)";
}

export { baseUrl, pmEmail };
