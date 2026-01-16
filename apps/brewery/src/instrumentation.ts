export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('@brewery/observability')
    initSentry()
  }
}









