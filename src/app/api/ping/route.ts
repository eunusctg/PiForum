export async function GET() {
  return Response.json({ 
    success: true, 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: typeof globalThis !== 'undefined' ? 'has globalThis' : 'no globalThis'
  });
}
