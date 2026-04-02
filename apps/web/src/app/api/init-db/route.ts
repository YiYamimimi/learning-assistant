import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST() {
  try {
    console.log('开始初始化数据库函数...');

    const incrementFunction = `
      CREATE OR REPLACE FUNCTION increment_usage_count(
        p_key TEXT,
        p_identifier TEXT
      )
      RETURNS INTEGER AS $$
      DECLARE
        v_new_count INTEGER;
      BEGIN
        UPDATE rate_limits
        SET 
          usage_count = usage_count + 1,
          timestamp = NOW()
        WHERE key = p_key AND identifier = p_identifier
        RETURNING usage_count INTO v_new_count;

        IF NOT FOUND THEN
          INSERT INTO rate_limits (key, identifier, usage_count, timestamp)
          VALUES (p_key, p_identifier, 1, NOW())
          RETURNING usage_count INTO v_new_count;
        END IF;

        RETURN v_new_count;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const incrementAiFunction = `
      CREATE OR REPLACE FUNCTION increment_use_ai(
        p_key TEXT,
        p_identifier TEXT
      )
      RETURNS INTEGER AS $$
      DECLARE
        v_new_count INTEGER;
      BEGIN
        UPDATE rate_limits
        SET 
          use_ai = COALESCE(use_ai, 0) + 1,
          timestamp = NOW()
        WHERE key = p_key AND identifier = p_identifier
        RETURNING use_ai INTO v_new_count;

        IF NOT FOUND THEN
          INSERT INTO rate_limits (key, identifier, usage_count, use_ai, timestamp)
          VALUES (p_key, p_identifier, 0, 1, NOW())
          RETURNING use_ai INTO v_new_count;
        END IF;

        RETURN v_new_count;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: incrementError } = await supabase.rpc('exec_sql', { sql: incrementFunction });

    if (incrementError) {
      console.error('创建 increment_usage_count 函数失败:', incrementError);

      try {
        const { error: testError } = await supabase.from('rate_limits').select('*').limit(1);

        if (testError) {
          console.error('数据库连接测试失败:', testError);
          return NextResponse.json(
            { error: '数据库连接失败', details: testError },
            { status: 500 }
          );
        }

        console.log('数据库连接正常，但函数创建失败。请手动在 Supabase Dashboard 中执行 SQL');
        return NextResponse.json(
          {
            success: false,
            message: '请手动在 Supabase Dashboard 中执行 SQL',
            sql: incrementFunction + '\n\n' + incrementAiFunction,
          },
          { status: 200 }
        );
      } catch (dbError) {
        console.error('数据库测试异常:', dbError);
        return NextResponse.json({ error: '数据库测试失败' }, { status: 500 });
      }
    }

    const { error: aiIncrementError } = await supabase.rpc('exec_sql', { sql: incrementAiFunction });

    if (aiIncrementError) {
      console.error('创建 increment_use_ai 函数失败:', aiIncrementError);
      return NextResponse.json(
        {
          success: false,
          message: 'increment_usage_count 创建成功，但 increment_use_ai 创建失败，请手动执行',
          sql: incrementAiFunction,
        },
        { status: 200 }
      );
    }

    console.log('数据库函数初始化完成');
    return NextResponse.json({ success: true, message: '数据库函数初始化完成' });
  } catch (error) {
    console.error('初始化数据库函数失败:', error);
    return NextResponse.json({ error: '初始化失败', details: error }, { status: 500 });
  }
}
