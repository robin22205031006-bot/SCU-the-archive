import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  showPassword?: boolean | undefined;
  onShowPasswordChange?: ((show: boolean) => void) | undefined;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showPassword: controlledShow, onShowPasswordChange, ...props }, ref) => {
    const [uncontrolledShow, setUncontrolledShow] = React.useState(false);
    const isControlled = controlledShow !== undefined;
    const isVisible = isControlled ? controlledShow : uncontrolledShow;

    const toggle = () => {
      const next = !isVisible;
      if (!isControlled) setUncontrolledShow(next);
      onShowPasswordChange?.(next);
    };

    return (
      <div className="relative flex w-full items-center">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-20", className)}
          {...props}
        />
        <button
          type="button"
          onClick={toggle}
          aria-pressed={isVisible}
          aria-label={isVisible ? "Turn show password mode off" : "Turn show password mode on"}
          data-testid="password-visibility-toggle"
          className="absolute right-1.5 inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/85 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span>{isVisible ? "On" : "Off"}</span>
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
