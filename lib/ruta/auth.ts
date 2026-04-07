import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RutaRole = 'ruta_dispatcher' | 'ruta_admin' | 'ruta_driver'

export async function requireRutaRole(
  roles: RutaRole[]
): Promise<{ user: { id: string; email: string; ruta_role: string }; error?: never } | { user?: never; error: NextResponse }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  const rutaRole = (user.user_metadata as Record<string, unknown>)?.ruta_role as string | undefined

  if (!rutaRole || !roles.includes(rutaRole as RutaRole)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: insufficient RUTA role' },
        { status: 403 }
      ),
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      ruta_role: rutaRole,
    },
  }
}

export async function getAuthUser(): Promise<{
  user: { id: string; email: string } | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null }
  return { user: { id: user.id, email: user.email ?? '' } }
}
