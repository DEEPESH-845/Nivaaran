import { redirect } from "next/navigation";

/** The correct spelling, which is what people will actually type. */
export default function AadhaarSpellingRedirect() {
  redirect("/adhaar");
}
