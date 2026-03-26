import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import clientPromise from "@/lib/mongodbAdapter";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();

        // Drop the legacy firebaseUid index if it exists, to avoid E11000 duplicate key error
        try {
          await User.collection.dropIndex('firebaseUid_1');
        } catch (e: any) {
          // Ignore if the index does not exist
          if (e.codeName !== 'IndexNotFound') {
            console.error("Error dropping legacy firebaseUid index:", e);
          }
        }

        // Find existing user or update
        const existingUser = await User.findOne({ email: user.email });

        if (existingUser) {
          // ensure existing user has role
          if (!existingUser.role) {
             existingUser.role = "user";
             await existingUser.save();
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Always refresh role from DB to ensure it picks up manual changes
      await dbConnect();
      const emailToQuery = user?.email || token.email;
      if (emailToQuery) {
        let dbUser = await User.findOne({ email: emailToQuery });
        if (dbUser) {
          if (!dbUser.role) {
             dbUser.role = "user";
             await dbUser.save();
          }
          token.role = dbUser.role;
          token.id = dbUser._id.toString();
        } else if (user) {
          token.role = "user";
          token.id = user.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // Use our custom login page
  },
  secret: process.env.NEXTAUTH_SECRET,
};
