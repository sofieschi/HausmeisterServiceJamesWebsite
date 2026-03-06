const { Resend } = require("resend");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }

  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  // Vercel: configure RESEND_API_KEY in Project Settings -> Environment Variables.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "server_misconfigured" });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (_error) {
    return res.status(400).json({ success: false, error: "invalid_payload" });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const telefon = String(body.telefon || "").trim();
  const nachricht = String(body.nachricht || "").trim();
  const website = String(body.website || "").trim();

  // Honeypot: silently accept to avoid signaling bots.
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!name || !email || !nachricht || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, error: "validation_failed" });
  }

  const resend = new Resend(apiKey);
  const text = [
    "Neue Anfrage über die Website",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Telefon: ${telefon || "nicht angegeben"}`,
    "",
    "Nachricht:",
    nachricht,
  ].join("\n");

  try {
    await resend.emails.send({
      // For production branding, replace this sender after verifying your domain in Resend.
      from: "Website Anfrage <onboarding@resend.dev>",
      to: "info@hausmeister-james.de",
      subject: "Neue Anfrage über die Website – Hausmeisterservice James GbR",
      text,
      reply_to: email,
    });

    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ success: false, error: "email_send_failed" });
  }
};
