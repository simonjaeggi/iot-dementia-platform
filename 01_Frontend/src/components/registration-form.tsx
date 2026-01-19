import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/auth/auth-context";

export function RegistrationForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("RegistrationForm must be used within AuthProvider");
  const { register } = ctx;
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const accessCode = String(formData.get("accessCode") ?? "");
    const fullname = String(formData.get("fullname") ?? "");

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    
    await register(email, password, accessCode, fullname);
    navigate(from, { replace: true });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Register a new account</CardTitle>
          <CardDescription>
            Enter your one-time access code, name, email and password below to
            register a new account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="text">Access Code</FieldLabel>
                <Input id="accessCode" name="accessCode" type="text" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="text">Full Name</FieldLabel>
                <Input id="fullname" name="fullname" type="text" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">Register</Button>

                <FieldDescription className="text-center">
                  Already have login credentials?{" "}
                  <Link to="/login" className="underline">
                    Login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
