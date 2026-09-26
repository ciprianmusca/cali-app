export type Locale = "ro" | "en";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "ro", label: "Romanian", native: "Română" },
  { code: "en", label: "English", native: "English" },
];

export type MessageKey = keyof typeof import("./messages/ro").ro;
