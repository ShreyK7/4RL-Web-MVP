"use server";
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
import { redirect } from "next/navigation";

export async function handleUserSignIn(phoneNumber: string) {
    const supabase = await createClient();
    const {data, error} = await supabase.auth.signInWithOtp({
        phone: phoneNumber
    });
    if (error) {
        return { error };
    }
    console.log(data);
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
    console.log(session);
    return { session };
}

export async function logout() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }

    redirect("/welcome");
}

export async function deleteCurrentUser() {
    const supabase = await createClient();
    
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("No authenticated user found in session.");
    }

    const adminClient = createAuthClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
        throw error;
    }

    redirect("/welcome");
}