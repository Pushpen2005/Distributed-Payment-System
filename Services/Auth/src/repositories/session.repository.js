import prisma from "../config/db.js";

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

    async findByRefreshTokenHash(refreshTokenHash) {
        return prisma.session.findUnique({
            where: {
                refreshTokenHash,
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

    async deleteSession(id) {
        return prisma.session.delete({
            where: {
                id,
            },
        });
    }
}

export default new SessionRepository();