const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Running lost_date backfill...');

        // Backfill existing "Not Interested" leads with created_at as lost_date
        // (no updated_at column in leads table)
        const [result] = await pool.query(
            "UPDATE leads SET lost_date = created_at WHERE status = 'Not Interested' AND lost_date IS NULL"
        );
        console.log('Backfilled ' + result.affectedRows + ' existing Not Interested leads with lost_date.');

        // Verify
        const [rows] = await pool.query(
            "SELECT id, status, lost_date, created_at FROM leads WHERE status = 'Not Interested'"
        );
        console.log('Current Not Interested leads:');
        rows.forEach(function (r) {
            console.log('  Lead #' + r.id + ' | lost_date: ' + r.lost_date + ' | created_at: ' + r.created_at);
        });

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
