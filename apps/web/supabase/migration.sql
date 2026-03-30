-- 迁移脚本：为现有的 rate_limits 表添加 usage_count 字段
-- 执行此脚本前请先备份数据库

-- 1. 添加 usage_count 字段（如果不存在）
ALTER TABLE rate_limits 
ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 1;

-- 2. 添加 updated_at 字段（如果不存在）
ALTER TABLE rate_limits 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. 初始化现有记录的 usage_count 为 1
UPDATE rate_limits 
SET usage_count = 1 
WHERE usage_count IS NULL;

-- 4. 创建唯一约束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'rate_limits_key_identifier_key'
    ) THEN
        ALTER TABLE rate_limits 
        ADD CONSTRAINT rate_limits_key_identifier_key 
        UNIQUE (key, identifier);
    END IF;
END $$;

-- 5. 删除旧的重复记录，保留最新的
DELETE FROM rate_limits 
WHERE id NOT IN (
    SELECT MAX(id)
    FROM rate_limits
    GROUP BY key, identifier
);

-- 6. 创建自动更新 updated_at 的触发器（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. 更新注释
COMMENT ON COLUMN rate_limits.usage_count IS '使用次数，默认为1，每次使用后累加';
COMMENT ON COLUMN rate_limits.updated_at IS '记录更新时间';

-- 验证迁移结果
SELECT 
    '迁移完成' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN usage_count > 0 THEN 1 END) as records_with_usage_count
FROM rate_limits
WHERE key = 'guest-analysis';