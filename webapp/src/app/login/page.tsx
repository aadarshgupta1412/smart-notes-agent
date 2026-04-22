"use client";

import { createClient } from "@/lib/supabase/client";
import { BookOpen, Chrome, Sparkles, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-surface" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse-subtle" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div className="w-full max-w-md">
          {/* Logo and branding */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center size-20 rounded-2xl gradient-primary shadow-lg glow-primary mb-6">
              <BookOpen className="size-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
              Knowledge Hub
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI-powered second brain
            </p>
          </div>

          {/* Login card */}
          <div 
            className="bg-card/80 dark:bg-card/60 backdrop-blur-glass rounded-2xl border border-border/50 shadow-xl overflow-hidden animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {/* Card content */}
            <div className="p-8">
              <Button
                variant="outline"
                className="w-full h-14 text-base font-medium bg-white dark:bg-surface-2 hover:bg-surface-1 dark:hover:bg-surface-3 border-border/80 hover:border-border shadow-sm hover:shadow-md transition-all duration-200"
                onClick={handleGoogleLogin}
              >
                <svg className="size-5 mr-3" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Feature highlights */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Brain className="size-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">Smart Capture</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 mb-2">
                    <Sparkles className="size-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">AI Chat</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 mb-2">
                    <Zap className="size-5" />
                  </div>
                  <p className="text-xs text-muted-foreground">Instant Search</p>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="px-8 py-4 bg-muted/50 dark:bg-surface-2/50 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Chrome className="size-4" />
                <span>
                  Also available as a{" "}
                  <span className="text-primary font-medium hover:underline cursor-pointer">
                    Chrome Extension
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <p 
            className="mt-8 text-center text-sm text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Capture, organize, and chat with your web knowledge
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
