"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
} from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = "", disabled, ...props }, ref) {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          className={`pr-11 ${className}`.trim()}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          disabled={disabled}
          className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gp-evergreen/60 transition-colors duration-150 hover:text-gp-evergreen focus-visible:ring-2 focus-visible:ring-gp-gold/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-gp-evergreen/35"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 transition-transform duration-150" />
          ) : (
            <Eye className="h-5 w-5 transition-transform duration-150" />
          )}
        </button>
      </div>
    );
  },
);
