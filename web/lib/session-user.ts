import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return null;
  return { session, userId };
}

export async function requireChildProfile() {
  const ctx = await requireUser();
  if (!ctx?.session) return null;
  let profileId = ctx.session.user?.activeProfileId as string | null | undefined;
  if (!profileId) {
    const profile = await prisma.childProfile.findFirst({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "asc" },
    });
    profileId = profile?.id ?? null;
  }
  if (!profileId) return null;
  const profile = await prisma.childProfile.findFirst({
    where: { id: profileId, userId: ctx.userId },
  });
  if (!profile) return null;
  return { ...ctx, profile };
}
