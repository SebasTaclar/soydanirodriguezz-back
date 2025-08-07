import { getPrismaClient } from '../../config/PrismaClient';
import { IUserDataSource } from '../../domain/interfaces/IUserDataSource';
import { User } from '../../domain/entities/User';
import { Prisma } from '@prisma/client';

export class UserPrismaAdapter implements IUserDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<User[]> {
    let whereClause: Prisma.UserWhereInput = {};

    // Handle query filtering
    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.email === 'string' && {
          email: { contains: queryObj.email, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.name === 'string' && {
          name: { contains: queryObj.name, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.role === 'string' && { role: queryObj.role }),
        ...(typeof queryObj.membershipPaid === 'boolean' && {
          membershipPaid: queryObj.membershipPaid,
        }),
      };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        membershipPaid: true,
      },
    });

    return users as User[];
  }

  public async getById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        membershipPaid: true,
      },
    });

    return user as User | null;
  }

  public async getByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        membershipPaid: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      membershipPaid: user.membershipPaid,
    } as User;
  }

  public async create(user: User): Promise<User> {
    const newUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
        membershipPaid: user.membershipPaid,
      },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        membershipPaid: true,
      },
    });

    return newUser as User;
  }

  public async update(id: string, user: Partial<User>): Promise<User | null> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          ...(user.email && { email: user.email }),
          ...(user.password && { password: user.password }),
          ...(user.name && { name: user.name }),
          ...(user.role && { role: user.role }),
          ...(user.membershipPaid !== undefined && { membershipPaid: user.membershipPaid }),
        },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          role: true,
          membershipPaid: true,
        },
      });

      return updatedUser as User | null;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // User not found
        }
      }
      throw error;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id: parseInt(id) },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false; // User not found
        }
      }
      throw error;
    }
  }
}
