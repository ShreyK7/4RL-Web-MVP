import { themeClasses } from "@/utils/theme";

interface PersonalInfoFormProps {
  onNext: (data: {
    name: string;
    age: string;
    pronouns: string;
    hometown: string;
    baseCity: string;
  }) => void;
}

export default function PersonalInfoForm({ onNext }: PersonalInfoFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      age: formData.get("age") as string,
      pronouns: formData.get("pronouns") as string,
      hometown: formData.get("hometown") as string,
      baseCity: formData.get("baseCity") as string,
    };

    // Validate all fields are filled
    if (!data.name || !data.age || !data.pronouns || !data.hometown || !data.baseCity) {
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
          name="name"
          placeholder="Name"
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
        <input
          type="text"
          name="pronouns"
          placeholder="Pronouns (e.g., she/her, he/him, they/them)"
          required
          className={themeClasses.input.base}
        />
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

