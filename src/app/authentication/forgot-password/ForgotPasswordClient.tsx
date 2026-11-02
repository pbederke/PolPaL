"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordClient() {
    const [email, setEmail] = useState("");
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
    const [errorResponse, setErrorResponse] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorSubmit(null);
        setErrorResponse(null);
        setSuccessMessage(null);
        setLoadingSubmit(true);

        try {
            const res = await fetch(`/api/authentication/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });

            if (res.ok) {
                setSuccessMessage("If an account exists for that email, a reset link has been sent. Please check your inbox.");
            } else {
                const data = await res.json();
                setErrorResponse(data.message || "Failed to send reset link.");
            }
        } catch {
            setErrorSubmit("An error occurred. Please try again.");
        } finally {
            setLoadingSubmit(false);
        }
    };

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
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxWidth: '400px',
                    width: '100%',
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '20px',
                    position: 'relative',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}>
                    <form onSubmit={handleSubmit}>
                        {/* Title */}
                        <div style={{
                            fontSize: '28px',
                            color: '#488ccc',
                            fontWeight: '600',
                            letterSpacing: '-1px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '30px',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                borderRadius: '50%',
                                left: '0px',
                                backgroundColor: '#488ccc'
                            }}></div>
                            <div style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                borderRadius: '50%',
                                left: '0px',
                                backgroundColor: '#367bb5',
                                animation: 'pulse 1s linear infinite'
                            }}></div>
                            Forgot Password
                        </div>

                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>Enter your email address to receive a password reset link.</p>

                        {/* Success Message */}
                        {successMessage && (
                            <div style={{
                                backgroundColor: '#f0fff4',
                                border: '1px solid #9ae6b4',
                                borderRadius: '8px',
                                padding: '10px',
                                marginBottom: '15px'
                            }}>
                                <p style={{ color: '#276749', fontSize: '14px', margin: 0 }}>{successMessage}</p>
                            </div>
                        )}

                        {/* Email Input */}
                        {!successMessage && (
                            <>
                                <div style={{ position: 'relative', marginBottom: '15px' }}>
                                    <label htmlFor="forgot-email" className="sr-only">Email address</label>
                                    <input
                                        id="forgot-email"
                                        required
                                        aria-required="true"
                                        placeholder=""
                                        type="email"
                                        name="email"
                                        title="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 10px 20px 10px',
                                            outline: '0',
                                            border: '1px solid rgba(105, 105, 105, 0.397)',
                                            borderRadius: '10px',
                                            background: '#fff'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        left: '10px',
                                        top: '15px',
                                        color: 'grey',
                                        fontSize: '0.9em',
                                        cursor: 'text',
                                        transition: '0.3s ease',
                                        pointerEvents: 'none'
                                    }} aria-hidden="true">Email address</span>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loadingSubmit}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        backgroundColor: loadingSubmit ? '#cccccc' : '#488ccc',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '16px',
                                        transition: '0.3s ease',
                                        cursor: loadingSubmit ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                        marginTop: '10px',
                                        marginBottom: '10px'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!loadingSubmit) {
                                            (e.target as HTMLElement).style.backgroundColor = '#367bb5';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!loadingSubmit) {
                                            (e.target as HTMLElement).style.backgroundColor = '#488ccc';
                                        }
                                    }}
                                >
                                    {loadingSubmit ? "Submitting..." : "Send Reset Link"}
                                </button>

                                {/* Error Display */}
                                {(errorSubmit || errorResponse) && (
                                    <div role="alert" style={{
                                        backgroundColor: '#fee',
                                        border: '1px solid #fcc',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        marginTop: '10px'
                                    }}>
                                        <p style={{ color: 'red', fontSize: '14px', marginBottom: errorResponse ? '10px' : '0' }}>Failed to send reset link.</p>
                                        {errorResponse && (
                                            <ul style={{ color: 'red', fontSize: '12px', listStyleType: 'disc', paddingLeft: '20px', margin: '0' }}>
                                                <li style={{ margin: '5px 0' }}>{errorResponse}</li>
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Login Link */}
                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            textAlign: 'center',
                            marginTop: '10px'
                        }}>
                            Remembered your password? <Link href="/authentication/login" style={{ color: '#488ccc', textDecoration: 'none' }}>Login</Link>
                        </p>
                    </form>
                </div>

                {/* CSS Animation */}
                <style jsx>{`
                @keyframes pulse {
                    from {
                        transform: scale(0.9);
                        opacity: 1;
                    }
                    to {
                        transform: scale(1.8);
                        opacity: 0;
                    }
                }

                input:focus + span,
                input:valid + span {
                    top: 30px !important;
                    font-size: 0.7em !important;
                    font-weight: 600 !important;
                }

                input:valid + span {
                    color: green !important;
                }
            `}</style>
            </div>
        </div>
    );
}

