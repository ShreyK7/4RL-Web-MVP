import { themeClasses } from "@/utils/theme";

export default function SignupForm({ handleSignUp }: { handleSignUp: (formData: FormData) => Promise<void> }) {
  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-6 text-center`}>Enter your phone number to get started</p>
      <form className="w-full flex flex-col gap-4" action={handleSignUp} id="signupForm">
        <div className="relative">
          <input 
            type="tel" 
            id="phoneNumber"
            name="phoneNumber"
            placeholder="Phone Number"
            minLength={11}
            className={themeClasses.input.base}
          />
        </div>
      </form>
      <button 
        className={`mt-6 ${themeClasses.button.primarySmall}`}
        form="signupForm"
      >
        Continue
      </button>
    </div>
  );
}