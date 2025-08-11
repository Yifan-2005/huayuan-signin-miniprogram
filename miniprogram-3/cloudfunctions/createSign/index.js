// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init();                 // 初始化默认环境
const db = cloud.database();  // 拿数据库对象

exports.main = async (event, context) => {
  // 1. 拿到调用者的 openid
  const wxContext = cloud.getWXContext();
  const publisherId = wxContext.OPENID;

  // 2. 从前端拿来的参数
  const {
    title,
    className,
    courseName,
    location    // 格式 { latitude, longitude }
  } = event;

  // 时间戳
  const createTime = new Date();

  try {
    // 3. 插入一条新文档到 signs 集合
    const res = await db.collection('signs').add({
      data: {
        title,
        className,
        courseName,
        location,
        publisherId,    // 关键信息：发布者 openid
        createTime,
        status: 'active'
      }
    });

    return {
      success: true,
      signId: res._id
    };
  } catch (err) {
    return {
      success: false,
      error: err
    };
  }
};
