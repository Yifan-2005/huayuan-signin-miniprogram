// 云函数：generateReport（聚合查询 + 缓存预热 + 容错优化）
const cloud = require('wx-server-sdk');
const redis = require('redis');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 初始化 Redis 客户端（需配置环境变量）
const client = redis.createClient({
  url: process.env.REDIS_URL, // 从环境变量读取 Redis 地址
  password: process.env.REDIS_PWD
});
client.on("error", (err) => console.log("Redis Error:", err));

exports.main = async (event, context) => {
  const { courseId } = event;
  const cacheKey = `report:${courseId}`;

  try {
    // 检查缓存是否存在
    const cachedReport = await client.get(cacheKey);
    if (cachedReport) return JSON.parse(cachedReport);

    // 聚合查询（统计签到成功率）
    const res = await db.collection('sign_records')
      .aggregate()
      .match({ courseId })
      .group({ 
        _id: '$signId', 
        total: { $sum: 1 }, 
        success: { $sum: '$isSuccess' },
        successRate: { $avg: '$isSuccess' } // 新增成功率字段
      })
      .end();

    // 缓存结果（预热1小时，添加空值防穿透）
    await client.setex(cacheKey, 3600, JSON.stringify(res || 'NULL'));
    
    return res;
  } catch (err) {
    console.error("云函数执行失败:", err);
    return { code: 500, msg: "服务内部错误" };
  }
};