// Migration layer to convert existing save data to new schema
// This is a placeholder for future migration from legacy save data
import { userRepository } from '../database/repositories/UserRepository.js';
export async function migrateLocalSave(legacyData) {
    try {
        // Check if user already exists
        const existingUser = await userRepository.findByUsername(legacyData.username || '');
        if (existingUser) {
            return { success: false, message: 'User already exists' };
        }
        // Create user with local auth
        const username = legacyData.username || `Player_${Date.now()}`;
        const user = await userRepository.create({
            username,
            authProvider: 'local'
        });
        // Create profile with migrated data
        await userRepository.createProfile(user.id);
        await userRepository.updateProfile(user.id, {
            money: legacyData.money || 0,
            stardust: legacyData.stardust || 0,
            seeds: legacyData.seeds || 0,
            rebirths: legacyData.rebirths || 0,
            personalLuck: legacyData.personalLuck || 1
        });
        return { success: true, message: 'Migration successful', userId: user.id };
    }
    catch (error) {
        console.error('Migration error:', error);
        return { success: false, message: error.message || 'Migration failed' };
    }
}
// CLI interface for running migrations
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Migration tool - provide legacy data as JSON via stdin or file');
    console.log('This is a placeholder - implement actual migration based on your legacy data source');
    process.exit(0);
}
