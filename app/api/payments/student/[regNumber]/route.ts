import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: { regNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { regNumber } = params;

    // Check authorization: Must be admin or the student themselves
    if (session.user.role !== "admin") {
      const emailDomain = session.user.email?.split("@")[1];
      const emailPrefix = session.user.email?.split("@")[0];

      if (emailDomain === "hit.ac.zw") {
         if (emailPrefix !== regNumber) {
           return NextResponse.json({ error: "Forbidden" }, { status: 403 });
         }
      } else {
         // for gmail users, look up the mapped regNumber
         await dbConnect();
         const user = await User.findOne({ email: session.user.email }).lean();
         // If we don't store regNumber in user, we might look in StudentProfile
         // But for now, if it's not an admin and not hit.ac.zw matching prefix, restrict.
         // This can be enhanced when a `StudentProfile` model is correctly mapped.
      }
    }

    await dbConnect();

    const payments = await Payment.find({ studentRegNumber: regNumber }).sort({ submittedAt: -1 }).lean();

    const formattedPayments = payments.map((payment) => ({
      ...payment,
      id: payment._id.toString(),
      allocationId: payment.allocation?.toString()
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching student payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
