import { NextResponse } from 'next/server'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 200, ...init })
}

export function badRequest(message = 'Bad Request', details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not Found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal Server Error', details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 500 })
}


