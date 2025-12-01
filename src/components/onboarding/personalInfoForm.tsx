import { themeClasses } from "@/utils/theme";
import { Pronouns } from "@/utils/types/userDataTypes";

interface PersonalInfoFormProps {
  onNext: (data: {
    firstName: string;
    lastName: string;
    age: string;
    pronouns: Pronouns;
    hometown: string;
    baseCity: string;
  }) => void;
}

export default function PersonalInfoForm({ onNext }: PersonalInfoFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      age: formData.get("age") as string,
      pronouns: formData.get("pronouns") as Pronouns,
      hometown: formData.get("hometown") as string,
      baseCity: formData.get("baseCity") as string,
    };

    // Validate all fields are filled
    if (!data.firstName || !data.lastName || !data.age || !data.pronouns || !data.hometown || !data.baseCity) {
      return;
    }

    onNext(data);
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <p className={`${themeClasses.text.secondary} mb-6 text-center`}>
        Tell us about yourself
      </p>
      <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit} id="personalInfoForm">
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          required
          className={themeClasses.input.base}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          required
          className={themeClasses.input.base}
        />
        <input
          type="number"
          name="age"
          placeholder="Age"
          min="13"
          max="120"
          required
          className={themeClasses.input.base}
        />
        <select
          name="pronouns"
          required
          className={themeClasses.input.base}
          defaultValue=""
        >
          <option value="" disabled>Select pronouns</option>
          <option value="he/him/his">he/him/his</option>
          <option value="she/her/hers">she/her/hers</option>
          <option value="they/them/theirs">they/them/theirs</option>
          <option value="other">other</option>
        </select>
        <input
          type="text"
          name="hometown"
          placeholder="Hometown"
          required
          className={themeClasses.input.base}
        />
        <input
          type="text"
          name="baseCity"
          placeholder="Base City"
          required
          className={themeClasses.input.base}
        />
      </form>
      <button
        type="submit"
        form="personalInfoForm"
        className={`mt-6 ${themeClasses.button.primarySmall}`}
      >
        Continue
      </button>
    </div>
  );
}

