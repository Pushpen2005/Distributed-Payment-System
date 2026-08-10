import {prisma} from "../config/db.js";

class SessionRepository {

    async createSession(sessionData) {
        return prisma.session.create({
            data: sessionData,
        });
    }

    async findById(id) {
        return prisma.session.findUnique({
            where: {
                id,
            },
        });
    }

    async revokeSession(id) {
        return prisma.session.update({
            where: {
                id,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    async updateSession(id, updateData) {
        return prisma.session.update({
            where: {
                id,
            },
            data: updateData,
        });
    }
}

export default new SessionRepository();