import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type UserRole = "user" | "admin" | null;

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user ? {
    uid: session.user.id || "",
    email: session.user.email || "",
    displayName: session.user.name || "",
    // Include the role directly in the user object to help existing code
    role: session.user.role as UserRole,
  } : null;

  const loading = status === "loading";
  const role = (session?.user?.role as UserRole) || null;

  const signIn = async () => {
    try {
      await nextAuthSignIn("google", { callbackUrl: "/" }); // the callback URL logic will handle redirect based on role
    } catch (error) {
      console.error("Error signing in with Google", error);
      toast.error("Failed to sign in with Google");
    }
  };

  const signOutUser = async () => {
    try {
      await nextAuthSignOut({ callbackUrl: "/" });
      toast.success("Successfully signed out");
    } catch (error) {
      console.error("Error signing out", error);
      toast.error("Failed to sign out");
    }
  };

  return { user, loading, role, signIn, signOut: signOutUser };
}
