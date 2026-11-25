import { NewPasswordForm } from "@/components/PasswordForms";
// Signed-in only (the proxy sends everyone else to log in), including after a reset link.
export default function Page() { return <NewPasswordForm />; }
