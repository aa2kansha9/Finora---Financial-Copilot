const express = require("express");
const router  = express.Router();
const nodemailer = require("nodemailer");

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ message: "All fields are required." });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.CONTACT_EMAIL_USER,
        pass: process.env.CONTACT_EMAIL_PASS,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Finora Contact" <${process.env.CONTACT_EMAIL_USER}>`,
      to:   "aakansha.aparab@gmail.com",
      replyTo: email,
      subject: `Finora — Message from ${name}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;padding:2rem;background:#f5f3e8;border-radius:12px;">
          <h2 style="color:#0A3323;margin:0 0 0.5rem;">New message from Finora</h2>
          <hr style="border:none;border-top:2px solid #839958;margin:1rem 0;" />
          <p style="margin:0 0 0.4rem;font-size:0.85rem;color:#8aab90;text-transform:uppercase;letter-spacing:1px;">From</p>
          <p style="margin:0 0 1.25rem;font-size:1rem;color:#0A3323;font-weight:600;">${name} &lt;${email}&gt;</p>
          <p style="margin:0 0 0.4rem;font-size:0.85rem;color:#8aab90;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="margin:0;font-size:0.95rem;color:#3d5244;line-height:1.8;white-space:pre-wrap;">${message}</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Contact email error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
