// Serverless function to send SMS using Twilio
// This file can be deployed to Vercel, Netlify, or any serverless platform

const twilio = require('twilio');

// IMPORTANT: Set these as environment variables in your deployment platform
// DO NOT hardcode your actual credentials here
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const appUrl = process.env.APP_URL || '';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, message, senderName } = req.body;

        // Validate input
        if (!to || !message) {
            return res.status(400).json({ error: 'Phone number and message are required' });
        }

        // Build the full message with Gratitude signature
        let fullMessage = message;
        const signatureParts = [];
        if (senderName) {
            signatureParts.push(`— ${senderName}`);
        }
        signatureParts.push('Sent with Gratitude');
        if (appUrl) {
            signatureParts.push(`Get Gratitude: ${appUrl}`);
        }
        fullMessage += '\n\n' + signatureParts.join('\n');

        // Validate environment variables
        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error('Missing Twilio credentials');
            return res.status(500).json({ error: 'SMS service is not configured' });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Format phone number (ensure it has country code)
        let formattedPhone = to.trim();
        if (!formattedPhone.startsWith('+')) {
            // Assume US number if no country code
            formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
        }

        // Send SMS
        const twilioMessage = await client.messages.create({
            body: fullMessage,
            from: twilioPhoneNumber,
            to: formattedPhone
        });

        console.log('SMS sent successfully:', twilioMessage.sid);

        return res.status(200).json({
            success: true,
            messageSid: twilioMessage.sid,
            status: twilioMessage.status
        });

    } catch (error) {
        console.error('Error sending SMS:', error);

        // Return user-friendly error message
        let errorMessage = 'Failed to send message';
        if (error.code === 21211) {
            errorMessage = 'Invalid phone number';
        } else if (error.code === 21608) {
            errorMessage = 'Phone number is not verified (Twilio trial account)';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.status(500).json({
            error: errorMessage,
            code: error.code
        });
    }
};
