export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">Bowerman Auth</h1>
        <p className="text-gray-600 text-center">VALOR OS - Strava OAuth Backend for Bowerman Running Coach</p>
        <div className="mt-6 space-y-2">
          <div className="text-sm text-gray-500">
            <strong>Endpoints:</strong>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • <code>/api/strava/start</code> - Begin OAuth flow
            </li>
            <li>
              • <code>/api/strava/callback</code> - Handle OAuth callback
            </li>
            <li>
              • <code>/api/strava/refresh</code> - Refresh tokens (cron)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
