/**
 * Review Capture — Google Apps Script
 * Sends from pulkitkhanna1@gmail.com via GmailApp. No Render, no SendGrid.
 */

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
  return ScriptApp.getService().getUrl();
}

function isAdmin_() {
  try {
    return Session.getEffectiveUser().getEmail() === PM_EMAIL;
  } catch (e) {
    return false;
  }
}

function requireAdmin_() {
  if (!isAdmin_()) {
    throw new Error("Sign in with " + PM_EMAIL + " to use the dashboard.");
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

function getActiveSessionForClient_(clientId) {
  var state = readState_();
  var sessions = state.sessions;
  var now = Date.now();
  for (var id in sessions) {
    var s = sessions[id];
    if (s.clientId !== clientId) continue;
    if (s.status === "generating" || s.status === "awaiting_signature" || s.status === "failed") {
      if (s.status === "generating" && now - new Date(s.createdAt).getTime() > 120000) {
        s.status = "cancelled";
        writeState_(state);
        continue;
      }
      return s;
    }
  }
  writeState_(state);
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
    history: [{ at: new Date().toISOString(), event: "initiated" }],
  };
  writeState_(state);
  return state.sessions[id];
}

function updateSession_(sessionId, patch, eventName) {
  var state = readState_();
  var s = state.sessions[sessionId];
  if (!s) return null;
  for (var key in patch) s[key] = patch[key];
  s.history.push({ at: new Date().toISOString(), event: eventName || "updated" });
  writeState_(state);
  return s;
}

function sendReviewEmail_(client, sessionId, draftText) {
  var signUrl = webAppUrl() + "?action=sign&sessionId=" + encodeURIComponent(sessionId);
  var subject = "Your testimonial for " + client.name + " — please review & sign";
  var html =
    "<p>Hi " +
    client.contactName +
    ",</p>" +
    "<p>We loved working with <strong>" +
    client.name +
    "</strong> and would be grateful if you'd share a short testimonial. Based on our project together, we drafted this for you:</p>" +
    '<blockquote style="border-left:4px solid #611f69;padding-left:16px;font-style:italic;">"' +
    draftText +
    '"</blockquote>' +
    "<p>Happy with it? Click below to approve and sign. Want changes? Just reply to this email.</p>" +
    '<p><a href="' +
    signUrl +
    '" style="background:#611f69;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">✍️ Sign &amp; approve</a></p>' +
    "<p style='color:#666;font-size:14px;'>Or copy: " +
    signUrl +
    "</p>";
  var text = 'Hi ' + client.contactName + ',\n\n"' + draftText + '"\n\nSign here: ' + signUrl;

  var opts = { htmlBody: html, name: "Pulkit" };
  if (client.email.toLowerCase() !== PM_EMAIL.toLowerCase()) {
    opts.bcc = PM_EMAIL;
  }

  GmailApp.sendEmail(client.email, subject, text, opts);
}

function sendPmSigned_(client, reviewText) {
  GmailApp.sendEmail(
    PM_EMAIL,
    "✅ Review signed — " + client.name,
    client.contactName + " signed:\n\n" + reviewText,
    {
      htmlBody:
        "<p><strong>" +
        client.contactName +
        "</strong> at <strong>" +
        client.name +
        "</strong> signed:</p><blockquote>" +
        reviewText +
        "</blockquote>",
    }
  );
}

function initiateReview_(clientId) {
  requireAdmin_();
  var client = getClientById(clientId);
  if (!client) throw new Error("Client not found");
  if (!client.email) throw new Error("No email for client");
  if (getActiveSessionForClient_(clientId)) throw new Error("Review already in progress");

  var session = createSession_(clientId);
  try {
    var draft = generateDraft(client);
    sendReviewEmail_(client, session.id, draft);
    updateSession_(session.id, {
      status: "awaiting_signature",
      draftText: draft,
      emailSentAt: new Date().toISOString(),
      sentTo: client.email,
    }, "review_sent");
    return session.id;
  } catch (err) {
    updateSession_(session.id, { status: "failed", error: String(err.message) }, "failed");
    throw err;
  }
}

function processSign_(sessionId) {
  var state = readState_();
  var session = state.sessions[sessionId];
  if (!session || !session.draftText) {
    return { ok: false, title: "Invalid link", message: "This sign link is invalid or expired." };
  }
  if (session.status === "signed") {
    return { ok: true, title: "Already signed!", message: "Your testimonial was already captured. Thank you!" };
  }
  var client = getClientById(session.clientId);
  updateSession_(sessionId, {
    status: "signed",
    signedAt: new Date().toISOString(),
  }, "client_signed");
  try {
    if (client) sendPmSigned_(client, session.draftText);
  } catch (e) {
    Logger.log("PM notify failed: " + e);
  }
  return {
    ok: true,
    title: "Signed! ✅",
    message: "Your testimonial has been signed and saved. Thank you!",
  };
}

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};

  if (p.action === "sign") {
    var result = processSign_(p.sessionId);
    var t = HtmlService.createTemplateFromFile("SignResult");
    t.title = result.title;
    t.message = result.message;
    return t.evaluate().setTitle(result.title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (!isAdmin_()) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;max-width:480px;margin:48px auto;padding:24px'>" +
        "<h2>Review Capture</h2>" +
        "<p>Sign in with <strong>" +
        PM_EMAIL +
        "</strong> in this browser, then refresh.</p>" +
        "</div>"
    );
  }

  var t = HtmlService.createTemplateFromFile("Dashboard");
  t.clients = CLIENTS;
  t.state = readState_();
  t.webAppUrl = webAppUrl();
  t.pmEmail = PM_EMAIL;
  t.flash = p.flash || "";
  t.error = p.error || "";
  return t.evaluate().setTitle("Review Capture").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  e = e || {};
  var p = e.parameter || {};
  var action = p.action || "";
  var redirect = webAppUrl();

  try {
    requireAdmin_();
    if (action === "request") {
      initiateReview_(p.clientId);
      redirect += "?flash=sent";
    } else if (action === "cancel") {
      updateSession_(p.sessionId, { status: "cancelled" }, "cancelled");
      redirect += "?flash=cancelled";
    } else if (action === "skip") {
      var state = readState_();
      state.declined.push({
        clientId: p.clientId,
        reason: p.reason || "No reason",
        at: new Date().toISOString(),
      });
      writeState_(state);
      redirect += "?flash=skipped";
    } else if (action === "resend") {
      var sess = readState_().sessions[p.sessionId];
      var c = getClientById(sess.clientId);
      sendReviewEmail_(c, p.sessionId, sess.draftText);
      redirect += "?flash=resent";
    } else if (action === "test") {
      GmailApp.sendEmail(
        PM_EMAIL,
        "Review Capture — test",
        "Gmail Apps Script test at " + new Date().toISOString()
      );
      redirect += "?flash=test";
    }
  } catch (err) {
    redirect += "?error=" + encodeURIComponent(String(err.message));
  }

  return HtmlService.createHtmlOutput(
    '<script>window.top.location.href="' + redirect + '";</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
