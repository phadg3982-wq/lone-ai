/**
 * ============================================================================
 * CREDIX AI - GOOGLE APPS SCRIPT WEB APP INTEGRATION
 * ============================================================================
 * 
 * HOW TO SET UP YOUR SERVERLESS GOOGLE SHEETS DATABASE:
 * 
 * 1. Open Google Sheets (https://sheets.new) and create a new spreadsheet.
 * 2. In the top menu, go to: Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this entire file content.
 * 4. Click the "Save" icon (Floppy disk).
 * 5. In the top right corner, click "Deploy" > "New deployment".
 * 6. Click the gear icon next to "Select type" and select "Web app".
 * 7. Set configuration:
 *      - Description: "Credix AI Records Webhook"
 *      - Execute as: "Me (<your email>)"
 *      - Who has access: "Anyone" (Required so your web app can submit records)
 * 8. Click "Deploy".
 * 9. Authorize access if prompted by Google.
 * 10. Copy the generated "Web App URL" (e.g., https://script.google.com/macros/s/.../exec).
 * 11. In the Credix AI Web App, click the Settings icon (Gear) and paste your URL!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Prevent concurrent write collisions

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create Header Row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Applicant ID",
        "Applicant Name",
        "Age",
        "Net Monthly Salary (₹)",
        "Credit Score",
        "Existing EMI (₹)",
        "Loan Purpose",
        "Status",
        "Eligible Loan Amount (₹)",
        "Risk Classification",
        "DTI Ratio",
        "Max Affordable EMI (₹)"
      ]);
      
      // Style Header
      var headerRange = sheet.getRange(1, 1, 1, 13);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#1e293b");
      headerRange.setFontColor("#f8fafc");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Parse incoming payload
    var payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    // Append new applicant record
    sheet.appendRow([
      payload.timestamp || new Date().toISOString(),
      payload.id || "APP-" + Math.floor(Math.random() * 100000),
      payload.name || "N/A",
      payload.age || "N/A",
      payload.salary || 0,
      payload.creditScore || 0,
      payload.existingEmi || 0,
      payload.purpose || "General",
      payload.status || "N/A",
      payload.eligibleAmount || 0,
      payload.riskClassification || "N/A",
      payload.dtiRatio || "N/A",
      payload.maxAffordableEmi || 0
    ]);

    // Format numbers
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 5).setNumberFormat("₹#,##0");
    sheet.getRange(lastRow, 7).setNumberFormat("₹#,##0");
    sheet.getRange(lastRow, 10).setNumberFormat("₹#,##0");
    sheet.getRange(lastRow, 13).setNumberFormat("₹#,##0");

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      row: lastRow,
      message: "Applicant record saved successfully into Google Sheets!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Credix AI Google Apps Script Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
