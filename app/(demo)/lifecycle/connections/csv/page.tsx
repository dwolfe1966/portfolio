import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LifecycleCsvConnectionPage() {
  redirect("/workspace/connections/csv?tool=lifecycle");
}
