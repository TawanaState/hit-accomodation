import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { StudentProfile } from "@/models/StudentProfile";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
       return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    await dbConnect();

    // Check personal email, user reference, or university email in Student Profile
    const profile = await StudentProfile.findOne({
      $or: [
        { "contactInfo.email": email },
        { user: session.user.id }
      ]
    }).lean();

    if (!profile) {
       return NextResponse.json({ regNumber: "" });
    }

    return NextResponse.json({ regNumber: profile.regNumber });

  } catch (error) {
    console.error("Error fetching student by email:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
