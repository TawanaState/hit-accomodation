import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";

export async function GET(req: NextRequest, { params }: { params: { regNumber: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { regNumber } = params;

    if (!regNumber) {
      return NextResponse.json(
        { error: "regNumber is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const { StudentProfile } = await import("@/models/StudentProfile");
    const student = await StudentProfile.findOne({ regNumber }).lean();

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error fetching student by regNumber:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
