import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      return NextResponse.json(
        { error: "ADMIN_EMAIL environment variable is not configured on the server." },
        { status: 500 }
      );
    }

    await dbConnect();

    // Find the user by the specified admin email
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${adminEmail} not found. Please log in first so the account is created.` },
        { status: 404 }
      );
    }

    if (user.role === 'admin') {
      return NextResponse.json(
        { message: `User ${adminEmail} is already an admin.` },
        { status: 200 }
      );
    }

    // Update the role to admin
    user.role = 'admin';
    await user.save();

    return NextResponse.json(
      { message: `Successfully updated ${adminEmail} to admin role. Please log out and log back in to see changes.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";