function submitPeerEvaluations(evaluationData) {
  Logger.log('Submitting evaluations for: ' + evaluationData.evaluator.email);
  try {
    const peerResponsesSs = SpreadsheetApp.openById(PEER_RESPONSES_SPREADSHEET_ID);

    const targetSheetName = evaluationData.internshipName.substring(0, 100).replace(/[\\/?*\[\]:]/g, '').trim();

    let peerResponsesSheet = peerResponsesSs.getSheetByName(targetSheetName);

    if (!peerResponsesSheet) {
      Logger.log(`Peer responses sheet '${targetSheetName}' not found. Creating new sheet.`);
      peerResponsesSheet = peerResponsesSs.insertSheet(targetSheetName);

    }

    const expectedHeaders = [
      'Evaluator Email', 'Evaluated Intern Name', 'Evaluated Intern Email',
      'Internship Name', 'Cohort', 'Quality of Work', 'Initiative Taken',
      'Timeliness', 'Communication', 'Collaboration', 'Conflict Resolution',
      'Willingness to Work', 'Overall', 'Timestamp'
    ];

    if (peerResponsesSheet.getLastRow() === 0 || peerResponsesSheet.getRange(1, 1).isBlank()) {
        Logger.log(`Sheet '${targetSheetName}' is empty, writing headers.`);
        peerResponsesSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    } else {
        Logger.log(`Sheet '${targetSheetName}' already has data.`);
    }

    const existingHeaders = peerResponsesSheet.getRange(1, 1, 1, peerResponsesSheet.getLastColumn()).getValues()[0];
    Logger.log('Existing Peer Responses sheet headers for ' + targetSheetName + ': ' + existingHeaders.join(', '));

    const lastRow = peerResponsesSheet.getLastRow();
    const lastCol = peerResponsesSheet.getLastColumn();
    let existingData = [];
    if (lastRow > 1) { 
      existingData = peerResponsesSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    }

    const headerIndices = {};
    expectedHeaders.forEach((header, index) => {
        const actualIndex = existingHeaders.indexOf(header);
        if (actualIndex !== -1) {
            headerIndices[header] = actualIndex;
        } else {
            Logger.log(`Warning: Expected header "${header}" not found in existing sheet headers for '${targetSheetName}'.`);

            headerIndices[header] = index;
        }
    });

    const rowsToAppend = [];
    let rowsUpdatedCount = 0;
    let rowsAddedCount = 0;
    const timestamp = new Date();

    evaluationData.evaluatedPeers.forEach(peer => {
      const evaluatorEmail = evaluationData.evaluator.email;
      const evaluatedInternEmail = peer.email;

      let foundMatch = false;
      for (let i = 0; i < existingData.length; i++) {
        const rowData = existingData[i];

        if (rowData[headerIndices['Evaluator Email']] === evaluatorEmail &&
            rowData[headerIndices['Evaluated Intern Email']] === evaluatedInternEmail) {

          const rowToUpdate = i + 2; 

          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Quality of Work'] + 1).setValue(peer.scores.quality || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Initiative Taken'] + 1).setValue(peer.scores.initiative || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Timeliness'] + 1).setValue(peer.scores.timeliness || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Communication'] + 1).setValue(peer.scores.communication || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Collaboration'] + 1).setValue(peer.scores.collaboration || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Conflict Resolution'] + 1).setValue(peer.scores.conflictResolution || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Willingness to Work'] + 1).setValue(peer.scores.willingnessToWork || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Overall'] + 1).setValue(peer.scores.overall || 0);
          peerResponsesSheet.getRange(rowToUpdate, headerIndices['Timestamp'] + 1).setValue(timestamp); 

          Logger.log(`Updated evaluation for Evaluator: ${evaluatorEmail}, Evaluated: ${evaluatedInternEmail} in sheet '${targetSheetName}' at row ${rowToUpdate}.`);
          rowsUpdatedCount++;
          foundMatch = true;
          break; 
        }
      }

      if (!foundMatch) {

        const newRow = [
          evaluatorEmail,
          peer.name,
          evaluatedInternEmail,
          evaluationData.internshipName, 
          evaluationData.evaluator.cohort,
          peer.scores.quality || 0,
          peer.scores.initiative || 0,
          peer.scores.timeliness || 0,
          peer.scores.communication || 0,
          peer.scores.collaboration || 0,
          peer.scores.conflictResolution || 0,
          peer.scores.willingnessToWork || 0,
          peer.scores.overall || 0,
          timestamp
        ];
        rowsToAppend.push(newRow);
        rowsAddedCount++;
      }
    });

    if (rowsToAppend.length > 0) {
      peerResponsesSheet.getRange(peerResponsesSheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
      Logger.log(`${rowsToAppend.length} new evaluation rows appended to sheet '${targetSheetName}'.`);
    }

    let submissionMessage = `Peer evaluations submitted successfully! `;
    if (rowsAddedCount > 0) submissionMessage += `${rowsAddedCount} new evaluation(s) added to '${targetSheetName}'. `;
    if (rowsUpdatedCount > 0) submissionMessage += `${rowsUpdatedCount} existing evaluation(s) updated in '${targetSheetName}'.`;

    const masterSs = SpreadsheetApp.openById(evaluationData.evaluator.masterSheetId);
    const cohortSheet = masterSs.getSheetByName(evaluationData.evaluator.cohort);

    if (!cohortSheet) {
        Logger.log(`Cohort sheet for marking completion not found: ${evaluationData.evaluator.cohort}`);
        return { success: false, message: `Cohort sheet for marking completion not found: ${evaluationData.evaluator.cohort}. Evaluations submitted but not marked.` };
    }

    const headersMaster = cohortSheet.getRange(1, 1, 1, cohortSheet.getLastColumn()).getValues()[0];
    const peerEvalColIndexMaster = headersMaster.indexOf('Submitted Peer Evaluation Form');

    if (peerEvalColIndexMaster === -1) {
      Logger.log('Submitted Peer Evaluation Form column not found in intern master sheet for marking completion.');
      return { success: false, message: 'Submitted Peer Evaluation Form column not found in intern master sheet for marking completion. Evaluations submitted but not marked.' };
    }

    cohortSheet.getRange(evaluationData.evaluator.originalRowIndexInSheet, peerEvalColIndexMaster + 1).setValue('TRUE');
    Logger.log(`Peer Evaluation column marked as TRUE for intern ${evaluationData.evaluator.email} in ${evaluationData.evaluator.cohort}.`);

    return { success: true, message: submissionMessage };

  } catch (e) {
    Logger.log('Error in submitPeerEvaluations: ' + e.message + ' Stack: ' + e.stack);
    return { success: false, message: 'An error occurred during submission: ' + e.message };
  }
}
