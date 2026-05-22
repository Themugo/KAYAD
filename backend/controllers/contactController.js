import Contact from "../models/Contact.js";

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    await Contact.create({ name, email, subject, message });
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
