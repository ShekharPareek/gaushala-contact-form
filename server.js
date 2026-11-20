require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();
const defaultOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "10kb" }));

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

app.post("/contact", async (req, res) => {
  const { name, email, service, message } = req.body || {};
  const fields = { name, email, service, message };
  const limits = { name: 100, email: 254, service: 100, message: 5000 };

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim() || value.length > limits[field]) {
      return res.status(400).json({
        success: false,
        message: `Please provide a valid ${field}.`
      });
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address."
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now."
    });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Gaushala Contact <onboarding@resend.dev>",
      to: "shekharpareek30@gmail.com",
      replyTo: email,
      subject: `New Contact Form: ${service}`,
      html: `
        <h2>New Contact Enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
        <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
        <p><strong>Service:</strong> ${escapeHtml(service.trim())}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message.trim()).replace(/\r?\n/g, "<br>")}</p>
      `
    });

    if (error) {
      console.error("Resend failed to send the contact email:", error);
      return res.status(502).json({
        success: false,
        message: "Unable to send your message right now."
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Contact email delivery failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now."
    });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Contact form backend listening on port ${port}.`);
  });
}

module.exports = app;
