"use client";
import { signIn, signOut } from "next-auth/react";

export function GoogleButton() {
  return (
    <button className="btn btn-google" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.1 5.5c4.2-3.9 6.7-9.6 6.7-16.5z"/><path fill="#FBBC05" d="M10.5 28.3a14.5 14.5 0 0 1 0-8.6l-7.9-6.1a24 24 0 0 0 0 20.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.6 2.3-8.8 2.3-6.3 0-11.6-3.7-13.5-9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
      Entrar com Google
    </button>
  );
}

export function DiscordButton({ label = "Conectar Discord" }: { label?: string }) {
  return (
    <button className="btn btn-discord" onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4c1.9.5 3.1 1.2 4.3 2a13 13 0 0 0-11-.4c.3-.3.7-.6 1-.8L9.1 3A19.8 19.8 0 0 0 3.7 4.4C1.5 7.7.9 10.9 1.2 14a19.9 19.9 0 0 0 6 3l.8-1.3c-.7-.3-1.4-.6-2-1l.5-.3a14 14 0 0 0 11 0l.5.3c-.6.4-1.3.7-2 1L18 17a19.8 19.8 0 0 0 6-3c.4-3.7-.6-6.9-3.7-9.6zM9 13.3c-.9 0-1.6-.8-1.6-1.8S8.1 9.7 9 9.7s1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"/></svg>
      {label}
    </button>
  );
}

export function SignOutButton() {
  return <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>Sair</button>;
}
