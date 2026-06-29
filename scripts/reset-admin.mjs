import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const hash = await bcrypt.hash('newpassword123', 12);

const { error } = await supabase
  .from('AdminUser')
  .update({ password: hash })
  .eq('email', 'joshboepple@anchortech.org');

if (error) console.error(error);
else console.log('Password updated successfully');