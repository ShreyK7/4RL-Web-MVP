"use client";
import SignupForm from "@/components/auth/signup";
import OTPForm from "@/components/auth/otp";
import { handleUserSignUp, handleOTP } from "@/utils/supabase/handleRegistration";
import { useState } from "react";
import { redirect } from "next/navigation";

export default function SignUpPage() {
    const [OTP, setOTP] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    async function validateNumber(formData: FormData) {
        const number = formData.get("phoneNumber") as string;
        const result = await handleUserSignUp(number);
        if (result.error) {
            setErrorMessage(result.error.message || "An error occured when validating your phone number");
        } else {
            console.log(result.data.user);
            setErrorMessage("");
            setOTP(true);
            setPhoneNumber(number);
        }
    }

    async function validateOTP(formData: FormData) {
        const OTPCode = formData.get("OTPCode") as string;
        const result = await handleOTP(OTPCode, phoneNumber);
        if (result.error) {
            setErrorMessage(result.error.message || "An error occured when validating your code");
        } else {
            redirect("/login");
        }
    }

    return (
        <div className="flex flex-row h-screen items-center">
            <div className="flex flex-col justify-center items-center w-1/2">
                <h1 className="mb-3 font-medium text-lg">Join 4RL, meet lifelong friends</h1>
                <img src="/groupPhoto.JPG" alt="group of friends" className="rounded"/>
            </div>
            <div className="flex flex-row justify-center w-1/2">
                {!OTP ? (
                    <div className="flex flex-col items-center">
                        <SignupForm handleSignUp={validateNumber}/>
                        {errorMessage && (
                            <p className="text-red-500">{errorMessage}</p>
                        )}
                    </div>
                ) : (
                    <OTPForm handleOTP={validateOTP}/>
                )}
            </div>
        </div>
    )
}