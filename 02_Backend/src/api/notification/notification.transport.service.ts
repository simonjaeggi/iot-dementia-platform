import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/db";
import {
  userEventSubscriptions,
  userNotificationTransport,
  userNotifications,
  users,
} from "../../db/schema";
import { emailService } from "../../email/email.service";
import { renderGenericEmailTemplate } from "../../email/templates/generic.template";
import { validatedEnv } from "../../env-validation";

export async function sendEmailNotifications(): Promise<number> {
  const transports = await db
    .select({
      transportId: userNotificationTransport.id,
      userId: userNotifications.userId,
      email: users.email,
      detailLevel: userEventSubscriptions.detailLevel,
      title: userNotifications.title,
      message: userNotifications.message,
    })
    .from(userNotificationTransport)
    .innerJoin(
      userNotifications,
      eq(userNotificationTransport.userNotificationId, userNotifications.id),
    )
    .innerJoin(
      userEventSubscriptions,
      eq(
        userNotificationTransport.userEventSubscriptionId,
        userEventSubscriptions.id,
      ),
    )
    .innerJoin(users, eq(userNotifications.userId, users.id))
    .where(
      and(
        isNull(userNotificationTransport.sentAt),
        eq(userEventSubscriptions.deliveryMethod, "email"),
      ),
    );

  for (const transport of transports) {
    const content = generateMessageContent(
      transport.detailLevel,
      transport.title,
      transport.message,
    );
    const html = renderGenericEmailTemplate({
      title: content.title,
      message: content.message,
      source: validatedEnv.EXTERNAL_HOST,
    });
    const text = `${content.title}\n${content.message}\n\nSource: ${validatedEnv.EXTERNAL_HOST}`;

    await emailService.send({
      to: transport.email,
      subject: content.title,
      text,
      html,
    });

    await db
      .update(userNotificationTransport)
      .set({ sentAt: new Date() })
      .where(eq(userNotificationTransport.id, transport.transportId));
  }

  return transports.length;
}

function generateMessageContent(
  detailLevel: string,
  title: string,
  message: string,
): { title: string; message: string } {
  switch (detailLevel) {
    case "title":
      return {
        title: title,
        message: `You have a new alert, visit https://${validatedEnv.EXTERNAL_HOST} for further information.`,
      };
    case "full":
      return {
        title: title,
        message: message,
      };
    default:
      return {
        title: "New Alert",
        message: `You have a new alert, visit https://${validatedEnv.EXTERNAL_HOST} for further information.`,
      };
  }
}
