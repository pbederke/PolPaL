"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ResetPasswordFormData {
    password: string;
    confirmPassword: string;
}

export default function ResetPasswordClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState<ResetPasswordFormData>({
        password: "",
        confirmPassword: "",
    });

    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
    const [errorResponse, setErrorResponse] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorSubmit(null);
        setErrorResponse(null);

        if (!token) {
            setErrorSubmit("Missing or invalid reset token. Please request a new reset link.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorSubmit("Passwords do not match.");
            return;
        }

        setLoadingSubmit(true);

        try {
            const res = await fetch(`/api/authentication/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: formData.password }),
            });

            if (res.ok) {
                router.push("/authentication/login?reset=success");
            } else {
                const data = await res.json();
                setErrorResponse(data.message || "Password reset failed.");
            }
        } catch {
            setErrorSubmit("An error occurred during password reset.");
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
                            Reset Password
                        </div>

                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>Enter your new password to reset your password.</p>

                        {/* Password Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="reset-password" className="sr-only">Password</label>
                            <input
                                id="reset-password"
                                required
                                aria-required="true"
                                placeholder=""
                                type="password"
                                name="password"
                                title="Password"
                                value={formData.password}
                                onChange={handleChange}
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
                            }} aria-hidden="true">Password</span>
                        </div>

                        {/* Confirm Password Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="reset-confirm-password" className="sr-only">Password (repeat)</label>
                            <input
                                id="reset-confirm-password"
                                required
                                aria-required="true"
                                placeholder=""
                                type="password"
                                name="confirmPassword"
                                title="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
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
                            }} aria-hidden="true">Password (repeat)</span>
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
                                <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>Failed to send reset link.</p>
                                <ul style={{ color: 'red', fontSize: '12px', listStyleType: 'disc', paddingLeft: '20px', margin: '0' }}>
                                    {errorResponse && <li style={{ margin: '5px 0' }}>{errorResponse}</li>}
                                </ul>
                            </div>
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
