import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

async function resolveDisplayName(prisma: Db, profileId: string, role: string): Promise<string> {
  if (role === "ENSEIGNANT") {
    const teacher = await prisma.teacher.findUnique({ where: { profileId } });
    if (teacher) return teacher.nom;
  }
  const labels: Record<string, string> = {
    DIRECTION: "Direction",
    CENSEUR: "Censeur",
    SECRETAIRE: "Secrétariat",
    ENSEIGNANT: "Enseignant",
    PARENT: "Parent",
    ELEVE: "Élève",
  };
  return labels[role] ?? role;
}

export class MessagingService {
  constructor(private prisma: Db) {}

  async listStaffProfiles(excludeProfileId: string, ecoleId: string) {
    const profiles = await this.prisma.profile.findMany({
      where: { id: { not: excludeProfileId }, ecoleId, role: { in: ["DIRECTION", "CENSEUR", "SECRETAIRE", "ENSEIGNANT"] } },
      include: { teacher: true },
    });
    return Promise.all(
      profiles.map(async (p) => ({ profileId: p.id, role: p.role, nom: p.teacher?.nom ?? (await resolveDisplayName(this.prisma, p.id, p.role)) })),
    );
  }

  async listConversations(profileId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { profileId } } },
      include: {
        participants: { include: { profile: { include: { teacher: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { readReceipts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      conversations.map(async (c) => {
        const other = c.participants.find((p) => p.profileId !== profileId)?.profile;
        const lastMessage = c.messages[0];
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            senderProfileId: { not: profileId },
            readReceipts: { none: { profileId } },
          },
        });
        return {
          id: c.id,
          nom: other ? other.teacher?.nom ?? (await resolveDisplayName(this.prisma, other.id, other.role)) : (c.nom ?? "Conversation"),
          dernierMessage: lastMessage?.corps ?? null,
          heure: lastMessage?.createdAt ?? c.createdAt,
          nonLus: unreadCount,
        };
      }),
    );
  }

  async getMessages(conversationId: string, profileId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_profileId: { conversationId, profileId } },
    });
    if (!participant) throw new ApiError(403, "NOT_A_PARTICIPANT", "Vous ne participez pas à cette conversation.");

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    const unread = messages.filter((m) => m.senderProfileId !== profileId);
    if (unread.length > 0) {
      await this.prisma.messageReadReceipt.createMany({
        data: unread.map((m) => ({ messageId: m.id, profileId })),
        skipDuplicates: true,
      });
    }

    return messages.map((m) => ({
      id: m.id,
      corps: m.corps,
      createdAt: m.createdAt,
      expediteurEstMoi: m.senderProfileId === profileId,
    }));
  }

  async createConversation(senderProfileId: string, recipientProfileId: string, firstMessage: string, ecoleId: string) {
    // 404 si le destinataire n'existe pas dans l'école de l'appelant (ne révèle pas son existence ailleurs).
    await this.prisma.profile.findFirstOrThrow({ where: { id: recipientProfileId, ecoleId } });

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { participants: { some: { profileId: senderProfileId } } },
          { participants: { some: { profileId: recipientProfileId } } },
        ],
      },
    });

    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          type: "DIRECT",
          participants: { create: [{ profileId: senderProfileId }, { profileId: recipientProfileId }] },
        },
      }));

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderProfileId, corps: firstMessage },
    });

    return { conversationId: conversation.id, messageId: message.id };
  }

  async sendMessage(conversationId: string, senderProfileId: string, corps: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_profileId: { conversationId, profileId: senderProfileId } },
    });
    if (!participant) throw new ApiError(403, "NOT_A_PARTICIPANT", "Vous ne participez pas à cette conversation.");

    return this.prisma.message.create({ data: { conversationId, senderProfileId, corps } });
  }
}
