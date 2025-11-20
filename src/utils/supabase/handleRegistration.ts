"use server"
import { createClient } from "./serverClient"

export async function handleUserSignIn(phoneNumber: string) {
    const supabase = await createClient();
    const {data, error} = await supabase.auth.signInWithOtp({
        phone: phoneNumber
    });
    if (error) {
        return { error };
    }
    console.log(data)
    return { data };
}

export async function handleOTP(OTPCode: string, phoneNumber: string) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: OTPCode,
        type: 'sms',
    });
    if (error) {
        return { error };
    }
    
    console.log(session)
    return { session }
}