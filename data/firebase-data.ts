import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

// Define the type for the application
export type Applications = {
  name: string;
  regNumber: string;
  gender: "Male" | "Female";
  programme: string;
  part: number;
  email: string;
  phone: string;
  status: "Pending" | "Accepted" | "Archived" | "Rejected";
  submittedAt: string;
  date: string; // New field for date
  time: string; // New field for time
  paymentStatus: string;
  reference: string;
};

/**
 * Fetches all student profiles and their application data
 * Refactored to use the new MongoDB-backed API route.
 */
export const fetchAllApplications = async (): Promise<Applications[]> => {
  try {
    const res = await fetch("/api/applications", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch applications: ${res.statusText}`);
    }

    const applicationsList: Applications[] = await res.json();
    return applicationsList;
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

/**
 * Updates the status of a specific application
 * Refactored to use the new MongoDB-backed API route.
 * @param regNumber - The registration number of the application
 * @param status - The new status ("Pending", "Accepted", or "Archived", "Rejected")
 */
export const updateApplicationStatus = async (
  regNumber: string,
  status: "Pending" | "Accepted" | "Archived" | "Rejected"
) => {
  try {
    const res = await fetch(`/api/applications/${regNumber}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update application status: ${res.statusText}`);
    }

    console.log(`Application ${regNumber} status updated to ${status}`);
  } catch (error) {
    console.error("Error updating application status:", error);
  }
};

/**
 * Fetch all students from Firebase students collection (not new-students)
 */
export const fetchAllStudentsFromStudentsCollection = async (): Promise<any[]> => {
  try {
    const studentsCollection = collection(db, "students");
    const studentsSnap = await getDocs(studentsCollection);
    const students = studentsSnap.docs.map(doc => ({
      regNumber: doc.id,
      ...doc.data()
    }));
    return students;
  } catch (error) {
    console.error("Error fetching students from students collection:", error);
    throw new Error("Failed to fetch students from students collection. Please ensure the students collection is populated.");
  }
};
