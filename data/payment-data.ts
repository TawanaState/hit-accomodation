import { Payment, RoomAllocation } from "@/types/hostel";

/**
 * Helper to get the base URL for API calls.
 */
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
};

/**
 * Submit a new payment by student
 */
export const submitPayment = async (payment: Omit<Payment, 'id' | 'submittedAt' | 'status'>): Promise<string> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    
    if (!res.ok) {
      throw new Error('Failed to submit payment');
    }
    const data = await res.json();
    return data.id;
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
    const res = await fetch(`${getBaseUrl()}/api/payments/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error('Failed to update payment');
    }
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

/**
 * Fetch payments for a specific student
 */
export const fetchStudentPayments = async (studentRegNumber: string): Promise<Payment[]> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/payments/student/${studentRegNumber}`);
    if (!res.ok) {
      throw new Error('Failed to fetch student payments');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments`);
    if (!res.ok) {
      throw new Error('Failed to fetch all payments');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/pending`);
    if (!res.ok) {
      throw new Error('Failed to fetch pending payments');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail }),
    });
    if (!res.ok) {
      throw new Error('Failed to approve payment');
    }
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
    const res = await fetch(`${getBaseUrl()}/api/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail, rejectionReason }),
    });
    if (!res.ok) {
      throw new Error('Failed to reject payment');
    }
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
    const res = await fetch(`${getBaseUrl()}/api/payments/${paymentId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch payment');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment, adminEmail }),
    });
    if (!res.ok) {
      throw new Error('Failed to add admin payment');
    }
    const data = await res.json();
    return data.id;
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
    const res = await fetch(`${getBaseUrl()}/api/payments/allocation/${allocationId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch payment for allocation');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/allocation/${oldAllocationId}/reference`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAllocationId }),
    });
    if (!res.ok) {
      throw new Error('Failed to update payment allocation reference');
    }
  } catch (error) {
    console.error("Error updating payment allocation references:", error);
    throw error;
  }
};

/**
 * Fix allocation payment references for a specific student (admin function)
 */
export const fixStudentAllocationPayments = async (studentRegNumber: string): Promise<{
  fixed: number;
  message: string;
}> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/payments/fix-allocations/${studentRegNumber}`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to fix student allocation payments');
    }
    return await res.json();
  } catch (error) {
    console.error("Error fixing allocation payments:", error);
    throw error;
  }
};

/**
 * Fix allocation payment references for ALL affected students (admin function)
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
    const res = await fetch(`${getBaseUrl()}/api/payments/fix-allocations`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to fix all allocation payments');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/auto-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentRegNumber, newAllocationId, newRoomPrice }),
    });
    if (!res.ok) {
      throw new Error('Failed to auto update payment allocation');
    }
    return await res.json();
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
    const res = await fetch(`${getBaseUrl()}/api/payments/${paymentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete payment');
    }
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
};
