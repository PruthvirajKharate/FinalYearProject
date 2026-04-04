import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { USER_ROLES } from './constant';

/**
 * Handles identity management, role assignments, and 
 * global user statistics across the protocol.
 */
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * Retrieves a user by their blockchain address or creates a new 
     * entry if it's their first interaction.
     * @param publicAddress - The 0x address of the user.
     */
    async findOrCreateUser(publicAddress: string): Promise<User> {
        let user = await this.userRepository.findOne({ where: { publicAddress } });

        if (!user) {
            user = this.userRepository.create({
                publicAddress,
                role: USER_ROLES.USER,
                votingPower: '0',
            });
            return await this.userRepository.save(user);
        }

        return user;
    }

    /**
     * Updates a user's role. Restricted to Admin usage in the controller.
     * @param publicAddress - The target user address.
     * @param newRole - The UserRole enum value to assign.
     */
    async updateUserRole(publicAddress: string, newRole: USER_ROLES): Promise<User> {
        const user = await this.findOrCreateUser(publicAddress);
        user.role = newRole;
        return await this.userRepository.save(user);
    }

    /**
     * Synchronizes a user's voting power based on their protocol activity.
     * Typically called by the BlockchainWatcher after a Deposit event.
     */
    async updateVotingPower(publicAddress: string, newPower: string): Promise<void> {
        await this.userRepository.update(
            { publicAddress },
            { votingPower: newPower }
        );
    }
}