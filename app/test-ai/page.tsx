import { redirect } from "next/navigation";

export default function LegacyTestRedirect() {
  redirect("/admin/test-ai");
}
