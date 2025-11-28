export type Pronouns = 'he/him/his' | 'she/her/hers' | 'they/them/theirs' | 'other' | '';

export interface profileData {
    name: String,
    age: Number,
    pronouns: Pronouns,
    about: String,
    hometown: String,
    baseCity: String,
    interests: String[],
};

