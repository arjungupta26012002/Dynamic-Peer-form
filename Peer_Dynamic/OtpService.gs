function generateAndSendOtp(email, userName) {
  Logger.log(`SERVER DEBUG: generateAndSendOtp - Attempting to generate and send OTP to: "${email}" for user: "${userName}"`);
  try {
    const otp = Utilities.formatString('%0' + OTP_LENGTH + 'd', Math.floor(Math.random() * Math.pow(10, OTP_LENGTH)));
    Logger.log(`SERVER DEBUG: generateAndSendOtp - Generated raw OTP: "${otp}" (length: ${otp.length})`);

    const trimmedOtp = otp.trim();
    Logger.log(`SERVER DEBUG: generateAndSendOtp - Trimmed OTP for storage: "${trimmedOtp}" (length: ${trimmedOtp.length})`);

    const expiryTime = new Date().getTime() + (OTP_EXPIRY_MINUTES * 60 * 1000); 
    Logger.log(`SERVER DEBUG: generateAndSendOtp - OTP will expire at: ${new Date(expiryTime).toLocaleString()}`);

    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('otp', trimmedOtp); 
    userProperties.setProperty('otpExpiry', expiryTime.toString());
    userProperties.setProperty('otpEmail', email.toLowerCase());
    Logger.log(`SERVER DEBUG: generateAndSendOtp - OTP and expiry stored in UserProperties.`);

    const IMAGE_FILE_ID = '16hFLzUoyB9VCF5rP4YUaBVXTfipp59EJ'; 

    let signatureImageBlob = null;
    try {
      signatureImageBlob = DriveApp.getFileById(IMAGE_FILE_ID).getAs('image/png'); 
      signatureImageBlob.setName('signatureImage'); 
      Logger.log(`SERVER DEBUG: generateAndSendOtp - Signature image retrieved successfully.`);
    } catch (driveError) {
      Logger.log('SERVER DEBUG: generateAndSendOtp - Error retrieving signature image from Drive: ' + driveError.message);
      signatureImageBlob = null;
    }

    const mailOptions = {
      to: email,
      subject: `Your OTP for Peer Evaluation Form`,
      htmlBody: `
        <p>Dear ${userName || 'Intern'},</p>
        <p>Your One-Time Password (OTP) for the Peer Evaluation Form is: <strong>${otp}</strong></p>
        <p>This OTP is valid for the next ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p>Please enter this OTP in the form to proceed.</p>
        <br>
        <p>If you did not request this, please ignore this email.</p>
        <div class="signature">
        <p style="margin-bottom: 0;">Best Regards,<br><br><b>Arjun Gupta</b><br>Talent Discovery Team</p>
        <a href="https://4excelerate.org/" style="display: block; margin-top: 1px;">
          ${signatureImageBlob ? '<img src="cid:signatureImage" width="150px">' : ''}
        </a>
        </div>
      `
    };

    if (signatureImageBlob) {
      mailOptions.inlineImages = {
        signatureImage: signatureImageBlob
      };
    }

    MailApp.sendEmail(mailOptions);

    Logger.log(`SERVER DEBUG: generateAndSendOtp - OTP email sent to ${email}.`);
    return { success: true, message: `OTP sent to ${email}. Please check your inbox and spam folder.` };

  } catch (e) {
    Logger.log('SERVER ERROR: generateAndSendOtp - ' + e.message + ' Stack: ' + e.stack);
    if (e.message.includes("No recipient")) {
        return { success: false, message: "Invalid email address provided. Please check your email." };
    } else {
      return { success: false, message: 'Failed to send OTP. Please try again or contact support. Error: ' + e.message };
    }
  }
}

function verifyOtp(email, userOtp) {
  Logger.log(`SERVER DEBUG: verifyOtp - Incoming request for email: "${email}", userOtp: "${userOtp}"`);
  Logger.log(`SERVER DEBUG: verifyOtp - Length of userOtp received: ${userOtp.length}`);

  const userProperties = PropertiesService.getUserProperties();
  const storedOtp = userProperties.getProperty('otp');
  const storedExpiry = userProperties.getProperty('otpExpiry');
  const storedEmail = userProperties.getProperty('otpEmail');

  Logger.log(`SERVER DEBUG: verifyOtp - Retrieved Stored OTP: "${storedOtp}" (length: ${storedOtp ? storedOtp.length : 'N/A'})`);
  Logger.log(`SERVER DEBUG: verifyOtp - Retrieved Stored Expiry: ${storedExpiry}`);
  Logger.log(`SERVER DEBUG: verifyOtp - Retrieved Stored Email: "${storedEmail}"`);

  userProperties.deleteProperty('otp');
  userProperties.deleteProperty('otpExpiry');
  userProperties.deleteProperty('otpEmail');
  Logger.log(`SERVER DEBUG: verifyOtp - OTP properties cleared from UserProperties after retrieval.`);

  if (!storedOtp || !storedExpiry || !storedEmail) {
    Logger.log('SERVER DEBUG: verifyOtp - No OTP found or expired for this session (initial check for null/undefined properties).');
    return { success: false, message: 'No active OTP found. Please request a new one.' };
  }

  const receivedEmailLowerCase = email.toLowerCase();
  Logger.log(`SERVER DEBUG: verifyOtp - Comparing received email "${receivedEmailLowerCase}" with stored email "${storedEmail}"`);
  if (receivedEmailLowerCase !== storedEmail) {
    Logger.log(`SERVER DEBUG: verifyOtp - Email mismatch during OTP verification.`);
    return { success: false, message: 'Invalid OTP or email. Please ensure you are using the correct email address for which the OTP was requested.' };
  }

  const currentTimestamp = new Date().getTime();
  const expiryTimestamp = parseInt(storedExpiry);
  Logger.log(`SERVER DEBUG: verifyOtp - Current Timestamp: ${currentTimestamp}, Expiry Timestamp: ${expiryTimestamp}`);

  if (currentTimestamp > expiryTimestamp) {
    Logger.log('SERVER DEBUG: verifyOtp - OTP has expired.');
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  const trimmedUserOtp = userOtp.trim();
  Logger.log(`SERVER DEBUG: verifyOtp - Final comparison: User OTP ("${trimmedUserOtp}", length ${trimmedUserOtp.length}) vs Stored OTP ("${storedOtp}", length ${storedOtp.length})`);
  if (trimmedUserOtp === storedOtp) { 
    Logger.log('SERVER DEBUG: verifyOtp - OTP verified successfully.');
    return { success: true, message: 'OTP verified successfully!' };
  } else {

    Logger.log(`SERVER DEBUG: verifyOtp - Invalid OTP entered. User OTP: "${trimmedUserOtp}", Stored OTP: "${storedOtp}"`);
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }
}

function clearOtpProperty() {
  PropertiesService.getUserProperties().deleteProperty('otp');
  PropertiesService.getUserProperties().deleteProperty('otpExpiry');
  PropertiesService.getUserProperties().deleteProperty('otpEmail');
  Logger.log('SERVER DEBUG: clearOtpProperty - OTP properties cleared.');
}
