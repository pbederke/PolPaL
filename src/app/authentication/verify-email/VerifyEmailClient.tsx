"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailClient() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const [resendEmail, setResendEmail] = useState("");
    const [resendState, setResendState] = useState<"idle" | "loading" | "done" | "error">("idle");

    const handleResend = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResendState("loading");
        try {
            await fetch("/api/authentication/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resendEmail }),
            });
            setResendState("done");
        } catch {
            setResendState("error");
        }
    };

    const title = "Verification failed";
    let message = "The verification link is invalid.";

    if (error === "expired_token") {
        message = "Your verification link has expired (links are valid for 24 hours).";
    } else if (error === "missing_token") {
        message = "No verification token was provided.";
    }

    const showResend = !!error;

    return (
        <div className="pt-20 justify-center bg-white px-4">
            <div style={{
                minHeight: '10vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                padding: '48px 16px'
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    maxWidth: "400px",
                    width: "100%",
                    backgroundColor: "#fff",
                    padding: "32px",
                    borderRadius: "20px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                }}>
                    <div style={{ fontSize: "28px", color: "#488ccc", fontWeight: 600, letterSpacing: "-1px" }}>
                        {title}
                    </div>

                    <p style={{ color: "rgba(88,87,87,0.822)", fontSize: "14px" }}>{message}</p>

                    {showResend && (
                        <>
                            <p style={{ color: "rgba(88,87,87,0.822)", fontSize: "14px" }}>
                                Enter your email address to receive a new verification link:
                            </p>

                            {resendState === "done" ? (
                                <p style={{ color: "green", fontSize: "14px" }}>
                                    If that email is registered and unverified, a new link has been sent. Please check your inbox.
                                </p>
                            ) : (
                                <form onSubmit={handleResend} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <label htmlFor="verify-resend-email" className="sr-only">Your email address</label>
                                    <input
                                        id="verify-resend-email"
                                        type="email"
                                        required
                                        aria-required="true"
                                        placeholder="Your email address"
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            outline: 0,
                                            border: "1px solid rgba(105,105,105,0.397)",
                                            borderRadius: "10px",
                                            background: "#fff",
                                            boxSizing: "border-box"
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={resendState === "loading"}
                                        style={{
                                            border: "none",
                                            outline: "none",
                                            backgroundColor: resendState === "loading" ? "#cccccc" : "#488ccc",
                                            padding: "10px",
                                            borderRadius: "10px",
                                            color: "#fff",
                                            fontSize: "16px",
                                            cursor: resendState === "loading" ? "not-allowed" : "pointer",
                                            width: "100%"
                                        }}
                                    >
                                        {resendState === "loading" ? "Sending…" : "Resend verification email"}
                                    </button>
                                    {resendState === "error" && (
                                        <p style={{ color: "red", fontSize: "12px" }}>Something went wrong. Please try again.</p>
                                    )}
                                </form>
                            )}
                        </>
                    )}

                    <p style={{ color: "rgba(88,87,87,0.822)", fontSize: "14px", textAlign: "center", marginTop: "8px" }}>
                        <Link href="/authentication/login" style={{ color: "#488ccc", textDecoration: "none" }}>Back to login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
