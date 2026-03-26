import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const page = async () => {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "admin") {
    redirect("/admin");
  } else if (session?.user?.role === "user") {
    redirect("/student/profile");
  } else {
    redirect("/login");
  }
};

export default page;
