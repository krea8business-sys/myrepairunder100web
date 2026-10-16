/**
 * Google Apps Script: append MyRepairUnder100 booking events to a Google Sheet.
 *
 * 1. Create a Google Sheet (e.g. in the business Google account) → Extensions → Apps Script.
 * 2. Paste this file and save.
 * 3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * 4. Copy the web app URL into BOOKING_WEBHOOK_URL on the server and redeploy.
 *
 * Apps Script can't read request headers, so the X-MRU-Signature can't be verified here.
 * Keep the web-app URL private. The database remains the source of truth; this sheet is a copy.
 */
const SHEET_NAME = "Bookings";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Received at", "Event", "Booking ID", "Status", "Customer", "Mobile", "Date", "Slot", "Services", "Estimated total", "Pincode", "City"]);
  }
  sheet.appendRow([
    new Date(), data.event, data.code, data.statusLabel, data.customerName, "'" + data.customerMobile,
    data.scheduledDate, data.slotLabel, (data.services || []).map(function (s) { return s.name + (s.quantity > 1 ? " x" + s.quantity : ""); }).join(", "),
    data.estimatedTotal, "'" + data.pincode, data.city,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
