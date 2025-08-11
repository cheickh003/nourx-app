import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Lire le corps brut pour vérifier la signature HMAC
    const body = await request.text();
    const signature = request.headers.get('x-token');
    
    // TODO: Implémenter la vérification HMAC avec CinetPay dans la Phase 3
    console.log('Webhook CinetPay reçu:', { body, signature });
    
    return NextResponse.json({ 
      status: 'received',
      message: 'Webhook CinetPay - À implémenter dans la Phase 3'
    });
  } catch (error) {
    console.error('Erreur webhook CinetPay:', error);
    return NextResponse.json(
      { error: 'Erreur traitement webhook' }, 
      { status: 500 }
    );
  }
}
