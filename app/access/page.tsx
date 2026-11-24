"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { setAccessToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const apiBaseUrl = new URL(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    );

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (isRegistering) {
        const response = await fetch(new URL("/register", apiBaseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });

        const result: { message?: string } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to create your account. Please try again.",
          );
        }

        form.reset();
        setFormSuccess(result.message || "Account created successfully.");
        setIsRegistering(false);
      } else {
        const response = await fetch(new URL("/login", apiBaseUrl), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });
        const result: { message?: string; accessToken?: string } =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to sign in. Please try again.",
          );
          setError("Unable to sign in. Please try again")
        }
        if (!result.accessToken) {
          throw new Error("The login service did not return an access token.");
        }

        setAccessToken(result.accessToken);
        router.replace("/");
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not connect to the account service. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#171914] px-4 py-4 text-[#20231d] sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1240px] overflow-hidden rounded-[6px] bg-[#f7f7f2] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section
          aria-label="Welcome to AL"
          className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-cover bg-center px-6 py-6 text-white sm:min-h-[310px] sm:px-10 sm:py-9 lg:min-h-0 lg:px-12 lg:py-11"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(13, 16, 13, 0.35) 0%, rgba(13, 16, 13, 0.2) 32%, rgba(13, 16, 13, 0.88) 100%), url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1500&q=85")',
          }}
        >
          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-2.5 text-sm font-semibold tracking-[0.12em]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6fa56] text-xs font-black text-[#20231d]">
              F
            </span>
            AL
          </Link>

          <div className="relative z-10 max-w-md pb-1">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d6fa56]">
              A better kind of movie night
            </p>
            <h1 className="max-w-sm text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl lg:text-[52px]">
              Stories worth staying in for.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/75 sm:text-base">
              Find your next favorite, keep your watchlist close, and make every
              evening a premiere.
            </p>
          </div>
          <p className="absolute bottom-5 right-6 hidden text-[10px] uppercase tracking-[0.16em] text-white/55 sm:block lg:bottom-8 lg:right-10">
            Your next scene starts here
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-9 sm:px-12 sm:py-12 lg:px-14">
          <div className="w-full max-w-[390px]">
            <div className="mb-9 lg:mb-12">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#75786f]">
                Welcome to AL
              </p>
              <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-[#20231d]">
                {isRegistering ? "Make it yours." : "Good to see you."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#74776d]">
                {isRegistering
                  ? "Create an account and start your watchlist."
                  : "Sign in to pick up where your next movie night begins."}
              </p>
            </div>

            <div
              className="mb-7 grid grid-cols-2 border-b border-[#dedfd7]"
              role="tablist"
              aria-label="Account access"
            >
              
              {error ? error : ""}
              <button
                type="button"
                role="tab"
                aria-selected={!isRegistering}
                onClick={() => {
                  setIsRegistering(false);
                  setFormError("");
                  setFormSuccess("");
                }}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                  !isRegistering
                    ? "border-[#73951e] text-[#20231d]"
                    : "border-transparent text-[#898b83] hover:text-[#45483f]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRegistering}
                onClick={() => {
                  setIsRegistering(true);
                  setFormError("");
                  setFormSuccess("");
                }}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                  isRegistering
                    ? "border-[#73951e] text-[#20231d]"
                    : "border-transparent text-[#898b83] hover:text-[#45483f]"
                }`}
              >
                Create account
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegistering && (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-xs font-semibold text-[#41443b]"
                  >
                    Your name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    required
                    className="h-12 w-full rounded-[4px] border border-[#d9dbd2] bg-white px-3.5 text-sm text-[#20231d] outline-none transition focus:border-[#839d3f] focus:ring-2 focus:ring-[#d6fa56]/45"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-[#41443b]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="h-12 w-full rounded-[4px] border border-[#d9dbd2] bg-white px-3.5 text-sm text-[#20231d] outline-none transition focus:border-[#839d3f] focus:ring-2 focus:ring-[#d6fa56]/45"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-[#41443b]"
                  >
                    Password
                  </label>
                  {!isRegistering && (
                    <a
                      href="#forgot-password"
                      className="text-xs font-medium text-[#627d20] hover:text-[#3e5112]"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    isRegistering ? "new-password" : "current-password"
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  className="h-12 w-full rounded-[4px] border border-[#d9dbd2] bg-white px-3.5 text-sm text-[#20231d] outline-none transition focus:border-[#839d3f] focus:ring-2 focus:ring-[#d6fa56]/45"
                />
              </div>

              {isRegistering && (
                <label className="flex items-start gap-2.5 pt-1 text-xs leading-5 text-[#74776d]">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 h-4 w-4 accent-[#73951e]"
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href="#terms"
                      className="font-medium text-[#627d20] underline underline-offset-2"
                    >
                      Terms
                    </a>{" "}
                    and{" "}
                    <a
                      href="#privacy"
                      className="font-medium text-[#627d20] underline underline-offset-2"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              )}

              {formError && (
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p role="status" className="text-sm text-green-800">
                  {formSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#20231d] px-4 text-sm font-semibold text-white transition hover:bg-[#363a30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#73951e]"
              >
                {isSubmitting
                  ? isRegistering
                    ? "Creating account..."
                    : "Signing in..."
                  : isRegistering
                    ? "Create your account"
                    : "Sign in"}
                <span aria-hidden="true">&rarr;</span>
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-[#85877f]">
              By continuing, you agree to AL&apos;s{" "}
              <a
                href="#terms"
                className="text-[#55584f] underline underline-offset-2"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#privacy"
                className="text-[#55584f] underline underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
