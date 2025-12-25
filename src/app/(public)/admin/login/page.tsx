"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn, adminVerifyOTP } from "@/utils/supabase/admin";
import { themeClasses } from "@/utils/theme";

export default function AdminLoginPage() {
  const router = useRouter();
  const [OTP, setOTP] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const number = formData.get("phoneNumber") as string;

    const result = await adminSignIn(number);
    if (result.error) {
      setErrorMessage(result.error.message || "An error occurred when validating your phone number");
      setLoading(false);
    } else {
      setErrorMessage("");
      setOTP(true);
      setPhoneNumber(number);
      setLoading(false);
    }
  }

  async function handleOTPSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const OTPCode = formData.get("OTPCode") as string;

    const result = await adminVerifyOTP(OTPCode, phoneNumber);
    if (result.error) {
      setErrorMessage(result.error.message || "An error occurred when validating your code");
      setLoading(false);
    } else {
      // Redirect to admin dashboard
      router.push("/admin");
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className={`${themeClasses.text.headingMedium} ${themeClasses.text.primary}`}>
              {OTP ? "Verify Admin Access" : "Admin Login"}
            </h2>
            <p className={`mt-2 ${themeClasses.text.bodyMedium} ${themeClasses.text.secondary}`}>
              {OTP ? "Enter the code sent to your phone" : "Enter your admin phone number"}
            </p>
          </div>

          <div className="mt-10">
            {!OTP ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="+112818579733"
                    required
                    className={themeClasses.input.base}
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${themeClasses.button.primarySmall} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? "Sending..." : "Send Code"}
                </button>
                {errorMessage && (
                  <div className={themeClasses.error.container}>
                    {errorMessage}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div>
                  <label htmlFor="OTPCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="OTPCode"
                    name="OTPCode"
                    placeholder="000000"
                    required
                    maxLength={6}
                    className={themeClasses.input.base}
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${themeClasses.button.primarySmall} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
                {errorMessage && (
                  <div className={themeClasses.error.container}>
                    {errorMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOTP(false);
                    setErrorMessage("");
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  Back to phone number
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

