# SMS Feature Setup Guide

Your Grateful app now supports sending SMS messages directly from the web! Here's how to set it up.

## Overview

The SMS feature uses:
- **Twilio** - SMS gateway service
- **Vercel** - Serverless function hosting (free tier available)

## Step 1: Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your email and phone number
4. You'll get **$15 in free credit** (enough for ~500 SMS messages)

## Step 2: Get Your Twilio Credentials

After signing up:

1. Go to your Twilio Console: [https://console.twilio.com/](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get a phone number:
   - Click "Get a Trial Number" or
   - Go to Phone Numbers → Buy a Number (free with trial credit)
4. Save these three values:
   - `TWILIO_ACCOUNT_SID` (starts with "AC...")
   - `TWILIO_AUTH_TOKEN` (long string of characters)
   - `TWILIO_PHONE_NUMBER` (format: +1234567890)

**Important**: With a trial account, you can only send SMS to phone numbers you've verified in Twilio. To send to any number, you'll need to upgrade (no monthly fee, just pay-per-message).

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Easiest)

1. Create a Vercel account at [https://vercel.com/signup](https://vercel.com/signup)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

3. In your terminal, navigate to the GratitudeWebApp folder:
   ```bash
   cd /Users/yashvarma/Documents/Claude/GratitudeWebApp
   ```

4. Login to Vercel:
   ```bash
   vercel login
   ```

5. Deploy your app:
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked about settings, just press Enter to accept defaults

6. Set environment variables:
   ```bash
   vercel env add TWILIO_ACCOUNT_SID
   vercel env add TWILIO_AUTH_TOKEN
   vercel env add TWILIO_PHONE_NUMBER
   ```
   - Paste each value when prompted
   - Select "Production" environment

7. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

Your app will be live at a URL like: `https://your-app-name.vercel.app`

### Option B: Deploy via GitHub (Automatic)

1. Create a GitHub repository for your app
2. Push your code to GitHub:
   ```bash
   cd /Users/yashvarma/Documents/Claude/GratitudeWebApp
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. Go to [https://vercel.com/new](https://vercel.com/new)
4. Import your GitHub repository
5. Add environment variables in Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add all three Twilio variables
6. Deploy!

## Step 4: Test the SMS Feature

1. Open your deployed app URL
2. Click "Send Gratitude 💌"
3. Enter a verified phone number (your own number if using trial)
4. Write a message
5. Click "Send Message"

## Costs

### Twilio Pricing:
- **Free trial**: $15 credit (~500 SMS)
- **After trial**: ~$0.0075 per SMS in the US
- **No monthly fees**: Pay only for messages sent

### Vercel Pricing:
- **Free tier**: 100GB bandwidth/month
- **Serverless functions**: Unlimited invocations on free tier
- Your app will likely stay within free tier limits

## Troubleshooting

### "Invalid phone number" error
- Make sure the number includes country code (+1 for US)
- Format: +12345678901

### "Phone number is not verified" error
- You're using a Twilio trial account
- Add the recipient's number to verified numbers in Twilio Console
- Or upgrade to a paid account (no monthly fee)

### "SMS service is not configured" error
- Environment variables are not set correctly
- Re-run: `vercel env add TWILIO_ACCOUNT_SID` etc.
- Redeploy: `vercel --prod`

### SMS not sending
- Check Twilio Console → Monitor → Logs for error details
- Verify you have credit remaining
- Ensure your Twilio phone number can send SMS (some can only receive)

## Alternative: Use for Local Testing Only

If you just want to test locally without deploying:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root folder:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

3. Run local development server:
   ```bash
   vercel dev
   ```

4. Open http://localhost:3000

## Security Notes

- ✅ API credentials are stored as environment variables (never in code)
- ✅ Serverless function runs on secure backend
- ✅ Phone numbers and messages are not stored on the server
- ⚠️ Consider adding rate limiting for production use
- ⚠️ Consider adding user authentication if needed

## Need Help?

- Twilio Documentation: [https://www.twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- Vercel Documentation: [https://vercel.com/docs](https://vercel.com/docs)

---

**That's it!** Your gratitude app can now send real SMS messages. 🎉
