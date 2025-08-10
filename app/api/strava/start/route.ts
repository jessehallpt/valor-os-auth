import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state") // Airtable record id (user_id: rec...)

    if (!state) {
      return NextResponse.json({ error: "Missing 'state' parameter (Airtable user_id)" }, { status: 400 })
    }

    // Validate that state looks like an Airtable record ID
    if (!state.startsWith("rec")) {
      return NextResponse.json(
        { error: "Invalid state parameter. Must be Airtable record ID (rec...)" },
        { status: 400 },
      )
    }

    const clientId = process.env.STRAVA_CLIENT_ID
    if (!clientId) {
      console.error("Missing STRAVA_CLIENT_ID environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const redirectUri = `${protocol}://${host}/api/strava/callback`
    const scope = encodeURIComponent("read,activity:read_all")

    const authUrl = new URL("https://www.strava.com/oauth/authorize")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("approval_prompt", "auto")
    authUrl.searchParams.set("scope", scope)
    authUrl.searchParams.set("state", state)

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("Error starting Strava OAuth:", error)
    return NextResponse.json({ error: "Error starting Strava OAuth" }, { status: 500 })
  }
}
