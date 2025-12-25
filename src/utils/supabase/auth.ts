"use server";
import { createClient } from "./serverClient";
import createAuthClient from "./authAdminClient";
import { setDroppedInStatus } from "./dropIn";
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
    // Set dropped_in status to false before logging out
    try {
        await setDroppedInStatus(false);
    } catch (error) {
        // If setting dropped_in status fails, continue with logout anyway
        console.error("Error setting dropped_in status:", error);
    }

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

    // Delete user's profile photo (if any) before removing the user
    try {
        const bucket = "user_profile_photos";
        const { data: files, error: listError } = await supabase.storage
            .from(bucket)
            .list(user.id);

        if (listError) {
            console.error("Error listing profile photos:", listError);
        } else if (files && files.length > 0) {
            const pathsToRemove = files.map((file) => `${user.id}/${file.name}`);
            const { error: removeError } = await supabase.storage
                .from(bucket)
                .remove(pathsToRemove);

            if (removeError) {
                console.error("Error removing profile photos:", removeError);
            }
        }
    } catch (error) {
        console.error("Unexpected error removing profile photos:", error);
    }

    // Delete the user via admin client
    const adminClient = createAuthClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
        throw error;
    }

    redirect("/welcome");
}