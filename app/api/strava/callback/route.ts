import { type NextRequest, NextResponse } from "next/server"

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
  }
}

async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const params = new URLSearchParams()
  params.append("client_id", process.env.STRAVA_CLIENT_ID!)
  params.append("client_secret", process.env.STRAVA_CLIENT_SECRET!)
  params.append("code", code)
  params.append("grant_type", "authorization_code")

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Strava token exchange failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

async function updateAirtableRecord(recordId: string, fields: Record<string, any>) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_USERS_TABLE!)}/${recordId}`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Airtable update failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // Airtable user_id (rec...)
    const error = searchParams.get("error")

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      return new NextResponse(
        `
        <html>
          <body style="font-family:system-ui;padding:24px;text-align:center">
            <h2>Connection cancelled ❌</h2>
            <p>You cancelled the Strava connection. You can close this tab.</p>
            <p style="color:#666;font-size:14px">Error: ${error}</p>
          </body>
        </html>
      `,
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      )
    }

    if (!code || !state) {
      return new NextResponse(
        `
        <html>
          <body style="font-family:system-ui;padding:24px;text-align:center">
            <h2>Connection error</h2>
            <p>Missing required parameters. Please try again.</p>
          </body>
        </html>
      `,
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      )
    }

    // Validate environment variables
    const requiredEnvVars = [
      "STRAVA_CLIENT_ID",
      "STRAVA_CLIENT_SECRET",
      "AIRTABLE_TOKEN",
      "AIRTABLE_BASE_ID",
      "AIRTABLE_USERS_TABLE",
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Missing environment variable: ${envVar}`)
        throw new Error("Server configuration error")
      }
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code)

    // Prepare fields for Airtable
    const fields = {
      strava_athlete_id: tokenData.athlete?.id || null,
      strava_access_token: tokenData.access_token || null,
      strava_refresh_token: tokenData.refresh_token || null,
      strava_token_expires_at: tokenData.expires_at || null,
      strava_connected_at: new Date().toISOString(),
    }

    // Update Airtable record
    await updateAirtableRecord(state, fields)

    // Success response
    return new NextResponse(
      `
      <html>
        <body style="font-family:system-ui;padding:24px;text-align:center">
          <h2>Bowerman connected ✅</h2>
          <p>Great! We've successfully connected your Strava account.</p>
          <p>You can close this tab. We'll pull your runs and generate your weekly plan automatically.</p>
          <div style="margin-top:20px;padding:16px;background:#f0f9ff;border-radius:8px;color:#0369a1">
            <strong>What happens next?</strong><br>
            • We'll analyze your recent running data<br>
            • Every Saturday, you'll get your personalized weekly plan<br>
            • Your data is secure and only used for coaching
          </div>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    )
  } catch (error) {
    console.error("OAuth callback error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return new NextResponse(
      `
      <html>
        <body style="font-family:system-ui;padding:24px;text-align:center">
          <h2>Connection error</h2>
          <p>We couldn't complete the Strava connection. Please try again.</p>
          <details style="margin-top:16px;text-align:left">
            <summary style="cursor:pointer;color:#666">Technical details</summary>
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;overflow:auto">${errorMessage.replace(/</g, "&lt;")}</pre>
          </details>
        </body>
      </html>
    `,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    )
  }
}
