const { google } = require('googleapis');
const googleAuthService = require('./googleAuthService');
const logger = require('../utils/logger');

async function scheduleMeet(senderEmail, recipientEmail, emailSubject) {
    if (!senderEmail || !recipientEmail) {
        logger.error("Cannot schedule meet: Missing sender or recipient email.");
        //throw new Error("Missing sender or recipient email for scheduling.");
        return null;
    }

    try {
        const auth = await googleAuthService.getAuthenticatedClient();
        const calendar = google.calendar({ version: 'v3', auth });

        logger.info(`Attempting to schedule Meet between ${senderEmail} and ${recipientEmail} regarding: ${emailSubject}`);

        const meetingDurationMinutes = 30;
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() + 10);
        const endTime = new Date(startTime.getTime() + meetingDurationMinutes * 60000);

        const event = {
            summary: `Meeting regarding: ${emailSubject}`,
            description: `Scheduled automatically based on email received from ${senderEmail}.`,
            start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
            end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
            attendees: [{ email: senderEmail }, { email: recipientEmail }],
            conferenceData: {
                createRequest: {
                    requestId: `meet-${senderEmail.replace(/@.*/, '')}-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
            reminders: { useDefault: false, overrides: [{ method: 'popup', 'minutes': 10 }] },
        };
        //Need messageId for unique requestId
        const requestId = `meet-${senderEmail.replace(/@.*/, '')}-${Date.now()}`;
        event.conferenceData.createRequest.requestId = requestId;


        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
            sendNotifications: true,
        });

        logger.info('Successfully scheduled Google Meet:', {
            eventId: response.data.id,
            link: response.data.hangoutLink,
            summary: response.data.summary,
            attendees: response.data.attendees?.map(a => a.email).join(', '),
        });
        return response.data;

    } catch (error) {
        logger.error('Error scheduling Google Meet:', error.response?.data?.error || error.message);
        if (error.response?.data?.error?.errors) {
            logger.error('Detailed Calendar API errors:', JSON.stringify(error.response.data.error.errors));
        }
        return null;
    }
}

module.exports = { scheduleMeet };