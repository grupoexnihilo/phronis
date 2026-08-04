import { db } from '../db/db';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const authService = {
  async login(email, password) {
    try {
      // Busca no Neon se existe o usuário com as credenciais fornecidas
      const foundUsers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.password, password)
          )
        );

      if (foundUsers.length === 0) {
        throw new Error('Credenciais institucionais inválidas.');
      }

      const user = foundUsers[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    } catch (error) {
      console.error("Erro na autenticação:", error);
      throw error;
    }
  }
};