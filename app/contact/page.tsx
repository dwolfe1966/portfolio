"use client";

import { FormEvent, useState } from "react";
import { Section } from "@/components/site/Section";
import { readErrorMessage } from "@/lib/api-contract";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("General");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, topic, message, website })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setStatus(`Error: ${readErrorMessage(payload, "Unable to submit contact request.")}`);
        return;
      }

      setStatus("Thanks — your message was received. I’ll reply soon.");
      setName("");
      setEmail("");
      setCompany("");
      setTopic("General");
      setMessage("");
      setWebsite("");
    } catch {
      setStatus("Error: network issue while submitting contact request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section title="Contact">
      <p>If you’re building lifecycle or acquisition systems and want to collaborate, send a message below.</p>

      <form className="card" onSubmit={onSubmit}>
        <div className="grid grid-2">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Company
            <input value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>
          <label>
            Topic
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option>General</option>
              <option>Consulting</option>
              <option>Lifecycle app</option>
              <option>Acquisition app</option>
              <option>Speaking</option>
            </select>
          </label>
        </div>

        <label>
          Message
          <textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} required />
        </label>

        <label style={{ display: "none" }} aria-hidden>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>

        <div className="ctaRow">
          <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send message"}</button>
        </div>
        {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
      </form>
    </Section>
  );
}
