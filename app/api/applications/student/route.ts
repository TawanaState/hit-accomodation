import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Application } from "@/models/Application";
import { StudentProfile } from "@/models/StudentProfile";
import { Session } from "@/models/Session";
import { Settings } from "@/models/Settings";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // The student's application is tied to their profile
    const profile = await StudentProfile.findOne({ email: session.user.email }).lean();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get active session
    const activeSession = await Session.findOne({ isActive: true }).lean();
    if (!activeSession) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    // Find student application for active session
    const application = await Application.findOne({
      regNumber: profile.regNumber,
      session: activeSession._id
    }).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Check profile
    const profile = await StudentProfile.findOne({ email: authSession.user.email }).lean();
    if (!profile) {
      return NextResponse.json({ error: "Profile missing" }, { status: 400 });
    }

    // Check active session
    const activeSession = await Session.findOne({ isActive: true }).lean();
    if (!activeSession) {
      return NextResponse.json({ error: "No active session" }, { status: 400 });
    }

    // Check if application already exists
    const existing = await Application.findOne({
      regNumber: profile.regNumber,
      session: activeSession._id
    });

    if (existing) {
      return NextResponse.json({ error: "Application already exists" }, { status: 400 });
    }

    // Determine status (auto-accept logic)
    const settings = await Settings.findOne() || {
      autoAcceptBoysLimit: 0,
      autoAcceptGirlsLimit: 0,
    };

    const acceptedCount = await Application.aggregate([
      { $match: { session: activeSession._id, status: "Accepted" } },
      {
        $lookup: {
          from: "studentprofiles",
          localField: "regNumber",
          foreignField: "regNumber",
          as: "profile"
        }
      },
      { $unwind: "$profile" },
      { $match: { "profile.gender": profile.gender } },
      { $count: "count" }
    ]);

    const count = acceptedCount.length > 0 ? acceptedCount[0].count : 0;

    let status = "Pending";
    if (
      (profile.gender === "Male" && count < (settings.autoAcceptBoysLimit || 0)) ||
      (profile.gender === "Female" && count < (settings.autoAcceptGirlsLimit || 0))
    ) {
      status = "Accepted";
    }

    const application = new Application({
      regNumber: profile.regNumber,
      session: activeSession._id,
      status,
      reference: `APP-${Date.now()}-${profile.regNumber}`,
    });

    await application.save();

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const profile = await StudentProfile.findOne({ email: session.user.email }).lean();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const activeSession = await Session.findOne({ isActive: true }).lean();
    if (!activeSession) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    await Application.findOneAndDelete({
      regNumber: profile.regNumber,
      session: activeSession._id
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
