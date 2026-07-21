import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Coach Phelps</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with GitHub to see your dashboard.
          </p>
          <Button asChild className="w-full">
            <a href="/api/auth-login">Sign in with GitHub</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
