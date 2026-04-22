import { requireAuth, clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      if (!user) {
        // Fallback for missed webhook: fetch user from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        // Check if user exists by email (migration from Better Auth)
        user = await User.findOne({ email });

        if (user) {
          // Link existing user to Clerk ID
          user.clerkId = clerkId;
          await user.save();
        } else {
          // Create new user
          const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";
          const profileImage = clerkUser.imageUrl;

          user = await User.create({
            clerkId,
            email,
            name,
            profileImage,
          });
        }

        await upsertStreamUser({
          id: clerkId,
          name: user.name,
          image: user.profileImage,
        });
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
