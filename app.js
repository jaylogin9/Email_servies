const express = require('express');
const {google } = require ('googleapis');
const app = express();
const dotenv = require("dotenv");
dotenv.config();


// OAuth2 credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI )
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.send'],
    });

// Gmail API instance
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });



// Function to check for new emails
async function checkForNewEmails(auth) {
    try {
    const response = await gmail.users.messages.list({
    auth: auth,
    userId: 'me',
    q: 'is:unread'
    });
    const messages = response.data.messages;
    if (!messages) {
    console.log('No new emails found');
    return;
    }
    for (const message of messages) {
    const messageData = await getMessageData(auth, message.id);
    const threadId = messageData.threadId;
    const threadLabels = messageData.labels;
    if (threadLabels.includes('SENT') || threadLabels.includes('REPLIED')) {
    console.log('Email already replied to');
    continue;
    }
    const threadMessages = await getThreadMessages(auth, threadId);
    if (threadMessages.length > 1) {
    console.log('Email thread already has replies');
    continue;
    }
    const replyContent = 'Thanks for reaching out! I am currently out of office, but will respond as soon as possible.';
    const replyMessage = createMessage(threadId, replyContent);
    await sendEmail(auth, replyMessage);
    await addLabel(auth, threadId, 'REPLIED');
    }
    } catch (error) {
    console.log(error);
    }
    }
    
    // Function to get message data
    async function getMessageData(auth, messageId) {
    try {
    const response = await gmail.users.messages.get({
    auth: auth,
    userId: 'me',
    id: messageId,
    format: 'full'
    });
    const message = response.data;
    const threadId = message.threadId;
    const labels = message.labelIds;
    return {threadId, labels};
    } catch (error) {
    console.log(error);
    }
    }
    
    // Function to get all messages in a thread
    async function getThreadMessages(auth, threadId) {
    try {
    const response = await gmail.users.threads.get({
    auth: auth,
    userId: 'me',
    id: threadId
    });
    const thread = response.data;
    const messages = thread.messages;
    return messages;
    } catch (error) {
    console.log(error);
    }
    }
    
    // Function to create a reply message
    function createMessage(threadId, content) {
    const message = [
    'Content-Type: text/plain; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
   ' Subject: RE: ${threadId}\n',
    'From: "YOUR NAME" <YOUR EMAIL ADDRESS>\n',
    'To: <RECIPIENT EMAIL ADDRESS>\n\n',
    content
    ].join('');
    const encodedMessage = Buffer.from(message).toString('base64');
    return {raw: encodedMessage};
    }
    
    // Function to send an email
    async function sendEmail(auth, message) {
    try {
    const response = await gmail.users.messages.send({
    auth: auth,
    userId: 'me',
    resource: message
    });
    console.log('Email sent:', response.data);
    } catch (error) {
    console.log(error);
    }
    }

    setInterval(checkForNewEmails, Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000);

    // Start the server
    app.listen(3000, () => {
      console.log('Server listening on port 3000');
    });