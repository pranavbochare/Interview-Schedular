// Creates in-app notifications. Accepts a prisma client or a transaction client.
export const notify = (db, userId, type, title, message) =>
  db.notification.create({ data: { userId, type, title, message } });
