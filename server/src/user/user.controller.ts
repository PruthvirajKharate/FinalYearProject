import { Controller, Get, Param, Patch, Body, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { USER_ROLES } from './constant';

/**
 * Expresses the User Module functionality via HTTP endpoints.
 */
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    /**
     * GET /users/:address
     * Fetches the full profile, role, and voting power of a specific user.
     */
    @Get(':address')
    async getUserProfile(@Param('address') address: string) {
        return await this.userService.findOrCreateUser(address);
    }

    /**
     * PATCH /users/:address/role
     * Allows an admin to promote a user to a Liquidator or Proposer.
     */
    @Patch(':address/role')
    async changeRole(
        @Param('address') address: string,
        @Body('role') role: USER_ROLES,
    ) {
        return await this.userService.updateUserRole(address, role);
    }
}