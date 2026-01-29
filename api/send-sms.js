// Serverless function to send SMS or WhatsApp messages using Twilio
// This file can be deployed to Vercel, Netlify, or any serverless platform

const twilio = require('twilio');

// IMPORTANT: Set these as environment variables in your deployment platform
// DO NOT hardcode your actual credentials here
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

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
        const { to, message, channel } = req.body;

        // Validate input
        if (!to || !message) {
            return res.status(400).json({ error: 'Phone number and message are required' });
        }

        // Validate environment variables
        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error('Missing Twilio credentials');
            return res.status(500).json({ error: 'Messaging service is not configured' });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Format phone number (ensure it has country code)
        let formattedPhone = to.trim();
        if (!formattedPhone.startsWith('+')) {
            // Assume US number if no country code
            formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
        }

        const isWhatsApp = channel === 'whatsapp';

        // Build message options
        const messageOptions = {
            body: message,
            to: isWhatsApp ? `whatsapp:${formattedPhone}` : formattedPhone,
            from: isWhatsApp ? twilioWhatsAppNumber : twilioPhoneNumber
        };

        // Send message
        const twilioMessage = await client.messages.create(messageOptions);

        console.log(`${isWhatsApp ? 'WhatsApp' : 'SMS'} sent successfully:`, twilioMessage.sid);

        return res.status(200).json({
            success: true,
            messageSid: twilioMessage.sid,
            status: twilioMessage.status,
            channel: isWhatsApp ? 'whatsapp' : 'sms'
        });

    } catch (error) {
        console.error('Error sending message:', error);

        // Return user-friendly error message
        let errorMessage = 'Failed to send message';
        if (error.code === 21211) {
            errorMessage = 'Invalid phone number';
        } else if (error.code === 21608) {
            errorMessage = 'Phone number is not verified (Twilio trial account)';
        } else if (error.code === 63007) {
            errorMessage = 'WhatsApp: Recipient has not opted in. They must message your WhatsApp number first.';
        } else if (error.code === 63016) {
            errorMessage = 'WhatsApp: Message failed to send. The recipient may not have WhatsApp.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.status(500).json({
            error: errorMessage,
            code: error.code
        });
    }
};
