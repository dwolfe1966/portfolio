import { Metadata } from "next";
import ContactClient from "./ContactClient";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact | David Wolfe",
  description: "Contact David Wolfe about AI-native lifecycle, acquisition, and revenue operating systems.",
  path: "/contact"
});

export default function ContactPage() {
  return <ContactClient />;
}
