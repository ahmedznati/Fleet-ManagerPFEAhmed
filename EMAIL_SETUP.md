# Email Setup Instructions

To enable email functionality for sending driver credentials:

## 1. Install nodemailer

Run this command in the project root:
```bash
npm install nodemailer @types/nodemailer
```

## 2. Configure Gmail App Password

Since you're using Gmail (rannniakhedri@gmail.com), you need to create an App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security
3. Enable 2-Step Verification (if not already enabled)
4. Go to "App passwords" (search for it in settings)
5. Generate a new app password for "Mail" 
6. Copy the 16-character password

## 3. Set Environment Variable

Create a `.env` file in the project root (if it doesn't exist) and add:

```env
EMAIL_PASSWORD=your-16-character-app-password-here
```

**Important:** Never commit the `.env` file to Git!

## 4. Restart the Backend

After setting up the environment variable, restart your backend server.

## How It Works

When an admin creates a new driver:
1. A random password is generated (12 characters)
2. An auth user account is created with the driver's email
3. A driver record is linked to the auth user
4. An email is sent to the driver with their credentials
5. The driver receives a beautifully formatted email with:
   - Welcome message
   - Login email
   - Temporary password
   - Link to login page
   - Instructions to change password

## Testing

1. Create a new driver from the admin panel
2. Check the console for "[EMAIL] Credentials sent to..." message
3. Check the driver's email inbox
4. Driver can login with the provided credentials

## Troubleshooting

If emails are not being sent:
- Check the console for error messages
- Verify the EMAIL_PASSWORD environment variable is set correctly
- Ensure Gmail App Password is correct
- Check that 2-Step Verification is enabled on the Gmail account
- The app will continue to work even if email fails - credentials are just not sent automatically
