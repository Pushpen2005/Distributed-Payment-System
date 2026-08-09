import {prisma} from '../config/db.js';

class UserRepository {
    async findByEmail(email) {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
    if (!user) {
        return null; 
    }
    return user;
    }
    async createUser(userData){
        const user = await prisma.user.create({
            data: userData
        });
        return user;
    }
    async findById(id) {
        const user = await prisma.user.findUnique({
            where: {
                id: id
            }
        });
        if (!user) {
            return null; 
        }
        return user;    
    }
}

export default new UserRepository()