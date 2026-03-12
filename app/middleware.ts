import {createMiddlewareClient} from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Revisar si hay una sesión activa
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // 1. Si el usuario NO está logueado y trata de entrar al dashboard o legajos
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/legajos'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/'; // O la ruta de tu Login (ej: '/login')
    return NextResponse.redirect(url);
  }

  // 2. Si el usuario YA está logueado y trata de ir al Login, mandarlo al Dashboard
  if (session && pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return res;
}

// Configurar en qué rutas se debe ejecutar este guardia de seguridad
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/legajos/:path*', 
    '/'
  ],
};