function getInternshipList() {
  Logger.log('Fetching internship list from RefID sheet...');
  try {
    const ss = SpreadsheetApp.openById(INTERNSHIP_LIST_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INTERNSHIP_REF_SHEET_NAME); 

    if (!sheet) {
      Logger.log(`RefID sheet '${INTERNSHIP_REF_SHEET_NAME}' not found in master list spreadsheet.`);
      throw new Error(`The sheet '${INTERNSHIP_REF_SHEET_NAME}' was not found in the Internship List Spreadsheet.`);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) { 
      Logger.log('No internship data found in RefID sheet.');
      return [];
    }

    const internships = [];
    for (let i = 1; i < data.length; i++) { 
      const name = data[i][0]; 
      const id = data[i][1];   
      if (name && id) {
        internships.push({ name: name, id: id });
      }
    }
    Logger.log(`Found ${internships.length} internships.`);
    return internships;
  } catch (e) {
    Logger.log('Error in getInternshipList: ' + e.message + ' Stack: ' + e.stack);
    throw new Error('Failed to load internship list: ' + e.message);
  }
}

function getCohorts(internshipMasterSheetId) {
  Logger.log(`Fetching cohorts for ID: ${internshipMasterSheetId}`);
  try {
    const ss = SpreadsheetApp.openById(internshipMasterSheetId);
    const sheets = ss.getSheets();
    const cohorts = sheets.map(sheet => sheet.getName());
    Logger.log(`Found ${cohorts.length} cohorts.`);
    return cohorts;
  } catch (e) {
    Logger.log('Error in getCohorts: ' + e.message + ' Stack: ' + e.stack);
    throw new Error('Failed to load cohorts: ' + e.message);
  }
}
