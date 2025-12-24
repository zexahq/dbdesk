import app from './app'

const PORT = process.env.PORT ?? 3000

const server = app.listen(PORT, () => {
  console.log(`DBDesk API server listening on http://localhost:${PORT}`)
  console.log(`Health check: GET http://localhost:${PORT}/health`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
