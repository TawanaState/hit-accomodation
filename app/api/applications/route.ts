import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Application } from "@/models/Application";
import { fetchAllStudentsFromFirebase } from "@/data/firebase-student-data";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Add admin check, same as Firebase rules
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch all applications from MongoDB
    const applications = await Application.find()
      .populate("session")
      .sort({ submittedAt: -1 })
      .lean();

    // Removing Firebase to pass build. We will depend on the existing applications' student details
    // or look them up from Mongo `StudentProfile`. Wait, let's use StudentProfile model from Mongo.
    let studentsMap = new Map<string, any>();
    try {
       const { StudentProfile } = await import("@/models/StudentProfile");
       const students = await StudentProfile.find().lean();
       students.forEach(s => {
         studentsMap.set(s.regNumber, s);
       });
    } catch (err) {
       console.error("Warning: Could not fetch students from Mongo", err);
    }

    // For the UI, map Mongoose documents to the expected shape.
    const formattedApplications = applications.map((app: any) => {
      const dateObj = app.submittedAt ? new Date(app.submittedAt) : new Date();
      const date = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const time = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const studentData = studentsMap.get(app.regNumber);

      return {
        _id: app._id.toString(),
        regNumber: app.regNumber,
        status: app.status,
        paymentStatus: app.paymentStatus,
        reference: app.reference,
        submittedAt: app.submittedAt,
        date,
        time,
        // The firebase-data.ts expected name, gender, programme, etc.
        name: studentData ? `${studentData.name} ${studentData.surname}` : `Student ${app.regNumber}`,
        gender: studentData?.gender || "Unknown",
        programme: studentData?.programme || "N/A",
        part: studentData?.part || 1,
        email: studentData?.email || `${app.regNumber}@hit.ac.zw`,
        phone: studentData?.phone || "",
      };
    });

    return NextResponse.json(formattedApplications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
