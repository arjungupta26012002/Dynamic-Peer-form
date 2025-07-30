const SPREADSHEET_ID = 'SHEET_ID'; 
const VALUE_SHEET_NAME = 'Value';
const REFID_SHEET_NAME = 'RefID';

const VALUE_NAME_COL = 0; 
const VALUE_ID_COL = 1; 
const VALUE_START_DATE_COL = 2;
const VALUE_END_DATE_COL = 3;

const REFID_NAME_COL = 0; 
const REFID_ID_COL = 1; 
const REFID_START_DATE_COL = 2; 
const REFID_END_DATE_COL = 3;   

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
       .evaluate()
       .setTitle('Internship Peer Eval Manager');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
       .getContent();
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function datesEqual(date1, date2) {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
    return false; 
  }
  return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getInternships() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const valueSheet = ss.getSheetByName(VALUE_SHEET_NAME);
  const data = valueSheet.getDataRange().getValues();
  const spreadsheetTimeZone = ss.getSpreadsheetTimeZone(); 

  if (data.length <= 1) { 
    return [];
  }

  const internships = [];

  for (let i = 1; i < data.length; i++) {
    const rawStartDate = data[i][VALUE_START_DATE_COL];
    const rawEndDate = data[i][VALUE_END_DATE_COL];

    internships.push({
      id: data[i][VALUE_ID_COL],   
      name: data[i][VALUE_NAME_COL], 

      startDate: rawStartDate instanceof Date ? Utilities.formatDate(rawStartDate, spreadsheetTimeZone, 'yyyy-MM-dd') : '',
      endDate: rawEndDate instanceof Date ? Utilities.formatDate(rawEndDate, spreadsheetTimeZone, 'yyyy-MM-dd') : ''
    });
  }
  return internships;
}

function submitInternshipDates(internshipId, startDateStr, endDateStr) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const valueSheet = ss.getSheetByName(VALUE_SHEET_NAME);
  const data = valueSheet.getDataRange().getValues();

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const tomorrow = getTomorrow();

  if (endDate < startDate) {
    return { success: false, message: 'End Date cannot be before Start Date.' };
  }

  if (startDate < tomorrow) {
    return { success: false, message: 'Start Date must be tomorrow or later.' };
  }

  let rowToUpdate = -1;
  let internshipName = ''; 

  for (let i = 1; i < data.length; i++) {
    if (data[i][VALUE_ID_COL] == internshipId) { 
      rowToUpdate = i;
      internshipName = data[i][VALUE_NAME_COL]; 
      break;
    }
  }

  if (rowToUpdate !== -1) {

    valueSheet.getRange(rowToUpdate + 1, VALUE_START_DATE_COL + 1).setValue(startDate);
    valueSheet.getRange(rowToUpdate + 1, VALUE_END_DATE_COL + 1).setValue(endDate);

    syncDatesToRefIDSheet(internshipId, startDate, endDate); 

    const today = getToday(); 
    if (startDate > today) { 
      removeInternshipFromRefID(internshipId); 
      Logger.log(`Internship ${internshipName} (ID: ${internshipId}) removed from RefID as its new start date is in the future.`);
    } else if (datesEqual(startDate, today)) {

    }

    maintainRefIDSheet(); 

    return { success: true, message: `Dates submitted successfully for ${internshipName}.` };
  } else {
    return { success: false, message: `Internship with ID ${internshipId} not found.` };
  }
}

function syncDatesToRefIDSheet(internshipId, newStartDate, newEndDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const refIdSheet = ss.getSheetByName(REFID_SHEET_NAME);

  if (!refIdSheet) {
    console.error(`Error: RefID sheet named '${REFID_SHEET_NAME}' not found.`);
    return;
  }

  const refIdData = refIdSheet.getDataRange().getValues();
  let updatedCount = 0; 

  for (let i = 1; i < refIdData.length; i++) {

    if (refIdData[i][REFID_ID_COL] == internshipId) { 

      refIdSheet.getRange(i + 1, REFID_START_DATE_COL + 1).setValue(newStartDate);
      refIdSheet.getRange(i + 1, REFID_END_DATE_COL + 1).setValue(newEndDate);
      Logger.log(`Synced dates for ID ${internshipId} to RefID sheet row ${i+1}. New Start: ${newStartDate.toDateString()}, New End: ${newEndDate.toDateString()}`); 
      updatedCount++;
    }
  }

}

function removeInternshipFromRefID(internshipId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const refIdSheet = ss.getSheetByName(REFID_SHEET_NAME);

  if (!refIdSheet) {
    console.error(`Error: RefID sheet named '${REFID_SHEET_NAME}' not found for removal.`);
    return;
  }

  const refIdData = refIdSheet.getDataRange().getValues();
  const rowsToDelete = [];

  for (let i = refIdData.length - 1; i >= 1; i--) { 
    if (refIdData[i][REFID_ID_COL] == internshipId) { 
      rowsToDelete.push(i + 1); 
      Logger.log(`Marked internship with ID ${internshipId} for removal from RefID sheet.`);
    }
  }

  for (const rowNum of rowsToDelete) {
    refIdSheet.deleteRow(rowNum);
  }
}

function peerBegin() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const valueSheet = ss.getSheetByName(VALUE_SHEET_NAME);
  const refIdSheet = ss.getSheetByName(REFID_SHEET_NAME);

  const valueData = valueSheet.getDataRange().getValues();
  const today = getToday();

  const refIdExistingIds = new Set();
  const refIdCurrentData = refIdSheet.getDataRange().getValues();
  for (let i = 1; i < refIdCurrentData.length; i++) {
      refIdExistingIds.add(refIdCurrentData[i][REFID_ID_COL]); 
  }

  for (let i = 1; i < valueData.length; i++) { 
    const internshipId = valueData[i][VALUE_ID_COL];     
    const internshipName = valueData[i][VALUE_NAME_COL]; 
    const startDate = valueData[i][VALUE_START_DATE_COL];
    const endDate = valueData[i][VALUE_END_DATE_COL];

    if (startDate instanceof Date) { 
      startDate.setHours(0, 0, 0, 0); 
      if (datesEqual(startDate, today)) {

        if (!refIdExistingIds.has(internshipId)) {

          refIdSheet.appendRow([internshipName, internshipId, startDate, endDate]);
          Logger.log(`Moved internship ${internshipName} (ID: ${internshipId}) to RefID sheet.`);
        } else {

          Logger.log(`Internship ${internshipName} (ID: ${internshipId}) already exists in RefID sheet. Skipping to avoid duplicate.`);
        }
      }
    }
  }
  maintainRefIDSheet(); 
}

function peerEnd() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const refIdSheet = ss.getSheetByName(REFID_SHEET_NAME);
  const refIdData = refIdSheet.getDataRange().getValues(); 
  const yesterday = getYesterday();

  const rowsToDelete = [];

  for (let i = refIdData.length - 1; i >= 1; i--) { 
    const endDate = refIdData[i][REFID_END_DATE_COL];
    if (endDate instanceof Date) { 
      endDate.setHours(0, 0, 0, 0); 
      if (datesEqual(endDate, yesterday)) {
        rowsToDelete.push(i + 1); 
        Logger.log(`Marked internship ${refIdData[i][REFID_NAME_COL]} (ID: ${refIdData[i][REFID_ID_COL]}) for removal from RefID sheet.`); 
      }
    }
  }

  for (const rowNum of rowsToDelete) {
    refIdSheet.deleteRow(rowNum);
  }

  maintainRefIDSheet(); 
}

function maintainRefIDSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const refIdSheet = ss.getSheetByName(REFID_SHEET_NAME);

  const expectedHeaders = ['Internship Name', 'Internship ID', 'Start Date', 'End Date']; 
  let currentHeaders = [];
  if (refIdSheet.getLastRow() > 0) {
    currentHeaders = refIdSheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  }

  let headersCorrect = true;
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (currentHeaders[i] !== expectedHeaders[i]) {
      headersCorrect = false;
      break;
    }
  }

  if (!headersCorrect || refIdSheet.getLastRow() === 0) {

    refIdSheet.clear();
    refIdSheet.appendRow(expectedHeaders);
    Logger.log("Resetting RefID sheet headers.");
  }

  const lastRow = refIdSheet.getLastRow();

  if (lastRow <= 1) {

    refIdSheet.appendRow(["No available Internships", "1s5iSIke8Wsa3sqCGoMie4jjD2a4ROzA0U7kKqXP6HF4", "", ""]);
    Logger.log("Added 'No available Internships' to RefID sheet.");
  } else {

    const data = refIdSheet.getDataRange().getValues();
    let hasPlaceholder = false;
    let placeholderRow = -1;
    let hasOtherInternships = false;

    for (let i = 1; i < data.length; i++) { 

      if (data[i][REFID_NAME_COL] === "No available Internships" && data[i][REFID_ID_COL] === "1s5iSIke8Wsa3sqCGoMie4jjD2a4ROzA0U7kKqXP6HF4") {
        hasPlaceholder = true;
        placeholderRow = i + 1; 
      } else if (data[i][REFID_ID_COL] !== "" && data[i][REFID_ID_COL] !== null) { 

        hasOtherInternships = true;
      }
    }

    if (hasPlaceholder && hasOtherInternships) {
      refIdSheet.deleteRow(placeholderRow);
      Logger.log("Removed 'No available Internships' from RefID sheet as other internships are present.");
    }
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let valueSheet = ss.getSheetByName(VALUE_SHEET_NAME);
  if (!valueSheet) {
    valueSheet = ss.insertSheet(VALUE_SHEET_NAME);

    valueSheet.appendRow(['Internship Name', 'Internship ID', 'Start Date', 'End Date']);
    Logger.log(`Created sheet: ${VALUE_SHEET_NAME}`);
  } else {

      const expectedValueHeaders = ['Internship Name', 'Internship ID', 'Start Date', 'End Date']; 
      const valueHeaders = valueSheet.getRange(1, 1, 1, expectedValueHeaders.length).getValues()[0];
      if (valueHeaders[0] !== expectedValueHeaders[0] || valueHeaders[1] !== expectedValueHeaders[1] || valueHeaders[2] !== expectedValueHeaders[2] || valueHeaders[3] !== expectedValueHeaders[3]) {
          valueSheet.clear(); 
          valueSheet.appendRow(expectedValueHeaders);
          Logger.log(`Reset headers for sheet: ${VALUE_SHEET_NAME}`);
      }
  }

  maintainRefIDSheet();
}
