import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量：');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  console.error('\n请在 .env.local 文件中配置这些变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 测试 Supabase 连接...\n');

  try {
    console.log('1. 测试数据库连接...');
    const { error } = await supabase.from('rate_limits').select('id').limit(1);

    if (error) {
      console.error('❌ 数据库连接失败:', error.message);
      process.exit(1);
    }

    console.log('✓ 数据库连接成功');

    console.log('\n2. 测试插入测试记录...');
    const testRecord = {
      key: 'test-connection',
      identifier: 'test-user-' + Date.now(),
      usage_count: 1,
      timestamp: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('rate_limits').insert(testRecord);

    if (insertError) {
      console.error('❌ 插入记录失败:', insertError.message);
      process.exit(1);
    }

    console.log('✓ 插入记录成功');

    console.log('\n3. 测试更新使用次数...');
    const { data: records, error: queryError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', 'test-connection')
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('❌ 查询记录失败:', queryError.message);
      process.exit(1);
    }

    if (records && records.length > 0) {
      const record = records[0];
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          usage_count: record.usage_count + 1,
          timestamp: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) {
        console.error('❌ 更新使用次数失败:', updateError.message);
        process.exit(1);
      }

      console.log('✓ 更新使用次数成功');
      console.log('   使用次数:', record.usage_count, '→', record.usage_count + 1);
    }

    console.log('\n4. 测试查询记录...');
    const { data: finalRecords, error: finalQueryError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', 'test-connection')
      .order('created_at', { ascending: false })
      .limit(1);

    if (finalQueryError) {
      console.error('❌ 查询记录失败:', finalQueryError.message);
      process.exit(1);
    }

    console.log('✓ 查询记录成功');
    console.log('   最新记录:', finalRecords?.[0]);

    console.log('\n5. 清理测试记录...');
    const { error: deleteError } = await supabase
      .from('rate_limits')
      .delete()
      .eq('key', 'test-connection');

    if (deleteError) {
      console.warn('⚠️  清理测试记录失败:', deleteError.message);
    } else {
      console.log('✓ 清理测试记录成功');
    }

    console.log('\n✅ 所有测试通过！Supabase 配置正确');
    console.log('\n环境变量：');
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    console.log(
      '   NEXT_PUBLIC_SUPABASE_ANON_KEY:',
      supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined'
    );
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

testConnection();
