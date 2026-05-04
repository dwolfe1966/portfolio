import { redirect } from "next/navigation";

export default function DemoPageRedirect() {
  redirect("/demo/dashboard");
}
