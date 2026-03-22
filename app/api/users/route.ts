import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // Last seen ID for pagination
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";

    await dbConnect();

    const query: any = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const users = await User.find(query)
      .sort({ _id: -1 })
      .limit(limitParam)
      .lean();

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      displayName: user.displayName || "",
      email: user.email,
      role: user.role,
      createdAt: user.createdAt?.toISOString() || "",
    }));

    const nextCursor =
      formattedUsers.length === limitParam
        ? formattedUsers[formattedUsers.length - 1].id
        : null;

    return NextResponse.json({
      data: formattedUsers,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
