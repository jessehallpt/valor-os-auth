import { type NextRequest, NextResponse } from "next/server"

interface AirtableUser {
  id: string
  fields: {
    strava_refresh_token?: string
    strava_token_expires_at?: number
    strava_athlete_id?: number
  }
}

interface AirtableResponse {
  records: AirtableUser[]
}

async function refreshStravaToken(user: AirtableUser): Promise<void> {
  if (!user.fields.strava_refresh_token) {
    throw new Error("No refresh token available")
  }

  const params = new URLSearchParams()
  params.append("client_id", process.env.STRAVA_CLIENT_ID!)
  params.append("client_secret", process.env.STRAVA_CLIENT_SECRET!)
  params.append("grant_type", "refresh_token")
  params.append("refresh_token", user.fields.strava_refresh_token)

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Strava refresh failed: ${response.status} ${errorText}`)
  }

  const tokenData = await response.json()

  // Update Airtable with new tokens
  const updateUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_USERS_TABLE!)}/${user.id}`

  const updateResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
        strava_token_refreshed_at: new Date().toISOString(),
      },
    }),
  })

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    throw new Error(`Airtable update failed: ${updateResponse.status} ${errorText}`)
  }
}

export async function GET(request: NextRequest) {
  try {
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
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }
    }

    // Find users whose tokens expire in the next 24 hours
    const now = Math.floor(Date.now() / 1000)
    const soon = now + 24 * 3600 // 24 hours from now

    const filter = encodeURIComponent(`{strava_token_expires_at} < ${soon}`)
    const listUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_USERS_TABLE!)}?filterByFormula=${filter}&pageSize=50`

    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    })

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      throw new Error(`Airtable list failed: ${listResponse.status} ${errorText}`)
    }

    const listData: AirtableResponse = await listResponse.json()
    const users = listData.records || []

    console.log(`Found ${users.length} users with tokens expiring soon`)

    const results = {
      total: users.length,
      refreshed: 0,
      errors: 0,
      details: [] as Array<{ userId: string; status: string; error?: string }>,
    }

    // Refresh tokens for each user
    for (const user of users) {
      if (user.fields.strava_refresh_token) {
        try {
          await refreshStravaToken(user)
          results.refreshed++
          results.details.push({
            userId: user.id,
            status: "success",
          })
          console.log(`Successfully refreshed token for user ${user.id}`)
        } catch (error) {
          results.errors++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          results.details.push({
            userId: user.id,
            status: "error",
            error: errorMessage,
          })
          console.error(`Failed to refresh token for user ${user.id}:`, errorMessage)
        }
      } else {
        results.details.push({
          userId: user.id,
          status: "skipped",
          error: "No refresh token available",
        })
        console.log(`Skipped user ${user.id} - no refresh token`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error("Token refresh cron error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
