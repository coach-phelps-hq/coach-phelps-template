import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="border-2 border-foreground p-8 w-full max-w-lg text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-primary" />

        <h1 className="text-4xl font-bold">404</h1>

        <h2 className="text-xl font-bold uppercase tracking-widest">Page Not Found</h2>

        <p className="text-sm text-muted-foreground">
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>

        <Button onClick={handleGoHome} className="w-full">
          <Home className="w-4 h-4" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
