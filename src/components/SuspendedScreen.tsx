import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldOff } from "lucide-react";

const SuspendedScreen = () => {
  const { signOut, suspendReason } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Account Suspended</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account has been suspended by an administrator.
            </p>
          </div>
          {suspendReason && (
            <div className="bg-muted rounded-lg p-3 text-sm text-left">
              <p className="font-medium text-xs text-muted-foreground mb-1">Reason:</p>
              <p>{suspendReason}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            If you believe this is a mistake, please contact support.
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspendedScreen;
