import PDFDocument from "pdfkit";

export function generateReceipt({ title, buyerName, sellerName, amount, transactionId, carDetails, date }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const gold = "#D4A843";
      const dark = "#0A1628";

      // ── Header ──
      doc.fontSize(36).font("Helvetica-Bold").fillColor(gold).text("KAYAD", { align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor("#666").text("Kenya's Premium Car Marketplace", { align: "center" });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(gold).lineWidth(1).stroke();
      doc.moveDown(1);

      // ── Title ──
      doc.fontSize(18).font("Helvetica-Bold").fillColor(dark).text(title || "Purchase Intent Receipt", { align: "center" });
      doc.moveDown(1.5);

      // ── Details ──
      const leftX = 50;
      const rightX = 300;
      const rowH = 22;

      const field = (label, value, x, y) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#333").text(label, x, y);
        doc.font("Helvetica").fillColor("#000").text(value || "—", x + 120, y);
      };
      let y = doc.y;

      field("Transaction ID:", transactionId || "N/A", leftX, y);
      field("Date:", date ? new Date(date).toLocaleDateString("en-KE") : new Date().toLocaleDateString("en-KE"), rightX, y);
      y += rowH;

      field("Buyer:", buyerName || "N/A", leftX, y);
      field("Seller:", sellerName || "N/A", rightX, y);
      y += rowH;

      if (carDetails) {
        field("Vehicle:", carDetails, leftX, y);
        y += rowH;
      }

      field("Amount:", amount ? `KES ${Number(amount).toLocaleString()}` : "—", leftX, y);
      y += rowH + 10;

      // ── Divider ──
      doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").lineWidth(0.5).stroke();
      y += 15;

      // ── Payment Status ──
      doc.fontSize(12).font("Helvetica-Bold").fillColor(gold).text("Payment Status: Pending", leftX, y);
      y += 25;

      // ── Terms ──
      doc.fontSize(8).font("Helvetica").fillColor("#999");
      doc.text("This document confirms intent to purchase. Payment must be completed within 48 hours.", leftX, y, { align: "center" });
      y += 15;
      doc.text("For any inquiries, contact support@kayad.space", { align: "center" });

      // ── Footer ──
      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(gold).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor("#aaa").text("© Kayad Ltd. — Generated automatically", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateInvoice(data) {
  return generateReceipt(data);
}
