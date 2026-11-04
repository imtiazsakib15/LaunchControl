"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Flag,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  token: z
    .string()
    .min(1, "Admin token is required.")
    .max(4096, "Token is too long.")
    .refine((value) => value.trim().length > 0, {
      message: "Admin token is required.",
    }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  message?: string;
}

function getResponseMessage(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return null;
}

export default function LoginForm() {
  const router = useRouter();

  const [showToken, setShowToken] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      token: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token: values.token,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          getResponseMessage(payload) ?? "Unable to sign in. Please try again.";

        if (response.status === 400) {
          setError("token", {
            type: "server",
            message,
          });
          return;
        }

        setServerError(message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setServerError(
        "Unable to connect to the authentication service. Please try again.",
      );
    }
  };

  const tokenField = register("token");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 size-96 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/5 lg:grid-cols-2">
        {/* Brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-neutral-950 p-10 text-white lg:flex xl:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-indigo-500/20 blur-3xl"
          />

          <div className="relative flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Flag className="size-5 text-indigo-300" />
            </div>

            <span className="text-lg font-semibold tracking-tight">
              LaunchControl
            </span>
          </div>

          <div className="relative my-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Feature management platform
            </div>

            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Control your
              <span className="block text-indigo-300">
                releases with confidence.
              </span>
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-7 text-neutral-400">
              Manage feature flags, control rollouts, and understand evaluation
              decisions from one place.
            </p>
          </div>

          <div className="relative flex items-center gap-3 border-t border-white/10 pt-6 text-xs text-neutral-500">
            <ShieldCheck className="size-4 text-indigo-300" />
            Secure administrative access
          </div>
        </section>

        {/* Login panel */}
        <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Flag className="size-5 text-primary" />
              </div>

              <span className="text-lg font-semibold tracking-tight">
                LaunchControl
              </span>
            </div>

            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="gap-3 px-0">
                <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <LockKeyhole className="size-6 text-primary" />
                </div>

                <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Welcome back
                </CardTitle>

                <CardDescription className="text-sm leading-6">
                  Enter your administrator token to access your LaunchControl
                  dashboard.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0">
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-6"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="admin-token">Admin token</Label>

                    <div className="relative">
                      <Input
                        {...tokenField}
                        id="admin-token"
                        type={showToken ? "text" : "password"}
                        placeholder="Enter your admin token"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(errors.token)}
                        aria-describedby={
                          errors.token ? "token-error" : undefined
                        }
                        className="h-11 pr-12 font-mono text-sm"
                        onChange={(event) => {
                          void tokenField.onChange(event);
                          setServerError(null);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setShowToken((current) => !current)}
                        disabled={isSubmitting}
                        aria-label={
                          showToken ? "Hide admin token" : "Show admin token"
                        }
                        aria-pressed={showToken}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        {showToken ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>

                    {errors.token && (
                      <p
                        id="token-error"
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {errors.token.message}
                      </p>
                    )}
                  </div>

                  {serverError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                    >
                      {serverError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to dashboard
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <p className="text-xs leading-5 text-muted-foreground">
                    Your admin token is transmitted securely to the
                    authentication endpoint and stored in an encrypted,
                    HTTP-only session cookie.
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              LaunchControl · Administrative access only
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
