"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface RegisterFormData {
    nameFirst: string;
    nameLast: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

interface CheckEmailState {
    isLoadingEmail: boolean;
    errorEmail: string | null;
    isDisposableEmail: boolean | null;
};

export default function RegisterClient() {

    // Auth context and router
    const router = useRouter();
    const { refreshAuth } = useAuth();

    // State Agreement
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

    // Form state
    const [registerFormData, setRegisterFormData] = useState<RegisterFormData>({
        nameFirst: "",
        nameLast: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
    });

    // State for email validation
    const [stateEmail, setStateEmail] = useState<CheckEmailState>({
        isLoadingEmail: false,
        errorEmail: null,
        isDisposableEmail: null,
    });

    // General error state for form submission
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
    const [errorReservedWords, setErrorReservedWords] = useState<string | null>(null);
    const [errorUsername, setErrorUsername] = useState<string | null>(null);
    const [errorEmailValid, setErrorEmailValid] = useState<string | null>(null);
    const [errorEmailDisposable, setErrorEmailDisposable] = useState<string | null>(null);
    const [errorPassword, setErrorPassword] = useState<string | null>(null);
    const [errorPasswordEqual, setErrorPasswordEqual] = useState<string | null>(null);
    const [errorResponse, setErrorResponse] = useState<string | null>(null);

    // Reserved words that should not be used in usernames
    const RESERVED_WORDS = ["admin", "root", "support", "superuser"];

    // Handle form input changes
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setRegisterFormData((prev) => ({
            ...prev,
            [name]: value,
            username: name === "username" ? value.trim().toLowerCase() : prev.username, // Trim username
            nameFirst: name === "nameFirst" ? value.trimStart() : prev.nameFirst, // Trim first name
            nameLast: name === "nameLast" ? value.trimStart() : prev.nameLast, // Trim last name
            email: name === "email" ? value.trim().toLowerCase() : prev.email, // Trim email
            password: name === "password" ? value.trim() : prev.password, // Update password
            confirmPassword: name === "confirmPassword" ? value.trim() : prev.confirmPassword, // Update confirm password
        }));

        // If email field is changed, reset email validation state
        if (name === "email") {
            setStateEmail({
                isLoadingEmail: false,
                errorEmail: null,
                isDisposableEmail: null,
            });
            setErrorEmailDisposable(null); // Reset the main error state too
        }
        if (name === "email" && value.trim().match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
            // trigger check in parent component
            checkDisposableEmail(value.trim());
        }
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorSubmit(null);
        setErrorReservedWords(null);
        setErrorUsername(null);
        setErrorEmailValid(null);
        setErrorEmailDisposable(null);
        setErrorPassword(null);
        setErrorPasswordEqual(null);
        setErrorResponse(null);
        setLoadingSubmit(true);

        // USERNAME VALIDATION
        const lowercaseUsername = registerFormData.username.toLowerCase();
        const containsReservedWord = RESERVED_WORDS.some((word) =>
            lowercaseUsername.includes(word)
        );

        // Check if user agreed to terms
        if (!agreedToTerms) {
            setErrorSubmit("You must agree to the Imprint terms.");
            setLoadingSubmit(false);
            return;
        }
        if (!agreedToPrivacy) {
            setErrorSubmit("You must agree to the Data Protection terms.");
            setLoadingSubmit(false);
            return;
        }

        // Check for reserved words
        if (containsReservedWord) {
            setErrorReservedWords("This username contains reserved words.");
            setLoadingSubmit(false);
        }

        // Check for usename length and characters
        if (lowercaseUsername.length < 3 || lowercaseUsername.length > 50) {
            setErrorUsername("Username must be between 3 and 50 characters.");
            setErrorSubmit("Registration failed");
            setLoadingSubmit(false);
        }

        // EMAIL VALIDATION
        const cleanedEmail = registerFormData.email.trim().toLowerCase();
        if (!cleanedEmail.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
            setErrorEmailValid("Please enter a valid email address.");
            setErrorSubmit("Registration failed");
            setLoadingSubmit(false);
        }

        // Check if disposable
        const isDisposable = await checkDisposableEmail(registerFormData.email);
        if (isDisposable) {
            setErrorEmailDisposable("Disposable email addresses are not allowed.");
            setErrorSubmit("Registration failed");
            setLoadingSubmit(false);
        }

        // PASSWORD VALIDATION
        const passwordError = await validatePassword(registerFormData.password);
        if (passwordError) {
            setErrorPassword("Enter a valid password.");
            setErrorSubmit("Registration failed");
            setLoadingSubmit(false);
        }

        const passwordEqualError = registerFormData.password !== registerFormData.confirmPassword ? "Passwords do not match." : null;
        if (passwordEqualError) {
            setErrorPasswordEqual(passwordEqualError);
            setErrorSubmit("Registration failed");
            setLoadingSubmit(false);
            return;
        }

        if (errorReservedWords || errorUsername || errorEmailValid || errorEmailDisposable || errorPassword || errorPasswordEqual) {
            setErrorSubmit("Registration failed:");
            setLoadingSubmit(false);
            return;
        }

        try {
            const registerRes = await fetch(`/api/authentication/register`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerFormData),
            });

            if (registerRes.ok) {
                await refreshAuth();
                router.push("/authentication/register/approval");
            } else {
                const data = await registerRes.json();
                setErrorResponse(data.error || data.message || "Registration failed");
            }
        } catch {
            setErrorSubmit("An error occurred during registration");
        } finally {
            setLoadingSubmit(false);
        }
    };

    // Check if email is disposable
    const checkDisposableEmail = async (emailToCheck: string) => {
        setStateEmail({ isLoadingEmail: true, errorEmail: null, isDisposableEmail: null });
        setErrorEmailDisposable(null); // Clear main error while checking

        console.log("Sending email to check:", emailToCheck);

        try {
            const emailRes = await fetch("/api/validate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailToCheck }),
            });

            const emailData = await emailRes.json();

            if (!emailRes.ok) {
                setStateEmail({
                    isLoadingEmail: false,
                    errorEmail: emailData.error || "Failed to validate email",
                    isDisposableEmail: null,
                });
                return false;
            }

            setStateEmail({
                isLoadingEmail: false,
                errorEmail: null,
                isDisposableEmail: emailData.isDisposableEmail,
            });

            return emailData.isDisposableEmail;

        } catch {
            setStateEmail({
                isLoadingEmail: false,
                errorEmail: "Could not check email",
                isDisposableEmail: null,
            });
            return false;
        }
    }

    // Function to validate password against common passwords
    const validatePassword = async (password: string): Promise<string | null> => {
        try {
            const res = await fetch("/api/validate-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();
            return data.valid ? null : data.message || "Password validation failed";
        } catch {
            return "Could not validate password";
        }
    }

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
                            Register
                        </div>

                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>Register as a new user for full access to our app.</p>

                        {/* Username Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="register-username" className="sr-only">Username</label>
                            <input
                                id="register-username"
                                required
                                aria-required="true"
                                placeholder=""
                                type="text"
                                name="username"
                                value={registerFormData.username}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                                minLength={3}
                                maxLength={50}
                                pattern="^[a-zA-Z0-9_]{3,50}$"
                                title="Username can only contain letters, numbers, and underscores, 3 to 50 characters."
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
                            }} aria-hidden="true">Username</span>
                        </div>

                        {/* First Name Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="register-nameFirst" className="sr-only">Firstname</label>
                            <input
                                id="register-nameFirst"
                                required
                                aria-required="true"
                                placeholder=""
                                type="text"
                                name="nameFirst"
                                value={registerFormData.nameFirst}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                                minLength={1}
                                maxLength={100}
                                title="Firstname must only contain letters, spaces, hyphens, or apostrophes."
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
                            }} aria-hidden="true">Firstname</span>
                        </div>

                        {/* Last Name Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="register-nameLast" className="sr-only">Lastname</label>
                            <input
                                id="register-nameLast"
                                required
                                aria-required="true"
                                placeholder=""
                                type="text"
                                name="nameLast"
                                value={registerFormData.nameLast}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                                minLength={1}
                                maxLength={100}
                                title="Lastname must only contain letters, spaces, hyphens, or apostrophes."
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
                            }} aria-hidden="true">Lastname</span>
                        </div>

                        {/* Email Input */}
                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <label htmlFor="register-email" className="sr-only">Email</label>
                            <input
                                id="register-email"
                                name="email"
                                required
                                aria-required="true"
                                type="email"
                                value={registerFormData.email}
                                onChange={handleChange}
                                onBlur={() => {
                                    if (registerFormData.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
                                        checkDisposableEmail(registerFormData.email);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 20px 10px',
                                    outline: '0',
                                    border: '1px solid rgba(105, 105, 105, 0.397)',
                                    borderRadius: '10px',
                                    background: '#fff'
                                }}
                                pattern="^[^@\s]+@[^@\s]+\.[^@\s]+$"
                                title="Please enter a valid email address"
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
                            }} aria-hidden="true">Email</span>
                            {stateEmail.isLoadingEmail && (
                                <p style={{ color: '#488ccc', fontSize: '12px', marginTop: '5px' }}>Checking email...</p>
                            )}
                            {stateEmail.isDisposableEmail && (
                                <p role="alert" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>Disposable email not allowed</p>
                            )}
                            {stateEmail.errorEmail && (
                                <p role="alert" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{stateEmail.errorEmail}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <label htmlFor="register-password" className="sr-only">Password</label>
                            <input
                                id="register-password"
                                name="password"
                                required
                                aria-required="true"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$"
                                title="Password must be at least 8 characters, including uppercase, lowercase, number, and symbol."
                                value={registerFormData.password}
                                onChange={handleChange}
                                spellCheck="false"
                                autoCapitalize="none"
                                autoCorrect="off"
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
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <label htmlFor="register-confirmPassword" className="sr-only">Confirm Password</label>
                            <input
                                id="register-confirmPassword"
                                name="confirmPassword"
                                required
                                aria-required="true"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$"
                                title="Password must be at least 8 characters, including uppercase, lowercase, number, and symbol."
                                value={registerFormData.confirmPassword}
                                onChange={handleChange}
                                spellCheck="false"
                                autoCapitalize="none"
                                autoCorrect="off"
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
                            }} aria-hidden="true">Confirm Password</span>
                        </div>

                        {/* Agreement Checkboxes */}
                        <div className="flex flex-col gap-1 mb-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mr-2 accent-primary"
                                />
                                I agree to the <a href="/documentation/imprint" target="_blank" className="text-primary">Imprint</a> information.
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={agreedToPrivacy}
                                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                                    className="mr-2 accent-primary"
                                />
                                I agree to the <a href="/documentation/data-protection" target="_blank" className="text-primary">Data Protection</a> information.
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loadingSubmit || !agreedToTerms || !agreedToPrivacy}
                            style={{
                                border: 'none',
                                outline: 'none',
                                backgroundColor: (loadingSubmit || !agreedToTerms || !agreedToPrivacy) ? '#cccccc' : '#488ccc',
                                padding: '10px',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '16px',
                                transition: '0.3s ease',
                                cursor: (loadingSubmit || !agreedToTerms || !agreedToPrivacy) ? 'not-allowed' : 'pointer',
                                width: '100%',
                                marginTop: '10px',
                                marginBottom: '10px'
                            }}
                            onMouseOver={(e) => {
                                if (!loadingSubmit && agreedToTerms && agreedToPrivacy) {
                                    (e.target as HTMLElement).style.backgroundColor = '#367bb5';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!loadingSubmit && agreedToTerms && agreedToPrivacy) {
                                    (e.target as HTMLElement).style.backgroundColor = '#488ccc';
                                }
                            }}
                        >
                            {loadingSubmit ? "Submitting..." : "Register"}
                        </button>

                        {/* Error Display */}
                        {(errorSubmit || errorReservedWords || errorUsername || errorEmailValid || errorEmailDisposable || errorPassword || errorPasswordEqual || errorResponse) && (
                            <div role="alert" style={{
                                backgroundColor: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: '8px',
                                padding: '10px',
                                marginTop: '10px'
                            }}>
                                <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>Registration failed. Please fix the following:</p>
                                <ul style={{ color: 'red', fontSize: '12px', listStyleType: 'disc', paddingLeft: '20px', margin: '0' }}>
                                    {errorReservedWords && <li style={{ margin: '5px 0' }}>{errorReservedWords}</li>}
                                    {errorUsername && <li style={{ margin: '5px 0' }}>{errorUsername}</li>}
                                    {errorEmailValid && <li style={{ margin: '5px 0' }}>{errorEmailValid}</li>}
                                    {errorEmailDisposable && <li style={{ margin: '5px 0' }}>{errorEmailDisposable}</li>}
                                    {errorPassword && <li style={{ margin: '5px 0' }}>{errorPassword}</li>}
                                    {errorPasswordEqual && <li style={{ margin: '5px 0' }}>{errorPasswordEqual}</li>}
                                    {errorResponse && <li style={{ margin: '5px 0' }}>{errorResponse}</li>}
                                </ul>
                            </div>
                        )}

                        {/* Privacy Notice */}
                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '12px',
                            textAlign: 'center',
                            marginTop: '15px',
                            marginBottom: '10px'
                        }}>
                            Before you register as a new user, please read our <Link href="/documentation/imprint" style={{ color: '#488ccc', textDecoration: 'none' }}>Imprint</Link> and <Link href="/documentation/data-protection" style={{ color: '#488ccc', textDecoration: 'none' }}>Data Protection</Link> information.
                        </p>

                        {/* Login Link */}
                        <p style={{
                            color: 'rgba(88, 87, 87, 0.822)',
                            fontSize: '14px',
                            textAlign: 'center',
                            marginTop: '10px'
                        }}>
                            Already have an account? <Link href="/authentication/login" style={{ color: '#488ccc', textDecoration: 'none' }}>Login</Link>
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
