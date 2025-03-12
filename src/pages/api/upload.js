import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import pdfParse from "pdf-parse";
import XLSX from "xlsx";

const formidable = require("formidable");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "File upload failed" });

    const pdfPath = files.pdf[0].filepath;
    const xlsmPath = files.xlsm[0].filepath;

    const pdfBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(pdfBuffer);

  // Split text into lines for structured processing
  const lines = data.text.split("\n");

  let orderIds = [];
  for (let i = 0; i < lines.length; i++) {
    console.log(lines[i]);
    if (lines[i].includes("Mã đơn hàng:")) {
      let candidates = [];

      // Scan 2 previous and 2 next lines
      for (let j = Math.max(0, i - 3); j <= Math.min(i + 3, lines.length - 1); j++) {
        const match = lines[j].match(/\b(\d[\w\d]+)\b/); // Order ID must start with a digit
        if (match && match[1].length === 14) {
          candidates.push(match[1]);
        }
      }

      if (candidates.length) {
        orderIds.push(...candidates);
      }
    }
  }

  // console.log("Final Extracted Order IDs:", orderIds);

    // Extract SKU mapping from XLSM
    const workbook = XLSX.readFile(xlsmPath);
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const skuMapping = {};
    for (let i = 3; i < sheet.length; i++) {
      const orderId = sheet[i][1]; // "Mã Đơn" column
      let skuCombos = [];

      if (orderId) {
        skuCombos.push(sheet[i][3])
        for(let k = 1; k < 6; k++) {
          if(sheet[i + k][1]) {
            break;
          }
          if(sheet[i + k][3]) {
            skuCombos.push(sheet[i + k][3])
          }
        }
        skuMapping[orderId] = skuCombos;
      }
    }

    // Match order IDs with SKU combo values
    const matchedOrders = orderIds.map((id) => ({
      orderId: id,
      sku: skuMapping[id] || [],
    }));
// console.log('matchedOrders', matchedOrders);
    // Generate new PDF with SKU values
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const matched = matchedOrders[index];
      if (matched) {
        const skus = matched.sku;
        let startY = 150;
        skus.forEach((sku, skuIdx) => {
          page.drawText(`${skuIdx + 1}. ${sku.trim()}`, {
            x: 50,
            y: startY - skuIdx * 15, // Move each SKU down by 15 units
            size: 12,
            color: rgb(0, 0, 0),
          });
        });
      }
    });

    // Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    const outputPath = path.join("/tmp", "modified.pdf");
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=modified.pdf");
    res.send(fs.readFileSync(outputPath));
  });
}