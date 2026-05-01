import 'dotenv/config';
import { db } from './db';
import { watchEvents, logger } from './watcher';
import { runBackfill } from './backfill';
import { startSubmitterPoll } from './submitter';

async function main() {
    logger.info('Starting Attestor service (Phase 3)');
    
    const args = process.argv.slice(2);
    const backfillIndex = args.indexOf('--backfill');
    if (backfillIndex !== -1 && args[backfillIndex + 1]) {
        const blocks = parseInt(args[backfillIndex + 1], 10);
        if (!isNaN(blocks)) {
            await runBackfill(blocks);
        }
    }
    
    startSubmitterPoll();
    await watchEvents();
}

main().catch(err => {
    logger.error(err, 'Fatal error');
    process.exit(1);
});

process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    db.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    db.close();
    process.exit(0);
});
