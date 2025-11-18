export default function SignupForm({ handleSignUp }: { handleSignUp: (formData: FormData) => Promise<void> }) {
  return (
    <div className="flex flex-col items-center">
      <p>Enter your phone number to sign up for 4RL</p>
      <form className="my-2 border border-black rounded" action={handleSignUp} id="signupForm">
        <input 
          type="tel" 
          id="phoneNumber"
          name="phoneNumber"
          placeholder="enter phone number"
          minLength={11}
          className="placeholder:text-center"
        />
      </form>
      <button 
        className="bg-transparent hover:bg-red-500 font-semibold border border-black rounded w-20" 
        form="signupForm"
      >
        Register
      </button>
    </div>
  );
}