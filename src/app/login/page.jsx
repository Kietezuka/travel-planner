"use client";

import Link from "next/link"
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TextField from "../components/TextField";

export default function LoginPage(){
    const { data: session, status } = useSession();
    const [error, setError] = useState("");
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Once authenticated, send them to the home page
        if (status === "authenticated" && session?.user?.id) {
            router.push(`/`);
        }
    }, [status, session, router]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setIsPending(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email");
        const password = formData.get("password");

        // Use NextAuth's signIn function
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false, // Prevents automatic redirect so we can handle errors
        });

        if (result?.error) {
            setError("Invalid email or password");
            setIsPending(false);
        } else {
            router.refresh();
        }
    }

    return(
        <main className='auth'>
            <section className='auth__section'>
                <div className='auth__inner container '>
                    <header className='auth__header'>
                        <svg className='auth__icon' xmlns="http://www.w3.org/2000/svg" height="55px" viewBox="0 -960 960 960" width="55px" fill="#666666">
                            <path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z"/>
                        </svg>
                        <h1 className='auth__title'>Log In</h1>

                    </header>
                    <div className='auth__card'>
                        <form className='form form--auth' onSubmit={handleSubmit}>
                            <div className='form--auth__inner form__inner'>
                                <TextField
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email"
                                    autoComplete="email"
                                    required
                                />
                                <TextField
                                    id="password"
                                    name="password"
                                    type="password"
                                    label="Password"
                                    autoComplete="current-password"
                                    required
                                />
                                {error && <p className="error-text" role="alert">{error}</p>}
                                <button
                                    className="btn btn--primary form__submit"
                                    type="submit"
                                    disabled={isPending}
                                >
                                    {isPending ? "Logging in..." : "Log in"}
                                </button>
                            </div>
                        </form>
                    </div>
                     <div className='auth__alt'>
                        <p>Don’t have an account?  <Link href="/signup">Sign up</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
}