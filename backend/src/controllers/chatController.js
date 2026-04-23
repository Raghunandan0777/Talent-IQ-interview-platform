import { chatClient, upsertStreamUser } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    const clerkId = req.user.clerkId;
    const callId = req.params.callId;

    if (!callId) {
      return res.status(400).json({ message: "callId is required" });
    }

    // Ensure user exists in Stream before creating token and adding to channel
    await upsertStreamUser({
      id: clerkId,
      name: req.user.name,
      image: req.user.profileImage,
    });

    // Create chat channel (safe even if exists)
    const channel = chatClient.channel("messaging", callId);
    await channel.create();
    await channel.addMembers([clerkId]);

    const token = chatClient.createToken(clerkId);

    res.status(200).json({
      token,
      userId: clerkId,
      userName: req.user.name,
      userImage: req.user.image,
      callId,
    });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: `Token Error: ${error.message}` });
  }
}
