"use client";
import LoginForm from "@/components/auth/login";
import OTPForm from "@/components/auth/otp";
import { handleUserSignIn, handleOTP } from "@/utils/supabase/handleRegistration";
import { themeClasses } from "@/utils/theme";
import { useState } from "react";
import { redirect } from "next/navigation";

export default function LoginPage() {
    const [OTP, setOTP] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    async function validateNumber(formData: FormData) {
        const number = formData.get("phoneNumber") as string;
        const result = await handleUserSignIn(number);
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
            redirect("/");
        }
    }

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Image & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/social_bonfire.jpg"
                        alt="Friends gathering around a bonfire"
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className={`absolute inset-0 ${themeClasses.gradient.imageOverlay}`} />
                </div>

                <div className="relative z-10 flex flex-col justify-end p-16 w-full text-white">
                    <h1 className={`${themeClasses.text.headingLarge} mb-6`}>
                        Meet your people,<br />
                        <span className={themeClasses.text.accentLight}>where you are.</span>
                    </h1>
                    <p className={`${themeClasses.text.bodyLarge} ${themeClasses.text.light} max-w-md`}>
                        Spontaneous hangouts, driven by real in-person connection. No swiping, just living.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className={`${themeClasses.text.headingMedium} ${themeClasses.text.primary}`}>
                            {OTP ? "Verify your account" : "Login to 4RL"}
                        </h2>
                        <p className={`mt-2 ${themeClasses.text.bodyMedium} ${themeClasses.text.secondary}`}>
                            {OTP ? "We've sent a code to your phone" : "Tap back into the community"}
                        </p>
                    </div>

                    <div className="mt-10">
                        {!OTP ? (
                            <div className="space-y-6">
                                <LoginForm handleLogin={validateNumber} />
                                {errorMessage && (
                                    <div className={themeClasses.error.container}>
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <OTPForm handleOTP={validateOTP} />
                                {errorMessage && (
                                    <div className={themeClasses.error.container}>
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}