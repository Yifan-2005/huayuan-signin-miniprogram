// 云函数：generateCode
const cloud = require('wx-server-sdk');
const redis = require('redis');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// Redis配置（根据你的图片信息修改）
const client = redis.createClient({
  host: '10.0.0.15', // 内网IPv4地址
  port: 6379,         // 端口号
  password: 'hyqian6666' // 密码
});

// 连接Redis客户端
client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.error('Redis client connection error:', err);
});

exports.main = async (event, context) => {
  try {
    // 生成4位随机数字验证码
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const signId = event.signId; // 关联的签到任务ID

    // 存储到Redis，设置5分钟过期
    await new Promise((resolve, reject) => {
      client.setex(`sign:${signId}:code`, 300, code, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });

    // 返回结果
    return { 
      code, 
      signId, 
      expiresAt: Date.now() + 300000,
      msg: "验证码生成并存储成功，请检查Redis控制台确认数据是否写入成功"
    };
  } catch (err) {
    // 捕获错误并返回
    console.error(err);
    return {
      errMsg: "generateCode:fail",
      errDetail: err.message
    };
  }
};