// 云函数：submitSign（使用云数据库事务+Redis分布式锁）
const cloud = require('wx-server-sdk');
const redis = require('redis');
cloud.init({ 
  env: 'cloud1-9g3s515pd39b9c23' // 根据截图配置指定环境ID
});

const db = cloud.database();

// Redis连接配置（根据安全组配置填写）
const redisClient = redis.createClient({
  host: '10.0.0.15',
  port: 6379,
  password: 'hyqian6666', // 使用截图中配置的密码
  tls: {} // 如需TLS加密
});

// 启用Redis的Promise支持（关键修改）
redisClient.connect().then(() => console.log('Redis connected'));

exports.main = async (event, context) => {
  const { signId, openid, latitude, longitude } = event;
  
  // 参数校验
  if (![signId, openid, latitude, longitude].every(Boolean)) {
    throw new Error('缺少必要参数');
  }

  const lockKey = `sign:${signId}:${openid}:lock`;
  
  // 获取Redis锁（原生Promise实现）
  const maxRetries = 3;
  let lockAcquired = false;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 使用原生set命令（NX+EX参数）
      const result = await redisClient.set(lockKey, '1', {
        NX: true,  // 仅当键不存在时设置
        EX: 10     // 过期时间10秒
      });
      if (result === 'OK') {  // 成功获取锁
        lockAcquired = true;
        break;
      }
      if (attempt === maxRetries) throw new Error('操作过于频繁，请稍后重试');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('获取锁失败:', err);
      throw err;
    }
  }

  try {
    // 从数据库获取签到任务
    const task = await db.collection('sign_tasks').doc(signId).get();
    const { latitude: targetLat, longitude: targetLng } = task.data;
    
    // 精度校验（优化坐标处理）
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(targetLat),
      parseFloat(targetLng)
    );
    
    console.log(`距离校验结果：${distance}m`);
    if (distance > 50) throw new Error('超出签到范围（允许±50米）');

    // 使用事务写入记录
    await db.runTransaction(async transaction => {
      await transaction.collection('sign_records').add({
        data: {
          signId,
          openid,
          timestamp: db.serverDate(),
          isSuccess: 1,
          geoHash: generateGeoHash(latitude, longitude)
        }
      });
    });

    return { success: true };
  } catch (err) {
    console.error('签到失败:', err);
    throw new Error(err.message);
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey); // 释放锁
    }
    await redisClient.quit(); // 关闭连接
  }
};


// 优化后的Haversine公式计算（精度提升）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
  
    const a = Math.sin(Δφ/2) ** 2 + 
              Math.cos(φ1) * Math.cos(φ2) * 
              Math.sin(Δλ/2) ** 2;
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  
  // 新增地理哈希生成函数（用于空间索引）
  function generateGeoHash(lat, lng, precision = 10) {
    // 实现地理哈希算法或调用现有库
    return geohash.encode(lat, lng, precision);
  }