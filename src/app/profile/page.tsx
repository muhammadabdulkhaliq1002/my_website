import { redirect } from "next/navigation";

export default function ProfileRedirect() {
  redirect("/dashboard/profile");
}
