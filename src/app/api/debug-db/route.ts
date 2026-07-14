import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const isWorkers = typeof (globalThis as any).WebSocketPair === 'function';
    
    let d1Binding = 'not checked';
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const ctx = await getCloudflareContext({ async: true });
      const env = (ctx as any).env;
      d1Binding = env?.DB ? 'D1 binding found' : 'D1 binding NOT found';
    } catch (e: any) {
      d1Binding = `Error: ${e.message}`;
    }
    
    let prismaStatus = 'not checked';
    try {
      const { PrismaClient } = await import('@prisma/client');
      prismaStatus = `PrismaClient imported: ${typeof PrismaClient}`;
    } catch (e: any) {
      prismaStatus = `Error: ${e.message}`;
    }
    
    let clientStatus = 'not checked';
    try {
      const { PrismaClient } = await import('@prisma/client');
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { PrismaD1 } = await import('@prisma/adapter-d1');
      
      const ctx = await getCloudflareContext({ async: true });
      const env = (ctx as any).env;
      const d1 = env?.DB;
      
      if (d1) {
        const client = new PrismaClient({ adapter: new PrismaD1(d1) });
        clientStatus = 'PrismaClient created successfully';
      } else {
        clientStatus = 'D1 binding not available';
      }
    } catch (e: any) {
      clientStatus = `Error: ${e.message}`;
    }
    
    return NextResponse.json({ isWorkers, d1Binding, prismaStatus, clientStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
