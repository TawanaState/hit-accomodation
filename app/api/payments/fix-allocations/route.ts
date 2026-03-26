import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Allocation } from "@/models/Allocation";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const allPayments = await Payment.find().lean();
    // Do not populate to avoid CastErrors when re-using IDs
    const allAllocations = await Allocation.find().lean();

    const studentMap = new Map();

    allPayments.forEach(payment => {
      const student = payment.studentRegNumber;
      if (!studentMap.has(student)) {
        studentMap.set(student, { payments: [], allocations: [] });
      }
      studentMap.get(student).payments.push(payment);
    });

    allAllocations.forEach(allocation => {
      const student = allocation.studentRegNumber;
      if (!studentMap.has(student)) {
        studentMap.set(student, { payments: [], allocations: [] });
      }
      studentMap.get(student).allocations.push(allocation);
    });

    const affectedStudents: string[] = [];

    studentMap.forEach((data, studentRegNumber) => {
      const hasApprovedPayments = data.payments.some((p: any) => p.status === 'Approved');
      const hasUnpaidAllocations = data.allocations.some((a: any) => a.paymentStatus !== 'Paid');

      if (hasApprovedPayments && hasUnpaidAllocations) {
        affectedStudents.push(studentRegNumber);
      }
    });

    const results = [];
    let totalFixed = 0;

    for (const studentRegNumber of affectedStudents) {
      try {
        const studentData = studentMap.get(studentRegNumber);
        const payments = studentData.payments;
        const allocations = studentData.allocations;

        const unpaidAllocations = allocations.filter((a: any) => a.paymentStatus !== 'Paid');
        const approvedPayments = payments.filter((p: any) => p.status === 'Approved');

        let fixedCount = 0;

        for (const allocation of unpaidAllocations) {
          const hostel = await Hostel.findById(allocation.hostel).lean();
          if (!hostel) continue;

          const roomDetails = { price: hostel.pricePerSemester };

          const matchingPayment = approvedPayments.find((payment: any) =>
            payment.amount === roomDetails.price &&
            payment.allocation.toString() !== allocation._id.toString()
          );

          if (matchingPayment) {
            await Payment.findByIdAndUpdate(matchingPayment._id, { allocation: allocation._id });
            await Allocation.findByIdAndUpdate(allocation._id, { paymentStatus: 'Paid', paymentId: matchingPayment._id });
            fixedCount++;
          }
        }

        results.push({
          studentRegNumber,
          fixed: fixedCount,
          message: fixedCount > 0 ? `Successfully fixed ${fixedCount} allocation payment(s) for student ${studentRegNumber}` : `No matching payments found to fix for student ${studentRegNumber}`
        });
        totalFixed += fixedCount;
      } catch (error) {
        console.error(`Failed to fix payments for student ${studentRegNumber}:`, error);
        results.push({
          studentRegNumber,
          fixed: 0,
          message: `Error: Failed to fix payments for student ${studentRegNumber}`
        });
      }
    }

    return NextResponse.json({
      studentsProcessed: affectedStudents.length,
      totalFixed,
      details: results
    });
  } catch (error) {
    console.error("Error in bulk fix operation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
