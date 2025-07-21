import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp
} from "firebase/firestore";
import { Payment, RoomAllocation } from "@/types/hostel";
import { updatePaymentStatus, fetchStudentAllocations, getRoomDetailsFromAllocation } from "./hostel-data";

/**
 * Submit a new payment by student
 */
export const submitPayment = async (payment: Omit<Payment, 'id' | 'submittedAt' | 'status'>): Promise<string> => {
  try {
    const paymentData = {
      ...payment,
      submittedAt: new Date().toISOString(),
      status: 'Pending' as const
    };

    const paymentsCollection = collection(db, "payments");
    const docRef = await addDoc(paymentsCollection, paymentData);
    
    return docRef.id;
  } catch (error) {
    console.error("Error submitting payment:", error);
    throw error;
  }
};

/**
 * Update payment by student (for editing receipt number or details)
 */
export const updateStudentPayment = async (
  paymentId: string, 
  updates: Partial<Pick<Payment, 'receiptNumber' | 'paymentMethod' | 'notes' | 'attachments'>>
): Promise<void> => {
  try {
    const paymentDoc = doc(db, "payments", paymentId);
    await updateDoc(paymentDoc, updates);
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

/**
 * Fetch payments for a specific student
 */
export const fetchStudentPayments = async (studentRegNumber: string): Promise<Payment[]> => {  try {
    const paymentsCollection = collection(db, "payments");
    const q = query(
      paymentsCollection, 
      where("studentRegNumber", "==", studentRegNumber)
    );
    const paymentsSnap = await getDocs(q);
    
    // Sort manually in JavaScript to avoid composite index requirement
    const payments = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];
    
    return payments.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching student payments:", error);
    return [];
  }
};

/**
 * Fetch all payments (admin function)
 */
export const fetchAllPayments = async (): Promise<Payment[]> => {
  try {
    const paymentsCollection = collection(db, "payments");
    const q = query(paymentsCollection, orderBy("submittedAt", "desc"));
    const paymentsSnap = await getDocs(q);
    
    return paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];
  } catch (error) {
    console.error("Error fetching all payments:", error);
    return [];
  }
};

/**
 * Fetch pending payments (admin function)
 */
export const fetchPendingPayments = async (): Promise<Payment[]> => {
  try {
    const paymentsCollection = collection(db, "payments");
    const q = query(
      paymentsCollection, 
      where("status", "==", "Pending")
    );
    const paymentsSnap = await getDocs(q);
    
    // Sort manually in JavaScript to avoid composite index requirement
    const payments = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];
    
    return payments.sort((a, b) => 
      new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return [];
  }
};

/**
 * Approve payment (admin function)
 */
export const approvePayment = async (
  paymentId: string, 
  adminEmail: string
): Promise<void> => {
  try {
    const paymentDoc = doc(db, "payments", paymentId);
    const paymentSnap = await getDoc(paymentDoc);
    
    if (!paymentSnap.exists()) {
      throw new Error("Payment not found");
    }
    
    const payment = paymentSnap.data() as Payment;
    
    // Update payment status
    await updateDoc(paymentDoc, {
      status: 'Approved',
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString()
    });
    
    // Update room allocation payment status
    await updatePaymentStatus(payment.allocationId, 'Paid');
    
    // Update allocation with payment reference
    const allocationDoc = doc(db, "roomAllocations", payment.allocationId);
    await updateDoc(allocationDoc, {
      paymentId: paymentId
    });
    
  } catch (error) {
    console.error("Error approving payment:", error);
    throw error;
  }
};

/**
 * Reject payment (admin function)
 */
export const rejectPayment = async (
  paymentId: string, 
  adminEmail: string, 
  rejectionReason: string
): Promise<void> => {
  try {
    const paymentDoc = doc(db, "payments", paymentId);
    await updateDoc(paymentDoc, {
      status: 'Rejected',
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString(),
      rejectionReason
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
};

/**
 * Get payment details by ID
 */
export const fetchPaymentById = async (paymentId: string): Promise<Payment | null> => {
  try {
    const paymentDoc = doc(db, "payments", paymentId);
    const paymentSnap = await getDoc(paymentDoc);
    
    if (paymentSnap.exists()) {
      return {
        id: paymentSnap.id,
        ...paymentSnap.data()
      } as Payment;
    }
    return null;
  } catch (error) {
    console.error("Error fetching payment:", error);
    return null;
  }
};

/**
 * Add admin payment (admin function to add payment on behalf of student)
 */
export const addAdminPayment = async (
  payment: Omit<Payment, 'id' | 'submittedAt' | 'status' | 'approvedBy' | 'approvedAt'>,
  adminEmail: string
): Promise<string> => {
  try {
    const paymentData = {
      ...payment,
      submittedAt: new Date().toISOString(),
      status: 'Approved' as const,
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString()
    };

    const paymentsCollection = collection(db, "payments");
    const docRef = await addDoc(paymentsCollection, paymentData);
    
    // Update room allocation payment status
    await updatePaymentStatus(payment.allocationId, 'Paid');
    
    // Update allocation with payment reference
    const allocationDoc = doc(db, "roomAllocations", payment.allocationId);
    await updateDoc(allocationDoc, {
      paymentId: docRef.id
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding admin payment:", error);
    throw error;
  }
};

/**
 * Get payment for allocation
 */
export const fetchPaymentForAllocation = async (allocationId: string): Promise<Payment | null> => {
  try {
    const paymentsCollection = collection(db, "payments");
    const q = query(
      paymentsCollection, 
      where("allocationId", "==", allocationId),
      where("status", "==", "Approved")
    );
    const paymentsSnap = await getDocs(q);
    
    if (!paymentsSnap.empty) {
      const paymentDoc = paymentsSnap.docs[0];
      return {
        id: paymentDoc.id,
        ...paymentDoc.data()
      } as Payment;
    }
    return null;
  } catch (error) {
    console.error("Error fetching payment for allocation:", error);
    return null;
  }
};

/**
 * Update payment records when allocation changes (for room changes)
 */
export const updatePaymentAllocationReference = async (
  oldAllocationId: string,
  newAllocationId: string
): Promise<void> => {
  try {
    const paymentsCollection = collection(db, "payments");
    const q = query(
      paymentsCollection,
      where("allocationId", "==", oldAllocationId)
    );
    
    const paymentsSnap = await getDocs(q);
    
    // Update all payments that reference the old allocation ID
    const updatePromises = paymentsSnap.docs.map(doc => 
      updateDoc(doc.ref, { allocationId: newAllocationId })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`Updated ${paymentsSnap.docs.length} payment record(s) to reference new allocation ID`);
  } catch (error) {
    console.error("Error updating payment allocation references:", error);
    throw error;
  }
};

/**
 * Fix allocation payment references for a specific student (admin function)
 * Links existing approved payments to current allocations based on matching amount/price
 */
export const fixStudentAllocationPayments = async (studentRegNumber: string): Promise<{
  fixed: number;
  message: string;
}> => {
  try {
    // Get student's payments and allocations
    const [payments, allocations] = await Promise.all([
      fetchStudentPayments(studentRegNumber),
      fetchStudentAllocations(studentRegNumber)
    ]);
    
    // Get unpaid allocations
    const unpaidAllocations = allocations.filter((allocation: RoomAllocation) => allocation.paymentStatus !== 'Paid');
    
    // Get approved payments that might not be linked to current allocations
    const approvedPayments = payments.filter(p => p.status === 'Approved');
    
    let fixedCount = 0;
    const fixedAllocations = [];
    
    // For each unpaid allocation, try to find a matching approved payment
    for (const allocation of unpaidAllocations) {
      // Get room details to know the price
      const roomDetails = await getRoomDetailsFromAllocation(allocation);
      if (!roomDetails) continue;
      
      // Look for an approved payment with matching amount
      const matchingPayment = approvedPayments.find(payment => 
        payment.amount === roomDetails.price && 
        payment.allocationId !== allocation.id
      );
      
      if (matchingPayment) {
        // Update the payment to reference the current allocation
        const paymentDoc = doc(db, "payments", matchingPayment.id);
        await updateDoc(paymentDoc, {
          allocationId: allocation.id
        });
        
        // Update allocation payment status
        await updatePaymentStatus(allocation.id, 'Paid');
        
        // Update allocation with payment reference
        const allocationDoc = doc(db, "roomAllocations", allocation.id);
        await updateDoc(allocationDoc, {
          paymentId: matchingPayment.id
        });
        
        fixedCount++;
        fixedAllocations.push({
          studentRegNumber: studentRegNumber,
          allocationId: allocation.id,
          paymentId: matchingPayment.id,
          amount: matchingPayment.amount
        });
      }
    }
    
    return {
      fixed: fixedCount,
      message: fixedCount > 0 
        ? `Successfully fixed ${fixedCount} allocation payment(s) for student ${studentRegNumber}`
        : `No matching payments found to fix for student ${studentRegNumber}`
    };
  } catch (error) {
    console.error("Error fixing allocation payments:", error);
    throw error;
  }
};

/**
 * Fix allocation payment references for ALL affected students (admin function)
 * This is a bulk operation that fixes payments for all students who have mismatched allocations
 */
export const fixAllAllocationPayments = async (): Promise<{
  studentsProcessed: number;
  totalFixed: number;
  details: Array<{
    studentRegNumber: string;
    fixed: number;
    message: string;
  }>;
}> => {
  try {
    console.log("Starting bulk fix for all affected students...");
    
    // Get all payments and allocations
    const [allPayments, allAllocations] = await Promise.all([
      fetchAllPayments(),
      (async () => {
        const allocationsCollection = collection(db, "roomAllocations");
        const allocationsSnap = await getDocs(allocationsCollection);
        return allocationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RoomAllocation[];
      })()
    ]);
    
    // Find students who have approved payments but unpaid allocations
    const studentMap = new Map<string, {
      payments: Payment[];
      allocations: RoomAllocation[];
    }>();
    
    // Group payments by student
    allPayments.forEach(payment => {
      const student = payment.studentRegNumber;
      if (!studentMap.has(student)) {
        studentMap.set(student, { payments: [], allocations: [] });
      }
      studentMap.get(student)!.payments.push(payment);
    });
    
    // Group allocations by student
    allAllocations.forEach(allocation => {
      const student = allocation.studentRegNumber;
      if (!studentMap.has(student)) {
        studentMap.set(student, { payments: [], allocations: [] });
      }
      studentMap.get(student)!.allocations.push(allocation);
    });
    
    // Find potentially affected students
    const affectedStudents: string[] = [];
    
    studentMap.forEach((data, studentRegNumber) => {
      const hasApprovedPayments = data.payments.some((p: Payment) => p.status === 'Approved');
      const hasUnpaidAllocations = data.allocations.some((a: RoomAllocation) => a.paymentStatus !== 'Paid');
      
      if (hasApprovedPayments && hasUnpaidAllocations) {
        affectedStudents.push(studentRegNumber);
      }
    });
    
    console.log(`Found ${affectedStudents.length} potentially affected students`);
    
    // Process each affected student
    const results = [];
    let totalFixed = 0;
    
    for (const studentRegNumber of affectedStudents) {
      try {
        const result = await fixStudentAllocationPayments(studentRegNumber);
        results.push({
          studentRegNumber,
          fixed: result.fixed,
          message: result.message
        });
        totalFixed += result.fixed;
      } catch (error) {
        console.error(`Failed to fix payments for student ${studentRegNumber}:`, error);
        results.push({
          studentRegNumber,
          fixed: 0,
          message: `Error: Failed to fix payments for student ${studentRegNumber}`
        });
      }
    }
    
    console.log(`Bulk fix completed. Processed ${affectedStudents.length} students, fixed ${totalFixed} allocations`);
    
    return {
      studentsProcessed: affectedStudents.length,
      totalFixed,
      details: results
    };
  } catch (error) {
    console.error("Error in bulk fix operation:", error);
    throw error;
  }
};

/**
 * Auto-update payment allocation when student is assigned to a new room with same price
 */
export const autoUpdatePaymentAllocation = async (
  studentRegNumber: string, 
  newAllocationId: string, 
  newRoomPrice: number
): Promise<{ updated: boolean; message: string }> => {
  try {
    // Get student's payments
    const payments = await fetchStudentPayments(studentRegNumber);
    
    // Find approved payment with matching amount
    const matchingPayment = payments.find(payment => 
      payment.status === 'Approved' && 
      payment.amount === newRoomPrice
    );
    
    if (matchingPayment) {
      // Update the payment to reference the new allocation
      const paymentDoc = doc(db, "payments", matchingPayment.id);
      await updateDoc(paymentDoc, {
        allocationId: newAllocationId
      });
      
      // Update the new allocation with payment reference
      const allocationDoc = doc(db, "roomAllocations", newAllocationId);
      await updateDoc(allocationDoc, {
        paymentId: matchingPayment.id,
        paymentStatus: 'Paid'
      });
      
      console.log(`Auto-updated payment ${matchingPayment.id} for student ${studentRegNumber} to new allocation ${newAllocationId}`);
      
      return {
        updated: true,
        message: `Payment automatically linked to new room allocation`
      };
    }
    
    return {
      updated: false,
      message: 'No matching payment found to auto-update'
    };
  } catch (error) {
    console.error("Error auto-updating payment allocation:", error);
    return {
      updated: false,
      message: 'Failed to auto-update payment allocation'
    };
  }
};
export const deletePayment = async (paymentId: string): Promise<void> => {
  try {
    const paymentDoc = doc(db, "payments", paymentId);
    await deleteDoc(paymentDoc);
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
};
