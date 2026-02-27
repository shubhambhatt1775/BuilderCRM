ALTER TABLE leads ADD COLUMN not_interested_reason TEXT AFTER status;
ALTER TABLE leads ADD COLUMN not_interested_main_reason VARCHAR(255) AFTER status;
