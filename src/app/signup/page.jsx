"use client";

import Link from "next/link"
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signupAction } from "../../lib/auth-actions";
import { useState, useEffect } from "react";
import { getEmailError } from "../../lib/validation";
import TextField from "../components/TextField";
import PasswordChecklist from "../components/PasswordChecklist";

export default function Signup(){
    const router = useRouter();
    const { status } = useSession();
    const [error, setError] = useState("");
    const [isPending, setIsPending] = useState(false);

    // already signed in (via bookmark or back button) same as /login
    useEffect(() => {
        if (status === "authenticated" && !isPending) {
            router.push("/");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, router]);
    const [emailError, setEmailError] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [pwValue, setPwValue] = useState("");
    const [pwTouched, setPwTouched] = useState(false);
    const [confirmValue, setConfirmValue] = useState("");
    const [confirmTouched, setConfirmTouched] = useState(false);

    function handleEmailChange(e) {
        if (emailTouched) setEmailError(getEmailError(e.target.value) || "");
    }
    function handleEmailBlur(e) {
        setEmailTouched(true);
        setEmailError(getEmailError(e.target.value) || "");
    }

    function handlePasswordChange(e) {
        setPwValue(e.target.value);
    }
    function handlePasswordBlur() {
        setPwTouched(true);
    }

    function handleConfirmChange(e) {
        setConfirmValue(e.target.value);
    }
    function handleConfirmBlur() {
        setConfirmTouched(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError("");
        setIsPending(true); // Start loading
        try {
            const signupResult = await signupAction(formData);
            if (!signupResult?.success) {
                setError(signupResult?.error || "Something went wrong during signup");
                setIsPending(false);
                return;
            }

            const result = await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirect: false,
            });

            if (result?.error) {
                // Account exists but auto-login failed -> fall back to manual login
                router.push("/login");
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError(err.message);
            setIsPending(false); // Stop loading on error
        }
    }

    return(
        <main className='auth'>
            <section className='auth__section'>
                <div className='auth__inner container'>
                    <header className='auth__header'>
                        <svg className='auth__icon' xmlns="http://www.w3.org/2000/svg" height="55px" viewBox="0 -960 960 960" width="55px" fill="currentColor">
                            <path d="M180-217q60-56 136-90.5T480-342q88 0 164 34.5T780-217v-563H180v563Zm400-244q40-40 40-98t-40-98q-40-40-98-40t-98 40q-40 40-40 98t40 98q40 40 98 40t98-40ZM180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm43-60h513q-62-53-125.5-77.5T480-282q-67 0-130.5 24.5T223-180Zm204-324q-23-23-23-55t23-55q23-23 55-23t55 23q23 23 23 55t-23 55q-23 23-55 23t-55-23Zm53 5Z"/>
                        </svg>
                        <h1 className='auth__title'>Sign up</h1>
                    </header>
                    <div className='auth__card'>

                        <form className='form form--auth' onSubmit={handleSubmit}>
                            <div className='form--auth__inner form__inner'>
                                <TextField
                                    id="userName"
                                    name="userName"
                                    type="text"
                                    label="User name"
                                    autoComplete="name"
                                    required
                                />

                                <TextField
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email"
                                    autoComplete="email"
                                    required
                                    onChange={handleEmailChange}
                                    onBlur={handleEmailBlur}
                                    error={emailError}
                                />

                                <div className='form__field-group'>
                                    <TextField
                                        id="password"
                                        name="password"
                                        type="password"
                                        label="Password"
                                        autoComplete="new-password"
                                        required
                                        onChange={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                    />
                                    <PasswordChecklist password={pwValue} touched={pwTouched} />
                                </div>

                                <div className='form__field-group'>
                                    <TextField
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        label="Confirm password"
                                        autoComplete="new-password"
                                        required
                                        onChange={handleConfirmChange}
                                        onBlur={handleConfirmBlur}
                                    />
                                    {confirmTouched && confirmValue !== "" && (
                                        <p className={`pw-match${confirmValue === pwValue ? " is-ok" : " is-fail"}`} role="status">
                                            {confirmValue === pwValue ? "✓ Passwords match" : "✗ Passwords do not match"}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {error && <p className="error-text" role="alert">{error}</p>}

                            <button 
                                className="btn btn--primary form__submit" 
                                type="submit"
                                disabled={isPending}
                            >
                                {isPending ? "Creating account..." : "Create account"}
                            </button>           
                        </form>
                    </div>
                    <div className='auth__alt'>
                        <p>Already have an account? <Link href="/login">Log in</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
}