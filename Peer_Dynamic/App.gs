const INTERNSHIP_LIST_SPREADSHEET_ID = 'MasterSheet-id'; 
const PEER_RESPONSES_SPREADSHEET_ID = 'Peer-responsesheetID'; 
const PEER_RESPONSES_SHEET_NAME = 'Sheet1'; 
const INTERNSHIP_REF_SHEET_NAME = 'RefID'; 
const SIGNATURE_IMAGE_FILE_ID = "ImageID";

const OTP_EXPIRY_MINUTES = 5; 
const OTP_LENGTH = 6; 

function doGet() {

  const htmlTemplate = HtmlService.createTemplateFromFile('index');

  htmlTemplate.otpLength = OTP_LENGTH; 

  return htmlTemplate.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
