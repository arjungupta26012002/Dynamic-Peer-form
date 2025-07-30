function validateInternAndGetPeers(formData) {
  const { email, internshipMasterSheetId, cohort } = formData;
  Logger.log(`Validating intern: ${email}, Master Sheet ID: ${internshipMasterSheetId}, Cohort: ${cohort}`);

  try {
    const masterSs = SpreadsheetApp.openById(internshipMasterSheetId);
    const cohortSheet = masterSs.getSheetByName(cohort);

    if (!cohortSheet) {
      Logger.log(`Cohort sheet '${cohort}' not found in master sheet '${internshipMasterSheetId}'.`);
      return { success: false, message: `Cohort '${cohort}' not found in the selected internship master sheet.` };
    }

    const data = cohortSheet.getDataRange().getValues();
    if (data.length <= 1) { 
      Logger.log(`No intern data found in cohort '${cohort}' sheet.`);
      return { success: false, message: 'No intern data found in this cohort.' };
    }

    const headers = data[0];

    const emailColIndex = headers.indexOf('Email Address');
    const groupNumColIndex = headers.indexOf('Group Number');
    const nameColIndex = headers.indexOf('Full Name');
    const peerEvalColIndex = headers.indexOf('Submitted Peer Evaluation Form');

    if (emailColIndex === -1 || groupNumColIndex === -1 || nameColIndex === -1 || peerEvalColIndex === -1) {
      const missingCols = [];
      if (emailColIndex === -1) missingCols.push("'Email Address'");
      if (groupNumColIndex === -1) missingCols.push("'Group Number'");
      if (nameColIndex === -1) missingCols.push("'Full Name'");
      if (peerEvalColIndex === -1) missingCols.push("'Submitted Peer Evaluation Form'");

      Logger.log(`Required columns missing in cohort sheet: ${missingCols.join(', ')}.`);
      return { success: false, message: `Required columns (${missingCols.join(', ')}) not found in the cohort sheet. Please ensure they exist and are named correctly.` };
    }

    let internRow = null;
    let internGroupNumber = null;
    let internName = null;
    let internRowIndexInSheet = -1; 

    for (let i = 1; i < data.length; i++) { 
      if (data[i][emailColIndex] && String(data[i][emailColIndex]).toLowerCase() === email.toLowerCase()) {
        internRow = data[i];
        internName = data[i][nameColIndex];
        internGroupNumber = data[i][groupNumColIndex];
        internRowIndexInSheet = i + 1; 
        break;
      }
    }

    if (!internRow) {
      Logger.log(`Intern with email '${email}' not found in cohort '${cohort}'.`);
      return { success: false, message: 'Intern with this email not found in the selected cohort. Please check your details.' };
    }

    if (!internGroupNumber || String(internGroupNumber).trim() === '') {
      Logger.log(`Intern '${internName}' is not assigned to any team (Group Number is empty/null).`);
      return { success: false, message: `Intern '${internName}' is not assigned to a team. Please contact your manager.` };
    }

    const peers = [];

    for (let i = 1; i < data.length; i++) { 
      if (data[i][groupNumColIndex] === internGroupNumber && String(data[i][emailColIndex]).toLowerCase() !== email.toLowerCase()) {
        peers.push({
          name: data[i][nameColIndex],
          email: data[i][emailColIndex]
        });
      }
    }
    Logger.log(`Intern '${internName}' found. Group: ${internGroupNumber}. Peers: ${JSON.stringify(peers)}`);

    return {
      success: true,
      message: 'Intern found!',
      internData: {
        name: internName,
        email: email,
        groupNumber: internGroupNumber,
        originalRowIndexInSheet: internRowIndexInSheet, 
        masterSheetId: internshipMasterSheetId, 
        cohort: cohort
      },
      peers: peers
    };

  } catch (e) {
    Logger.log('Error in validateInternAndGetPeers: ' + e.message + ' Stack: ' + e.stack);
    return { success: false, message: 'An error occurred during validation: ' + e.message };
  }
}
