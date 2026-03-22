import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Session } from "@/models/Session";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Students only get the active session
    if (session.user.role !== "admin") {
      const activeSession = await Session.findOne({ isActive: true }).lean();
      if (!activeSession) {
        return NextResponse.json({ error: "No active session found" }, { status: 404 });
      }
      return NextResponse.json([activeSession]);
    }

    // Admins get all sessions
    const sessions = await Session.find({}).sort({ startDate: -1 }).lean();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, code, startDate, endDate, isActive, isOpenForApplications } =
      await req.json();

    if (!name || !code || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // If this new session is active, deactivate all others
    if (isActive) {
      await Session.updateMany({}, { isActive: false });
    }

    const newSession = await Session.create({
      name,
      code,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive || false,
      isOpenForApplications: isOpenForApplications || false,
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error: any) {
    console.error("Error creating session:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Session name or code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
