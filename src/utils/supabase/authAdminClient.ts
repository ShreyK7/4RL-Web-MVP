import { createClient } from '@supabase/supabase-js'

export default function createAuthClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PRIVATE_SUPABASE_SECRET_KEY!, 
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        } 
    )
}