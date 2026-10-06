// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_initial.sql';
import m0001 from './0001_lazy_the_order.sql';
import m0002 from './0002_solid_reaper.sql';
import m0003 from './0003_colorful_gorilla_man.sql';
import m0004 from './0004_daily_mandroid.sql';
import m0005 from './0005_flippant_sumo.sql';
import m0006 from './0006_streak_data.sql';
import m0007 from './0007_reminder_overhaul.sql';
import m0008 from './0008_db_audit_cleanup.sql';
import m0009 from './0009_calendar_occasions.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008,
m0009
    }
  }
  