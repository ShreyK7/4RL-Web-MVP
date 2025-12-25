"use client";
import SignupForm from "@/components/onboarding/signup";
import OTPForm from "@/components/onboarding/otp";
import PersonalInfoForm from "@/components/onboarding/personalInfoForm";
import AboutMeForm from "@/components/onboarding/aboutMeForm";
import InterestsForm from "@/components/onboarding/interestsForm";
import ProfilePhotoForm from "@/components/onboarding/profilePhotoForm";

import { handleUserSignIn, handleOTP } from "@/utils/supabase/auth";
import { uploadProfileData } from "@/utils/supabase/profile";
import { uploadProfilePhoto } from "@/utils/supabase/uploadProfilePhoto";
import { createClient } from "@/utils/supabase/browserClient";

import { themeClasses } from "@/utils/theme";
import { Pronouns } from "@/utils/types/userDataTypes";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type FormStep = "phone" | "otp" | "personalInfo" | "aboutMe" | "interests" | "profilePhoto" | "complete";

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState<FormStep>("phone");
    const [dataUploaded, setDataUploaded] = useState(false)
    const [errorMessage, setErrorMessage] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    
    // Form state
    const [personalInfo, setPersonalInfo] = useState<{
        firstName: string;
        lastName: string;
        age: string;
        pronouns: Pronouns;
        hometown: string;
        baseCity: string;
    }>({firstName: "", lastName: "", age: "", pronouns: "", hometown: "", baseCity: ""});
    const [aboutMe, setAboutMe] = useState<string>("");
    const [interests, setInterests] = useState<string[]>([]);

    async function validateNumber(formData: FormData) {
        const number = formData.get("phoneNumber") as string;
        const result = await handleUserSignIn(number);
        if (result.error) {
            setErrorMessage(result.error.message || "An error occured when validating your phone number");
        } else {
            console.log(result.data.user);
            setErrorMessage("");
            setStep("otp");
            setPhoneNumber(number);
        }
    }

    async function validateOTP(formData: FormData) {
        const OTPCode = formData.get("OTPCode") as string;
        const result = await handleOTP(OTPCode, phoneNumber);
        if (result.error) {
            setErrorMessage(result.error.message || "An error occured when validating your code");
        } else {
            setStep("personalInfo");
            setErrorMessage("");
        }
    }

    function handlePersonalInfoNext(data: {
        firstName: string;
        lastName: string;
        age: string;
        pronouns: Pronouns;
        hometown: string;
        baseCity: string;
    }) {
        setPersonalInfo(data);
        setStep("aboutMe");
    }

    function handleAboutMeNext(text: string) {
        setAboutMe(text);
        setStep("interests");
    }

    function handleInterestsNext(interestList: string[]) {
        setInterests(interestList);
        setStep("profilePhoto");
    }

    async function handleProfilePhotoComplete(profilePhoto: File | null) {
        await uploadUserProfileData();
        if (profilePhoto) {
            await uploadProfilePhoto(profilePhoto);
        }
        setStep("complete");
    }

    async function uploadUserProfileData() {
        const firstName = personalInfo.firstName;
        const lastName = personalInfo.lastName;
        const age = parseInt(personalInfo.age);
        const pronouns = personalInfo.pronouns;
        const hometown = personalInfo.hometown;
        const baseCity = personalInfo.baseCity;
        await uploadProfileData({
            first_name: firstName, 
            last_name: lastName,
            age: age, 
            pronouns: pronouns, 
            hometown: hometown, 
            baseCity: baseCity,
            about: aboutMe,
            interests: interests
        });
    }


    // Check if user is already authenticated and start at personalInfo step
    useEffect(() => {
        async function checkAuth() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setStep("personalInfo");
            }
        }
        checkAuth();
    }, []);

    // Redirect after completion
    useEffect(() => {
        if (step === "complete") {
            const timer = setTimeout(() => {
                router.push("/home");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [step, router]);

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
                            {step === "phone" && "Create your account"}
                            {step === "otp" && "Verify your account"}
                            {step === "personalInfo" && "Tell us about yourself"}
                            {step === "aboutMe" && "Share your story"}
                            {step === "interests" && "What interests you?"}
                            {step === "profilePhoto" && "Add your photo"}
                            {step === "complete" && "Welcome to 4RL!"}
                        </h2>
                        <p className={`mt-2 ${themeClasses.text.bodyMedium} ${themeClasses.text.secondary}`}>
                            {step === "phone" && "Join the community today"}
                            {step === "otp" && "We've sent a code to your phone"}
                            {step === "personalInfo" && "Let's get to know you"}
                            {step === "aboutMe" && "Help others get to know you"}
                            {step === "interests" && "Connect over shared passions"}
                            {step === "profilePhoto" && "Show your face to the community"}
                            {step === "complete" && "Your profile is complete!"}
                        </p>
                    </div>

                    <div className="mt-10">
                        {step === "phone" && (
                            <div className="space-y-6">
                                <SignupForm handleSignUp={validateNumber} />
                                {errorMessage && (
                                    <div className={themeClasses.error.container}>
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        {step === "otp" && (
                            <div className="space-y-6">
                                <OTPForm handleOTP={validateOTP} />
                                {errorMessage && (
                                    <div className={themeClasses.error.container}>
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        {step === "personalInfo" && (
                            <PersonalInfoForm onNext={handlePersonalInfoNext} />
                        )}
                        {step === "aboutMe" && (
                            <AboutMeForm onNext={handleAboutMeNext} />
                        )}
                        {step === "interests" && (
                            <InterestsForm onNext={handleInterestsNext} />
                        )}
                        {step === "profilePhoto" && (
                            <ProfilePhotoForm onComplete={handleProfilePhotoComplete} />
                        )}
                        {step === "complete" && (
                            <div className="text-center">
                                <p className={`${themeClasses.text.bodyLarge} ${themeClasses.text.secondary}`}>
                                    Redirecting you to the app...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}