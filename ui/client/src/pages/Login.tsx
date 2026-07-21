import { Button } from "@/components/ui/button";

export default function Login() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="border-2 border-foreground p-8 w-full max-w-sm text-center space-y-4">
        <h1 className="text-xl font-bold uppercase tracking-widest">Coach Phelps</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with GitHub to see your dashboard.
        </p>
        <Button asChild className="w-full">
          <a href="/api/auth-login">Sign in with GitHub</a>
        </Button>
      </div>
    </div>
  );
}
