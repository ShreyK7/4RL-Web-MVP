export default function OTPForm({ handleOTP }: { handleOTP: (formData: FormData) => Promise<void>}) {
    return (
        <div className="flex flex-col items-center">
          <p>Enter the 6 digit SMS code you recieved to validate your account</p>
          <form className="my-2 border border-black rounded" action={handleOTP} id="OTPForm">
            <input 
              type="text" 
              id="OTPCode"
              name="OTPCode"
              placeholder="enter 6 digit code"
              maxLength={6}
              minLength={6}
              className="placeholder:text-center"
            />
          </form>
          <button 
            className="bg-transparent hover:bg-red-500 font-semibold border border-black rounded w-20" 
            form="OTPForm"
          >
            Validate number
          </button>
        </div>
      );
}