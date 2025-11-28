import { themeClasses } from "@/utils/theme";

export default function OTPForm({ handleOTP }: { handleOTP: (formData: FormData) => Promise<void> }) {
  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-6 text-center`}>Enter the 6-digit code sent to your phone</p>
      <form className="w-full flex flex-col gap-4" action={handleOTP} id="OTPForm">
        <input
          type="text"
          id="OTPCode"
          name="OTPCode"
          placeholder="000000"
          maxLength={6}
          minLength={6}
          className={`${themeClasses.input.base} text-center tracking-[0.5em] text-xl font-bold placeholder:text-gray-300`}
        />
      </form>
      <button
        className={`mt-6 ${themeClasses.button.primarySmall}`}
        form="OTPForm"
      >
        Verify
      </button>
    </div>
  );
}