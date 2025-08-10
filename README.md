# VALOR OS – Strava OAuth Backend (Bowerman)

Serverless Next.js API for handling Strava OAuth authentication and token management for the Bowerman running coach application.

## 🏃‍♂️ Overview

This backend service handles the complete Strava OAuth flow for Bowerman users:
- Initiates OAuth with Strava
- Handles the callback and token exchange
- Stores tokens securely in Airtable
- Automatically refreshes tokens before expiration

## 🚀 API Endpoints

### `GET /api/strava/start`
Initiates the Strava OAuth flow.

**Parameters:**
- `state` (required): Airtable user record ID (format: `rec...`)

**Example:**
\`\`\`
https://your-domain.vercel.app/api/strava/start?state=recABC123XYZ
\`\`\`

### `GET /api/strava/callback`
Handles the OAuth callback from Strava.

**Parameters:**
- `code`: Authorization code from Strava
- `state`: Airtable user record ID
- `error`: Error code (if user denied access)

### `GET /api/strava/refresh`
Refreshes tokens for users whose tokens expire within 24 hours.
- Runs automatically via Vercel cron every 6 hours
- Can be called manually for testing

## 🔧 Environment Variables

Set these in your Vercel project settings:

\`\`\`bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
AIRTABLE_TOKEN=pat_your_airtable_token
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_USERS_TABLE=Users
\`\`\`

## 📊 Airtable Schema

Your `Users` table should have these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `strava_athlete_id` | Number | Strava athlete ID |
| `strava_access_token` | Single line text | Current access token |
| `strava_refresh_token` | Single line text | Refresh token |
| `strava_token_expires_at` | Number | Unix timestamp |
| `strava_connected_at` | Date | When first connected |
| `strava_token_refreshed_at` | Date | Last refresh time |

## 🔐 Strava App Configuration

In your Strava API application settings:

1. **Authorization Callback Domain**: Set to your Vercel domain (no protocol/path)
   \`\`\`
   your-app.vercel.app
   \`\`\`

2. **Requested Scopes**: 
   - `read` - Read public profile info
   - `activity:read_all` - Read all activities

## 📝 User Onboarding Flow

1. Create a new user record in your Airtable `Users` table
2. Copy the record ID (starts with `rec`)
3. Send the user this link:
   \`\`\`
   https://your-domain.vercel.app/api/strava/start?state=RECORD_ID
   \`\`\`
4. User authorizes with Strava
5. Tokens are automatically stored in Airtable
6. Tokens refresh automatically every 6 hours

## 🧪 Testing

### Test OAuth Flow
1. Create a test user in Airtable
2. Visit `/api/strava/start?state=YOUR_RECORD_ID`
3. Complete Strava authorization
4. Check Airtable for populated token fields

### Test Token Refresh
Visit `/api/strava/refresh` to manually trigger token refresh for expiring tokens.

## 🚀 Deployment

1. Push code to GitHub
2. Import repository to Vercel
3. Set environment variables
4. Deploy
5. Configure Strava app callback domain
6. Test the flow

## 🔍 Monitoring

The refresh endpoint returns detailed status information:

\`\`\`json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "total": 5,
  "refreshed": 4,
  "errors": 1,
  "details": [
    {
      "userId": "recABC123",
      "status": "success"
    },
    {
      "userId": "recXYZ789",
      "status": "error",
      "error": "Invalid refresh token"
    }
  ]
}
\`\`\`

## 🛡️ Security Features

- Environment variable validation
- Airtable record ID format validation
- Comprehensive error handling
- Secure token storage
- Automatic token refresh
- HTTPS-only in production

## 📈 Next Steps

After deploying this auth backend, you can:
- Build the main Bowerman coaching application
- Integrate with Strava API to fetch activity data
- Implement the weekly coaching logic
- Add user management features
- Set up monitoring and analytics
