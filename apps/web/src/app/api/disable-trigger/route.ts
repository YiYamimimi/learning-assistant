import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST() {
  try {
    console.log('开始禁用触发器...');

    const disableTrigger = `
      DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: disableTrigger });

    if (error) {
      console.error('禁用触发器失败:', error);
      return NextResponse.json(
        {
          success: false,
          message: '禁用触发器失败',
          error: error.message,
          sql: disableTrigger,
        },
        { status: 500 }
      );
    }

    console.log('触发器已禁用');
    return NextResponse.json({ success: true, message: '触发器已禁用' });
  } catch (error) {
    console.error('禁用触发器失败:', error);
    return NextResponse.json({ error: '禁用触发器失败', details: error }, { status: 500 });
  }
}
