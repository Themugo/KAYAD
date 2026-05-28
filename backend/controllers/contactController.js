import Contact from "../models/Contact.js";
import { sendEmail } from "../services/email.service.js";

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const contact = await Contact.create({ name, email, subject, message });

    sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      subject: `Contact form: ${subject}`,
      html: `<div style="font-family:sans-serif;background:#050505;color:#E2DDD5;padding:24px;max-width:500px;">
        <h2 style="color:#D4AF37;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border-color:#252E3D;" />
        <p>${message}</p>
      </div>`,
    });

    res.json({ success: true, message: "Message received. We'll get back to you soon." });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

export const listContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to list contacts" });
  }
};

export const markRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update contact" });
  }
};
