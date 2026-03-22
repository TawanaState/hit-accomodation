import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { ActivityLog } from "@/models/ActivityLog";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // Last seen ID
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    await dbConnect();

    const query: any = {};
    if (search) {
      query.$or = [
        { adminEmail: { $regex: search, $options: "i" } },
        { activity: { $regex: search, $options: "i" } },
        { regNumber: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (cursor) {
      // Use _id for cursor-based pagination
      query._id = { $lt: cursor };
    }

    const logs = await ActivityLog.find(query)
      .sort({ _id: -1 }) // Sort by newest
      .limit(limitParam)
      .lean();

    const formattedLogs = logs.map((log) => ({
      id: log._id.toString(),
      adminEmail: log.adminEmail,
      activity: log.activity,
      regNumber: log.regNumber,
      oldStatus: log.oldStatus,
      newStatus: log.newStatus,
      timestamp: log.timestamp.toISOString(),
    }));

    const nextCursor =
      formattedLogs.length === limitParam
        ? formattedLogs[formattedLogs.length - 1].id
        : null;

    return NextResponse.json({
      data: formattedLogs,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Both users and admins may trigger activities depending on the feature,
    // but typically activity logs are for admin actions.
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    await dbConnect();
    const newLog = await ActivityLog.create({
      ...data,
      adminEmail: session.user.email,
      timestamp: new Date(),
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
