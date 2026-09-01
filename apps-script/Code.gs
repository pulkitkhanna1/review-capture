/**
 * Review Capture — ONE FILE ONLY (paste entire file into Code.gs)
 * Sends from pulkitkhanna1@gmail.com via GmailApp
 *
 * After first deploy, paste your web app URL below (ends with /exec):
 */
var WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycby8VED2MXMkTYqVKkx87rayGxzgbAfK8scmRblpIzdN4NZCc2zx8CCbJjWUn6K994MY/exec";

var PM_EMAIL = "pulkitkhanna1@gmail.com";

var CLIENTS = [
  {
    id: "Hive-sphere",
    name: "Hive Sphere",
    contactName: "Yukta Kandhari",
    email: "Yukta.Kandhari@gmail.com",
    projectSummary:
      "Built a 12-episode branded podcast series. Delivered on time, 2M+ downloads in first quarter.",
    outcomes: ["2M+ downloads", "Featured in AdWeek", "Renewed for Season 2"],
  },
  {
    id: "bright-path",
    name: "Bright Path Media",
    contactName: "Alex Rivera",
    email: "pulkitkhanna1@gmail.com",
    projectSummary:
      "UGC content pipeline and Instagram Reels strategy. 40% increase in engagement.",
    outcomes: ["40% engagement lift", "15 viral reels", "Reduced production cost by 30%"],
  },
  {
    id: "northstar-audio",
    name: "Northstar Audio",
    contactName: "Priya Patel",
    email: "pulkitkhanna1@gmail.com",
    projectSummary:
      "Full audio drama production — scripting, casting, sound design, and distribution.",
    outcomes: ["Top 10 fiction podcast", "4.9 star rating", "500K subscribers"],
  },
];

/** Run this once from the editor (▶ Run) to authorize Gmail before deploying */
function testSetup() {
  GmailApp.sendEmail(PM_EMAIL, "Review Capture setup OK", "Gmail works. Now deploy as web app.");
  Logger.log("OK — check " + PM_EMAIL);
}

function getClientById(id) {
  for (var i = 0; i < CLIENTS.length; i++) {
    if (CLIENTS[i].id === id) return CLIENTS[i];
  }
  return null;
}

function generateDraft(client) {
  var outcome = client.outcomes[0] || "great results";
  return (
    "Working with the team on " +
    client.name +
    " was a fantastic experience. " +
    client.projectSummary +
    " We saw " +
    outcome +
    " and would highly recommend them. — " +
    client.contactName
  );
}

function webAppUrl() {
  try {
    var url = ScriptApp.getService().getUrl();
    if (url) return url;
  } catch (err) {}
  return WEB_APP_URL;
}

function esc_(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isAdmin_() {
  try {
    var email = Session.getEffectiveUser().getEmail();
    return email && email.toLowerCase() === PM_EMAIL.toLowerCase();
  } catch (e) {
    return false;
  }
}

function requireAdmin_() {
  if (!isAdmin_()) {
    throw new Error("Sign in with " + PM_EMAIL + " in this browser, then refresh.");
  }
}

function readState_() {
  var raw = PropertiesService.getScriptProperties().getProperty("state");
  if (!raw) return { sessions: {}, declined: [] };
  return JSON.parse(raw);
}

function writeState_(state) {
  PropertiesService.getScriptProperties().setProperty("state", JSON.stringify(state));
}

function getActiveSession_(clientId) {
  var state = readState_();
  for (var id in state.sessions) {
    var s = state.sessions[id];
    if (
      s.clientId === clientId &&
      (s.status === "awaiting_signature" || s.status === "generating" || s.status === "failed")
    ) {
      return s;
    }
  }
  return null;
}

function createSession_(clientId) {
  var state = readState_();
  var id = clientId + "-" + Date.now();
  state.sessions[id] = {
    id: id,
    clientId: clientId,
    status: "generating",
    createdAt: new Date().toISOString(),
  };
  writeState_(state);
  return state.sessions[id];
}

function updateSession_(sessionId, patch, eventName) {
  var state = readState_();
  var s = state.sessions[sessionId];
  if (!s) return null;
  for (var key in patch) s[key] = patch[key];
  writeState_(state);
  return s;
}

function sendReviewEmail_(client, sessionId, draftText) {
  var signUrl = webAppUrl() + "?action=sign&sessionId=" + encodeURIComponent(sessionId);
  var subject = "Your testimonial for " + client.name + " — please review & sign";
  var html =
    "<p>Hi " +
    esc_(client.contactName) +
    ",</p>" +
    "<p>We loved working with <strong>" +
    esc_(client.name) +
    "</strong> and would be grateful if you'd share a short testimonial:</p>" +
    '<blockquote style="border-left:4px solid #611f69;padding-left:16px;font-style:italic;">"' +
    esc_(draftText) +
    '"</blockquote>' +
    '<p><a href="' +
    signUrl +
    '" style="background:#611f69;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Sign and approve</a></p>' +
    "<p style='color:#666;font-size:14px;'>" +
    signUrl +
    "</p>";
  var text = "Hi " + client.contactName + ',\n\n"' + draftText + '"\n\nSign: ' + signUrl;
  var opts = { htmlBody: html, name: "Pulkit" };
  if (client.email.toLowerCase() !== PM_EMAIL.toLowerCase()) {
    opts.bcc = PM_EMAIL;
  }
  GmailApp.sendEmail(client.email, subject, text, opts);
}

function sendPmSigned_(client, reviewText) {
  GmailApp.sendEmail(
    PM_EMAIL,
    "Review signed — " + client.name,
    client.contactName + " signed:\n\n" + reviewText
  );
}

function initiateReview_(clientId) {
  requireAdmin_();
  var client = getClientById(clientId);
  if (!client) throw new Error("Client not found");
  if (getActiveSession_(clientId)) throw new Error("Review already in progress");
  var session = createSession_(clientId);
  try {
    var draft = generateDraft(client);
    sendReviewEmail_(client, session.id, draft);
    updateSession_(session.id, {
      status: "awaiting_signature",
      draftText: draft,
      emailSentAt: new Date().toISOString(),
      sentTo: client.email,
    });
    return session.id;
  } catch (err) {
    updateSession_(session.id, { status: "failed", error: String(err.message) });
    throw err;
  }
}

function processSign_(sessionId) {
  var session = readState_().sessions[sessionId];
  if (!session || !session.draftText) {
    return { title: "Invalid link", message: "This link is invalid or expired." };
  }
  if (session.status === "signed") {
    return { title: "Already signed", message: "Thank you — already captured!" };
  }
  var client = getClientById(session.clientId);
  updateSession_(sessionId, { status: "signed", signedAt: new Date().toISOString() });
  try {
    if (client) sendPmSigned_(client, session.draftText);
  } catch (e) {}
  return { title: "Signed!", message: "Your testimonial is saved. Thank you!" };
}

function pageWrap_(title, body) {
  return (
    "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<title>" +
    esc_(title) +
    "</title>" +
    "<style>body{font-family:-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#f8f8f8;color:#1a1a1a}" +
    ".card{background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)}" +
    ".btn{display:inline-block;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:.9rem;text-decoration:none}" +
    ".btn-yes{background:#2eb67d;color:#fff}.btn-no,.btn-secondary{background:#e8e8e8;color:#1a1a1a}.btn-primary{background:#611f69;color:#fff}" +
    ".meta{color:#616061;font-size:.9rem;margin-top:4px}.alert{padding:12px;border-radius:6px;margin-bottom:16px;background:#e8f5e9}" +
    ".warn{background:#fff3e0;color:#e65100}blockquote{border-left:4px solid #611f69;padding-left:16px;font-style:italic}" +
    ".actions{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}form.inline{display:inline}textarea{width:100%;margin-top:8px;padding:8px}</style></head><body>" +
    body +
    "</body></html>"
  );
}

function renderDashboard_(flash, error) {
  var url = webAppUrl();
  var state = readState_();
  var html = "";

  if (flash === "sent") html += '<div class="alert">Email sent via Gmail</div>';
  if (flash === "test") html += '<div class="alert">Test email sent</div>';
  if (flash === "resent") html += '<div class="alert">Email resent</div>';
  if (error) html += '<div class="alert warn">' + esc_(error) + "</div>";

  html +=
    '<div class="alert">Gmail · ' +
    esc_(PM_EMAIL) +
    ' · <form class="inline" method="post" action="' +
    url +
    '"><input type="hidden" name="action" value="test"><button class="btn btn-secondary">Test email</button></form></div>';
  html += "<h1>Reviews to be taken</h1>";

  for (var i = 0; i < CLIENTS.length; i++) {
    var c = CLIENTS[i];
    var active = getActiveSession_(c.id);
    html += '<div class="card"><div><strong>' + esc_(c.name) + "</strong></div>";
    html += '<div class="meta">' + esc_(c.contactName) + " · " + esc_(c.email) + "</div>";
    html += '<div class="meta">' + esc_(c.projectSummary.substring(0, 80)) + "…</div>";

    if (active) {
      if (active.draftText) html += "<blockquote>" + esc_(active.draftText) + "</blockquote>";
      html += '<div class="actions"><a class="btn btn-primary" href="' + url + "?action=sign&sessionId=" + encodeURIComponent(active.id) + '">Open sign link</a>';
      html +=
        '<form class="inline" method="post" action="' +
        url +
        '"><input type="hidden" name="action" value="resend"><input type="hidden" name="sessionId" value="' +
        esc_(active.id) +
        '"><button class="btn btn-secondary">Resend</button></form>';
      html +=
        '<form class="inline" method="post" action="' +
        url +
        '"><input type="hidden" name="action" value="cancel"><input type="hidden" name="sessionId" value="' +
        esc_(active.id) +
        '"><button class="btn btn-no">Cancel</button></form></div>';
    } else {
      html +=
        '<div class="actions"><form class="inline" method="post" action="' +
        url +
        '"><input type="hidden" name="action" value="request"><input type="hidden" name="clientId" value="' +
        esc_(c.id) +
        '"><button class="btn btn-yes">Yes — send review email</button></form></div>';
    }
    html += "</div>";
  }

  return pageWrap_("Review Capture", html);
}

function doGet(e) {
  try {
    e = e || {};
    var p = e.parameter || {};

    if (p.action === "sign") {
      var result = processSign_(p.sessionId);
      return HtmlService.createHtmlOutput(
        pageWrap_(result.title, '<div class="card" style="text-align:center;margin-top:48px"><h1>' + esc_(result.title) + "</h1><p>" + esc_(result.message) + "</p></div>")
      ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    if (!isAdmin_()) {
      return HtmlService.createHtmlOutput(
        pageWrap_(
          "Sign in",
          "<div class='card'><h2>Review Capture</h2><p>Sign in with <strong>" +
            esc_(PM_EMAIL) +
            "</strong> in Chrome, then refresh this page.</p></div>"
        )
      ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return HtmlService.createHtmlOutput(renderDashboard_(p.flash || "", p.error ? decodeURIComponent(p.error) : "")).setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
  } catch (err) {
    return HtmlService.createHtmlOutput(
      pageWrap_("Error", '<div class="alert warn">' + esc_(err.message) + "</div>")
    );
  }
}

function doPost(e) {
  var url = webAppUrl();
  var redirect = url;
  try {
    e = e || {};
    var p = e.parameter || {};
    requireAdmin_();
    if (p.action === "request") {
      initiateReview_(p.clientId);
      redirect += "?flash=sent";
    } else if (p.action === "cancel") {
      updateSession_(p.sessionId, { status: "cancelled" });
      redirect += "?flash=cancelled";
    } else if (p.action === "resend") {
      var sess = readState_().sessions[p.sessionId];
      sendReviewEmail_(getClientById(sess.clientId), p.sessionId, sess.draftText);
      redirect += "?flash=resent";
    } else if (p.action === "test") {
      GmailApp.sendEmail(PM_EMAIL, "Review Capture test", "Test at " + new Date());
      redirect += "?flash=test";
    }
  } catch (err) {
    redirect += "?error=" + encodeURIComponent(String(err.message));
  }
  return HtmlService.createHtmlOutput('<script>location.href="' + redirect + '";</script>');
}
